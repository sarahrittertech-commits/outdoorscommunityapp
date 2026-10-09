-- UC-31: page managers, invites by email and an invite link.
-- Approved by Sarah on 9 October 2026 (FR-MB-11 to FR-MB-16).
--
-- Names: the UI calls the owner the *page admin* and admins *page managers*.
-- The role names in the database stay owner / admin / member.
--
-- 1. At most two page managers per group, open manager invites included.
-- 2. transfer_ownership reordered so the limit never trips mid-swap.
-- 3. group_invite_links: one shareable link per group.
-- 4. invites.email_invites: member and manager invites by email (stored, not
--    yet sent: email waits on Resend and a domain, ADR-0004).
-- 5. join_by_invite(): the one way to use either kind of invite.
-- 6. purge_old_invites(): deletes email invites after 30 days.

-- ---------------------------------------------------------------------------
-- Moderation log entries (FR-MB-16)
-- ---------------------------------------------------------------------------

alter type public.moderation_action_type add value if not exists 'create_invite_link';
alter type public.moderation_action_type add value if not exists 'turn_off_invite_link';
alter type public.moderation_action_type add value if not exists 'invite_manager';
alter type public.moderation_action_type add value if not exists 'send_invites';

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One invite link per group (FR-MB-15). The token is stored as it is, not
-- hashed: it is a revocable share link the page admin and managers need to
-- see again to copy it, like a shared-document link. Only they can read it
-- (RLS below), turning it off or making a new one stops it at once, and it
-- grants nothing beyond joining as a plain member.
create table public.group_invite_links (
  group_id uuid primary key references public.groups (id) on delete cascade,
  token text not null unique check (token ~ '^[a-f0-9]{64}$'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  -- null: works until turned off.
  expires_at timestamptz,
  revoked_at timestamptz
);

-- Email invites (FR-MB-12, FR-MB-13). They hold email addresses, so they
-- live in their own schema, which the API does not expose and the anon and
-- authenticated roles cannot see (like research.*); PT-20 still holds for
-- public. The address is kept only to send the email and to skip a repeat
-- within 30 days; purge_old_invites() deletes the row after 30 days. The
-- page admin sees their open manager invites through
-- open_manager_invites(), without the address.
create schema if not exists invites;
revoke all on schema invites from public, anon, authenticated;

create table invites.email_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  email text not null check (char_length(email) <= 254 and email = lower(btrim(email))),
  role public.member_role not null default 'member' check (role in ('member', 'admin')),
  token text not null unique check (token ~ '^[a-f0-9]{64}$'),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  cancelled_at timestamptz
);

create index email_invites_group_idx on invites.email_invites (group_id, created_at);
create index email_invites_created_idx on invites.email_invites (created_at);

alter table public.group_invite_links enable row level security;
-- No policies: a second lock behind the schema.
alter table invites.email_invites enable row level security;
revoke all on invites.email_invites from public, anon, authenticated;

-- Writes only through the functions below.
revoke all on public.group_invite_links from anon;
revoke insert, update, delete, truncate, references, trigger on public.group_invite_links from authenticated;
grant select on public.group_invite_links to authenticated;

create policy "Page admin and managers see their group's invite link" on public.group_invite_links
  for select to authenticated
  using (public.is_group_admin(group_id));

-- 64 hex characters from two random UUIDs: 244 random bits from the
-- server's secure generator, needing no extension.
create or replace function public.new_invite_token()
returns text
language sql volatile set search_path = ''
as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
$$;

revoke execute on function public.new_invite_token() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. At most two page managers (FR-MB-11)
-- ---------------------------------------------------------------------------
-- Counts managers plus open manager invites. Applies to every way a row
-- becomes an admin: set_member_role, join_by_invite and direct writes.

create or replace function public.group_members_manager_limit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.role = 'admin' and (tg_op = 'INSERT' or old.role <> 'admin') then
    perform pg_advisory_xact_lock(hashtextextended('managers:' || new.group_id::text, 0));
    if (select count(*) from public.group_members m
         where m.group_id = new.group_id and m.role = 'admin' and m.user_id <> new.user_id)
       + (select count(*) from invites.email_invites i
           where i.group_id = new.group_id and i.role = 'admin'
             and i.accepted_at is null and i.cancelled_at is null and i.expires_at > now()) >= 2 then
      perform public.raise_rule('manager_limit', 'A group can have at most two page managers.');
    end if;
  end if;
  return new;
end
$$;

revoke execute on function public.group_members_manager_limit() from public, anon, authenticated;

create trigger group_members_manager_limit before insert or update of role on public.group_members
  for each row execute function public.group_members_manager_limit();

-- ---------------------------------------------------------------------------
-- 2. Transfer ownership (FR-MB-6): still owner only, still only to a manager.
-- The new owner steps down to member first, so the old owner becoming a
-- manager never makes three managers for a moment.
-- ---------------------------------------------------------------------------

create or replace function public.transfer_ownership(p_group_id uuid, p_new_owner uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not (public.is_group_owner(p_group_id) or public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only the owner can transfer ownership.');
  end if;
  if not exists (select 1 from public.group_members
                 where group_id = p_group_id and user_id = p_new_owner
                   and role = 'admin' and status = 'active') then
    perform public.raise_rule('not_allowed', 'Ownership can only go to an admin.');
  end if;
  update public.group_members set role = 'member'
   where group_id = p_group_id and user_id = p_new_owner;
  update public.group_members set role = 'admin'
   where group_id = p_group_id and role = 'owner';
  update public.group_members set role = 'owner'
   where group_id = p_group_id and user_id = p_new_owner;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Invite link (FR-MB-15)
-- ---------------------------------------------------------------------------

-- p_valid_days: 7 or 30, or null for "until turned off". Replaces any
-- earlier link, which stops working at once. Returns the new token.
create or replace function public.create_invite_link(p_group_id uuid, p_valid_days integer default 30)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_token text := public.new_invite_token();
begin
  perform public.require_writer();
  if not public.is_group_admin(p_group_id) or not public.group_is_active(p_group_id) then
    perform public.raise_rule('not_allowed', 'Only the page admin and page managers can make an invite link.');
  end if;
  if p_valid_days is not null and p_valid_days not in (7, 30) then
    perform public.raise_rule('invalid', 'An invite link lasts 7 days, 30 days or until turned off.');
  end if;

  insert into public.group_invite_links (group_id, token, created_by, created_at, expires_at, revoked_at)
  values (p_group_id, v_token, auth.uid(), now(),
          case when p_valid_days is null then null else now() + make_interval(days => p_valid_days) end, null)
  on conflict (group_id) do update
    set token = excluded.token, created_by = excluded.created_by, created_at = excluded.created_at,
        expires_at = excluded.expires_at, revoked_at = null;

  perform public.log_moderation('create_invite_link', 'group', p_group_id, p_group_id,
    case when p_valid_days is null then 'until turned off' else p_valid_days || ' days' end);
  return v_token;
end
$$;

create or replace function public.turn_off_invite_link(p_group_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.is_group_admin(p_group_id) then
    perform public.raise_rule('not_allowed', 'Only the page admin and page managers can turn off the invite link.');
  end if;
  update public.group_invite_links set revoked_at = now()
   where group_id = p_group_id and revoked_at is null;
  if not found then
    perform public.raise_rule('not_found', 'There is no invite link to turn off.');
  end if;
  perform public.log_moderation('turn_off_invite_link', 'group', p_group_id, p_group_id, '');
end
$$;

-- ---------------------------------------------------------------------------
-- 4. Email invites (FR-MB-12, FR-MB-13)
-- ---------------------------------------------------------------------------

-- Member invites: at most 25 addresses per send and 100 a day per group;
-- an address invited to this group in the last 30 days is skipped. Valid
-- for 30 days. Returns how many were added; the rest were repeats.
create or replace function public.invite_members(p_group_id uuid, p_emails text[])
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_emails text[];
  v_added integer;
begin
  perform public.require_writer();
  if not public.is_group_admin(p_group_id) or not public.group_is_active(p_group_id) then
    perform public.raise_rule('not_allowed', 'Only the page admin and page managers can invite people.');
  end if;

  select coalesce(array_agg(distinct lower(btrim(e))), '{}') into v_emails
    from unnest(coalesce(p_emails, '{}')) as e
   where btrim(e) <> '';
  if cardinality(v_emails) = 0 then
    perform public.raise_rule('invalid', 'Add at least one email address.');
  end if;
  if cardinality(v_emails) > 25 then
    perform public.raise_rule('too_many_invites', 'At most 25 addresses per send.');
  end if;
  if exists (select 1 from unnest(v_emails) as e
              where char_length(e) > 254 or e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    perform public.raise_rule('invalid', 'One of those is not an email address.');
  end if;

  -- Serialize sends for a group so two at once can't pass the daily limit.
  perform pg_advisory_xact_lock(hashtextextended('invites:' || p_group_id::text, 0));

  v_emails := array(
    select e from unnest(v_emails) as e
     where not exists (select 1 from invites.email_invites i
                        where i.group_id = p_group_id and i.email = e
                          and i.created_at > now() - interval '30 days'));

  if (select count(*) from invites.email_invites i
       where i.group_id = p_group_id and i.created_at > now() - interval '1 day')
     + cardinality(v_emails) > 100 then
    perform public.raise_rule('rate_limited', 'A group can send at most 100 invites a day.');
  end if;

  insert into invites.email_invites (group_id, email, role, token, invited_by, expires_at)
  select p_group_id, e, 'member', public.new_invite_token(), auth.uid(), now() + interval '30 days'
    from unnest(v_emails) as e;
  get diagnostics v_added = row_count;

  if v_added > 0 then
    perform public.log_moderation('send_invites', 'group', p_group_id, p_group_id, v_added || ' addresses');
  end if;
  return v_added;
end
$$;

-- Manager invite: page admin only, valid 7 days, counts toward the limit
-- of two while open.
create or replace function public.invite_manager(p_group_id uuid, p_email text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  perform public.require_writer();
  if not public.is_group_owner(p_group_id) or not public.group_is_active(p_group_id) then
    perform public.raise_rule('not_allowed', 'Only the page admin can invite a page manager.');
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    perform public.raise_rule('invalid', 'That is not an email address.');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('managers:' || p_group_id::text, 0));
  if (select count(*) from public.group_members m where m.group_id = p_group_id and m.role = 'admin')
     + (select count(*) from invites.email_invites i
         where i.group_id = p_group_id and i.role = 'admin'
           and i.accepted_at is null and i.cancelled_at is null and i.expires_at > now()) >= 2 then
    perform public.raise_rule('manager_limit', 'A group can have at most two page managers.');
  end if;

  insert into invites.email_invites (group_id, email, role, token, invited_by, expires_at)
  values (p_group_id, v_email, 'admin', public.new_invite_token(), auth.uid(), now() + interval '7 days');

  perform public.log_moderation('invite_manager', 'group', p_group_id, p_group_id, '');
end
$$;

-- The page admin's open manager invites, without the address.
create or replace function public.open_manager_invites(p_group_id uuid)
returns table (id uuid, sent_at timestamptz, expires_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select i.id, i.created_at, i.expires_at from invites.email_invites i
   where i.group_id = p_group_id and public.is_group_owner(p_group_id)
     and i.role = 'admin' and i.accepted_at is null and i.cancelled_at is null
     and i.expires_at > now()
   order by i.created_at
$$;

create or replace function public.cancel_manager_invite(p_invite_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_group uuid;
begin
  perform public.require_writer();
  select group_id into v_group from invites.email_invites
   where id = p_invite_id and role = 'admin';
  if v_group is null or not public.is_group_owner(v_group) then
    perform public.raise_rule('not_allowed', 'Only the page admin can cancel a manager invite.');
  end if;
  update invites.email_invites set cancelled_at = now()
   where id = p_invite_id and accepted_at is null and cancelled_at is null;
  if not found then
    perform public.raise_rule('not_found', 'That invite is already used or cancelled.');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 5. Join by invite (FR-MB-14, FR-MB-16)
-- ---------------------------------------------------------------------------
-- Works for an invite link or an email invite. Joins at once, even where the
-- group asks people to request to join. Counts toward the 20-joins-a-day
-- limit (the insert fires the same triggers as joining). A manager invite
-- works only for the account whose email it was sent to; the address is
-- compared here and never returned.
--
-- Returns the group's slug and what happened: joined, already_member or
-- manager.
create or replace function public.join_by_invite(p_token text)
returns table (slug text, result text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_group_id uuid;
  v_invite invites.email_invites%rowtype;
  v_group public.groups%rowtype;
  v_member public.group_members%rowtype;
  v_result text := 'joined';
begin
  perform public.require_writer();
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    perform public.raise_rule('invite_invalid', 'That invite is not valid.');
  end if;

  select l.group_id into v_group_id from public.group_invite_links l
   where l.token = p_token and l.revoked_at is null
     and (l.expires_at is null or l.expires_at > now());

  if v_group_id is null then
    select * into v_invite from invites.email_invites i
     where i.token = p_token and i.accepted_at is null and i.cancelled_at is null
       and i.expires_at > now()
     for update;
    if v_invite.id is null then
      perform public.raise_rule('invite_invalid', 'That invite is not valid.');
    end if;
    if v_invite.role = 'admin' and v_invite.email is distinct from
       (select lower(u.email) from auth.users u where u.id = auth.uid()) then
      perform public.raise_rule('invite_wrong_account', 'This invite is for a different email address.');
    end if;
    v_group_id := v_invite.group_id;
  end if;

  select * into v_group from public.groups g where g.id = v_group_id;
  if v_group.status <> 'active' or v_group.is_unclaimed then
    perform public.raise_rule('cannot_join', 'This group is not taking new members.');
  end if;

  select * into v_member from public.group_members m
   where m.group_id = v_group_id and m.user_id = auth.uid();

  if v_member.status = 'banned' then
    perform public.raise_rule('cannot_join', 'You can''t join this group.');
  elsif v_member.status = 'active' then
    v_result := 'already_member';
  elsif v_member.status = 'pending' then
    update public.group_members set status = 'active'
     where group_id = v_group_id and user_id = auth.uid();
  else
    insert into public.group_members (group_id, user_id, role, status)
    values (v_group_id, auth.uid(), 'member', 'active');
  end if;

  if v_invite.id is not null then
    update invites.email_invites set accepted_at = now() where id = v_invite.id;
    if v_invite.role = 'admin' then
      update public.group_members set role = 'admin'
       where group_id = v_group_id and user_id = auth.uid() and role = 'member';
      v_result := 'manager';
    end if;
  end if;

  return query select v_group.slug, v_result;
end
$$;

-- ---------------------------------------------------------------------------
-- 6. Retention: email addresses are kept 30 days at most (FR-MB-13)
-- ---------------------------------------------------------------------------
-- For the scheduled cleanup (not scheduled yet; see the runbook). Not
-- callable through the API.
create or replace function public.purge_old_invites()
returns integer
language plpgsql set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from invites.email_invites where created_at < now() - interval '30 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end
$$;

revoke execute on function public.purge_old_invites() from public, anon, authenticated;

-- API surface: signed-in people only.
revoke execute on function
  public.create_invite_link(uuid, integer),
  public.turn_off_invite_link(uuid),
  public.invite_members(uuid, text[]),
  public.invite_manager(uuid, text),
  public.cancel_manager_invite(uuid),
  public.open_manager_invites(uuid),
  public.join_by_invite(text)
from public, anon;
grant execute on function
  public.create_invite_link(uuid, integer),
  public.turn_off_invite_link(uuid),
  public.invite_members(uuid, text[]),
  public.invite_manager(uuid, text),
  public.cancel_manager_invite(uuid),
  public.open_manager_invites(uuid),
  public.join_by_invite(text)
to authenticated;
