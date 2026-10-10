-- UC-20: direct messages (FR-DM-1 to FR-DM-6, ADR-0006, TR-SEC-13).
--
-- Two people per conversation. The first message arrives as a request; until
-- the other person accepts it, the sender can't send another. Declining or
-- blocking stops the sender for good, and the sender is told only that they
-- can write again once the request is accepted, so a refusal looks the same
-- as a request still waiting. Only the two people read a conversation; the
-- site admin reads one only after a message in it is reported. Plain pages:
-- no live updates, typing indicators, read receipts or online status.
--
-- Every send goes through send_message(), which takes the same per-person
-- lock as the other limits (before_insert_limit_guard) and uses the server's
-- clock, so the daily request limit and the message rate can't be raced.

create type public.conversation_status as enum ('requested', 'accepted', 'declined');

-- 'message' reports go to the site admin only: messages belong to no group.
-- Used only inside plpgsql bodies below, so it is safe in this transaction.
alter type public.report_target add value if not exists 'message';

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- The person who sent the request, and the person who answers it.
  starter_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status public.conversation_status not null default 'requested',
  -- Set when a message in it is reported: from then on the site admin can
  -- read it (FR-DM-5, FR-DM-6).
  reported_at timestamptz,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint conversations_two_people check (starter_id <> recipient_id)
);

-- One conversation per pair, whoever started it.
create unique index conversations_pair_idx
  on public.conversations (least(starter_id, recipient_id), greatest(starter_id, recipient_id));
create index conversations_starter_idx on public.conversations (starter_id, created_at);
create index conversations_recipient_idx on public.conversations (recipient_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  -- FR-DM-6: plain text, at most 2,000 characters.
  body text not null check (char_length(btrim(body)) >= 1 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_sender_idx on public.messages (sender_id, created_at);

-- FR-DM-2: who someone has blocked. Only the blocker can see their own list;
-- the blocked person is never told.
create table public.message_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint message_blocks_not_self check (blocker_id <> blocked_id)
);

create index message_blocks_blocked_idx on public.message_blocks (blocked_id);

-- FR-DM-4: when each person last opened a conversation, for their own unread
-- count. Its own table, readable only by its owner, so it can never become a
-- read receipt for the other person.
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Permissions. RLS denies by default; anonymous visitors get nothing.
-- ---------------------------------------------------------------------------

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_blocks enable row level security;
alter table public.conversation_reads enable row level security;

revoke all on public.conversations, public.messages, public.message_blocks, public.conversation_reads from anon;
-- Conversations and messages are written only through the functions below.
revoke insert, update, delete on public.conversations, public.messages from authenticated;
revoke update on public.message_blocks from authenticated;
grant select, insert, delete on public.message_blocks to authenticated;
revoke delete on public.conversation_reads from authenticated;
grant select, insert, update on public.conversation_reads to authenticated;

-- FR-DM-6, TR-SEC-13: the two people, and the site admin once reported.
create policy "Conversations reach only their two people" on public.conversations
  for select to authenticated
  using (
    (select auth.uid()) in (starter_id, recipient_id)
    or (reported_at is not null and (select public.is_site_admin()))
  );

-- A message is readable exactly when its conversation is.
create policy "Messages follow their conversation" on public.messages
  for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id));

create policy "People see their own blocks" on public.message_blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

-- Blocking is protection, so a suspended account can still block.
create policy "People block for themselves" on public.message_blocks
  for insert to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "People unblock for themselves" on public.message_blocks
  for delete to authenticated
  using (blocker_id = (select auth.uid()));

create policy "People see their own read times" on public.conversation_reads
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People mark their own conversations read" on public.conversation_reads
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.conversations c
                where c.id = conversation_id and (select auth.uid()) in (c.starter_id, c.recipient_id))
  );

create policy "People update their own read times" on public.conversation_reads
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- FR-DM-1, FR-DM-2, FR-DM-6: sending.
-- ---------------------------------------------------------------------------

create or replace function public.send_message(p_to uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_conv public.conversations%rowtype;
  v_body text := btrim(coalesce(p_body, ''));
begin
  perform public.require_writer();  -- signed in, not suspended or deleted

  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    perform public.raise_rule('invalid', 'A message is 1 to 2,000 characters.');
  end if;
  if p_to is null or p_to = v_me then
    perform public.raise_rule('invalid', 'Choose someone else to message.');
  end if;
  if not exists (
    select 1 from public.accounts a join public.profiles p on p.id = a.id
    where a.id = p_to and a.deleted_at is null and char_length(btrim(coalesce(p.display_name, ''))) >= 2
  ) then
    perform public.raise_rule('not_found', 'That member could not be found.');
  end if;

  -- Same per-person lock as before_insert_limit_guard: a second send from the
  -- same person waits here and then counts the first.
  perform pg_advisory_xact_lock(hashtextextended('limits:' || v_me::text, 0));

  if exists (select 1 from public.message_blocks b where b.blocker_id = v_me and b.blocked_id = p_to) then
    perform public.raise_rule('dm_you_blocked', 'You have blocked this member.');
  end if;

  if (select count(*) from public.messages m
      where m.sender_id = v_me and m.created_at > now() - interval '10 minutes') >= 20 then
    perform public.raise_rule('rate_limited', 'You are sending messages too quickly. Try again in a few minutes.');
  end if;

  select * into v_conv from public.conversations c
   where least(c.starter_id, c.recipient_id) = least(v_me, p_to)
     and greatest(c.starter_id, c.recipient_id) = greatest(v_me, p_to)
   for update;

  -- Blocked by them: the same neutral answer as a request still waiting.
  if exists (select 1 from public.message_blocks b where b.blocker_id = p_to and b.blocked_id = v_me) then
    perform public.raise_rule('dm_waiting', 'You can send another message once they accept your request.');
  end if;

  if v_conv.id is null then
    if (select count(*) from public.conversations c
        where c.starter_id = v_me and c.created_at > now() - interval '1 day') >= 10 then
      perform public.raise_rule('rate_limited', 'You can send at most 10 message requests a day.');
    end if;
    insert into public.conversations (starter_id, recipient_id, status, last_message_at, created_at)
    values (v_me, p_to, 'requested', now(), now())
    returning * into v_conv;
  elsif v_conv.status <> 'accepted' then
    if v_conv.starter_id = v_me then
      -- FR-DM-1: waiting, or declined. The sender can't tell which.
      perform public.raise_rule('dm_waiting', 'You can send another message once they accept your request.');
    else
      perform public.raise_rule('dm_accept_first', 'Accept the request before replying.');
    end if;
  else
    update public.conversations set last_message_at = now() where id = v_conv.id;
  end if;

  insert into public.messages (conversation_id, sender_id, body, created_at)
  values (v_conv.id, v_me, v_body, now());

  -- Your own message is never unread for you.
  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (v_conv.id, v_me, now())
  on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;

  return v_conv.id;
end
$$;

revoke execute on function public.send_message(uuid, text) from public, anon;
grant execute on function public.send_message(uuid, text) to authenticated;

-- FR-DM-2: the recipient accepts or declines. A declined request can still be
-- accepted later by the recipient (say they change their mind).
create or replace function public.answer_message_request(p_conversation_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_conv public.conversations%rowtype;
begin
  if auth.uid() is null then
    perform public.raise_rule('not_signed_in', 'Sign in first.');
  end if;
  -- Accepting opens a conversation, so it needs an account that can write;
  -- declining is protection, so a suspended account can still decline.
  if p_accept and not public.can_write() then
    perform public.raise_rule('not_allowed', 'Your account cannot make changes right now.');
  end if;

  select * into v_conv from public.conversations c where c.id = p_conversation_id for update;
  if v_conv.id is null or v_conv.recipient_id <> auth.uid() then
    perform public.raise_rule('not_found', 'No such request.');
  end if;
  if v_conv.status = 'accepted' then
    perform public.raise_rule('invalid', 'This conversation is already open.');
  end if;
  if not p_accept and v_conv.status = 'declined' then
    return;
  end if;

  update public.conversations
     set status = case when p_accept then 'accepted'::public.conversation_status else 'declined' end
   where id = v_conv.id;
end
$$;

revoke execute on function public.answer_message_request(uuid, boolean) from public, anon;
grant execute on function public.answer_message_request(uuid, boolean) to authenticated;

-- FR-DM-4: how many conversations have messages this person hasn't read.
-- SECURITY INVOKER: RLS limits it to their own conversations and reads.
create or replace function public.unread_conversation_count()
returns integer
language sql stable set search_path = ''
as $$
  select count(*)::integer
  from public.conversations c
  left join public.conversation_reads r on r.conversation_id = c.id and r.user_id = auth.uid()
  where auth.uid() in (c.starter_id, c.recipient_id)
    and (c.status = 'accepted' or (c.status = 'requested' and c.recipient_id = auth.uid()))
    and c.last_message_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
    and not exists (
      select 1 from public.message_blocks b
      where b.blocker_id = auth.uid() and b.blocked_id in (c.starter_id, c.recipient_id)
    )
$$;

revoke execute on function public.unread_conversation_count() from public, anon;
grant execute on function public.unread_conversation_count() to authenticated;

-- ---------------------------------------------------------------------------
-- FR-DM-5: reports about a message go to the site admin only, and only a
-- person in the conversation can report one. Otherwise as 20261010000011
-- (photos included). Reporting opens the
-- conversation to the site admin (reported_at).
-- ---------------------------------------------------------------------------

create or replace function public.reports_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_group uuid;
  v_found boolean;
  v_conv uuid;
begin
  if (select count(*) from public.reports r
      where r.reporter_id = auth.uid() and r.created_at > now() - interval '1 day') >= 10 then
    perform public.raise_rule('rate_limited', 'You can send at most 10 reports a day.');
  end if;

  case new.target_type
    when 'event' then
      select e.group_id, true into v_group, v_found from public.events e where e.id = new.target_id;
    when 'thread' then
      select t.group_id, true into v_group, v_found from public.threads t where t.id = new.target_id;
    when 'reply' then
      select t.group_id, true into v_group, v_found
        from public.replies r join public.threads t on t.id = r.thread_id where r.id = new.target_id;
    when 'group' then
      select null::uuid, true into v_group, v_found from public.groups g where g.id = new.target_id;
    when 'profile' then
      select null::uuid, true into v_group, v_found from public.profiles p where p.id = new.target_id;
    when 'photo' then
      -- As 20261010000011: a photo you can't see can't be reported.
      select p.group_id, true into v_group, v_found from public.group_photos p
       where p.id = new.target_id and p.status = 'visible' and public.can_view_group_photos(p.group_id);
    when 'message' then
      select null::uuid, true, c.id into v_group, v_found, v_conv
        from public.messages m join public.conversations c on c.id = m.conversation_id
       where m.id = new.target_id and auth.uid() in (c.starter_id, c.recipient_id);
  end case;

  if v_found is not true then
    perform public.raise_rule('not_found', 'The reported item does not exist.');
  end if;

  if v_conv is not null then
    update public.conversations set reported_at = coalesce(reported_at, now()) where id = v_conv;
  end if;

  new.group_id := v_group;
  new.status := 'open';
  new.handled_by := null;
  new.handled_at := null;
  new.created_at := now();
  return new;
end
$$;

revoke execute on function public.reports_before_insert() from public, anon, authenticated;
