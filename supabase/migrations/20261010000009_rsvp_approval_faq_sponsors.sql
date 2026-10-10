-- UC-17 and part of UC-10, approved 9 October 2026. PT-120 to PT-139.
--
--   FR-EV-15  Approve RSVPs: a member's RSVP becomes a request; only the
--             group's organizers approve or decline it
--   FR-EV-17  Manage RSVPs: organizers approve, decline, waitlist or remove
--             anyone's RSVP (manage_rsvp); removals go in the moderation log
--   FR-EV-20  RSVPs open at: before it, the database refuses RSVPs
--   FR-EV-19  FAQ: up to 15 questions and answers per event, in order
--
-- FR-EV-14 (sponsors) was deferred; nothing here is for it yet.

-- ---------------------------------------------------------------------------
-- 1. New values. Neither can be used in the transaction that adds it, so
-- outside function bodies (checked when they run) they are compared as text.
-- ---------------------------------------------------------------------------

alter type public.rsvp_status add value if not exists 'requested';
alter type public.rsvp_status add value if not exists 'declined';
alter type public.moderation_action_type add value if not exists 'remove_rsvp';

-- ---------------------------------------------------------------------------
-- 2. Event settings (FR-EV-15, FR-EV-20).
-- ---------------------------------------------------------------------------

alter table public.events
  add column approve_rsvps boolean not null default false,
  add column rsvps_open_at timestamptz,
  add constraint events_rsvps_open_before_start check (rsvps_open_at is null or rsvps_open_at < starts_at);

grant update (approve_rsvps, rsvps_open_at) on public.events to authenticated;

-- ---------------------------------------------------------------------------
-- 3. RSVP rules. Same as 20261010000002 (the event row is still locked
-- first, so going never exceeds places), plus the new member rules. Anyone
-- who can moderate the group is an organizer here; everyone else is a member
-- writing their own RSVP.
-- ---------------------------------------------------------------------------

create or replace function public.event_rsvps_before_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_going integer;
  v_waiting boolean;
  v_org boolean;
begin
  select * into v_event from public.events e where e.id = new.event_id for update;
  v_org := public.can_moderate(v_event.group_id);

  if v_event.status <> 'scheduled' then
    perform public.raise_rule('event_cancelled', 'This event has been cancelled.');
  end if;
  if v_event.starts_at <= now() then
    perform public.raise_rule('event_started', 'RSVPs close when the event starts.');
  end if;
  if not v_event.takes_rsvps then
    perform public.raise_rule('rsvps_off', 'This event takes no RSVPs here.');
  end if;

  if not v_org then
    -- FR-EV-20: closed until the opening time.
    if v_event.rsvps_open_at is not null and v_event.rsvps_open_at > now() then
      perform public.raise_rule('rsvps_not_open', 'RSVPs for this event aren''t open yet.');
    end if;
    -- FR-EV-15: only organizers decline, and a declined member can't undo it.
    if tg_op = 'UPDATE' and old.status = 'declined' then
      perform public.raise_rule('rsvp_declined', 'The organizers declined your RSVP.');
    end if;
    if new.status = 'declined' then
      perform public.raise_rule('not_allowed', 'Only the group''s organizers can decline an RSVP.');
    end if;
    if new.status = 'requested' and not v_event.approve_rsvps then
      perform public.raise_rule('no_approval', 'This event doesn''t need approval. RSVP instead.');
    end if;
    -- A member never approves themselves.
    if new.status = 'going' and v_event.approve_rsvps
       and not (tg_op = 'UPDATE' and old.status = 'going') then
      perform public.raise_rule('approval_needed', 'The organizers approve RSVPs to this event. Ask to go instead.');
    end if;
  end if;

  select count(*) into v_going from public.event_rsvps r
  where r.event_id = new.event_id and r.status = 'going' and r.user_id <> new.user_id;
  select exists (
    select 1 from public.event_rsvps r
    where r.event_id = new.event_id and r.status = 'waitlisted' and r.user_id <> new.user_id
  ) into v_waiting;

  if new.status = 'going' then
    if v_event.capacity is not null and v_going >= v_event.capacity then
      perform public.raise_rule('event_full', 'This event is full.');
    end if;
    -- Nobody leaves the waitlist for going, or jumps it, without an organizer.
    if not v_org and (
         (tg_op = 'UPDATE' and old.status = 'waitlisted')
         or (v_event.waitlist_enabled and v_waiting)
       ) then
      perform public.raise_rule('waitlist_first', 'Places go to the waitlist first.');
    end if;
  end if;

  if new.status = 'waitlisted' then
    if not v_event.waitlist_enabled or v_event.capacity is null then
      perform public.raise_rule('no_waitlist', 'This event has no waitlist.');
    end if;
    if v_going < v_event.capacity and not v_waiting then
      perform public.raise_rule('not_full', 'There are places left. RSVP instead.');
    end if;
  end if;

  -- Join order is the time the person joined the waitlist, set here.
  if new.status = 'waitlisted' then
    if tg_op = 'INSERT' or old.status <> 'waitlisted' then
      new.waitlisted_at := clock_timestamp();
    else
      new.waitlisted_at := old.waitlisted_at;
    end if;
  else
    new.waitlisted_at := null;
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- 4. Manage RSVPs (FR-EV-17). One function for the four actions; the
-- trigger above still applies to approve, decline and waitlist, so approving
-- into a full event is refused exactly like any other RSVP.
-- ---------------------------------------------------------------------------

create or replace function public.manage_rsvp(p_event_id uuid, p_user_id uuid, p_action text, p_reason text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_old public.event_rsvps%rowtype;
begin
  perform public.require_writer();
  select * into v_event from public.events e where e.id = p_event_id for update;
  if not found or not public.can_moderate(v_event.group_id) then
    perform public.raise_rule('not_allowed', 'Only the group''s organizers can manage RSVPs.');
  end if;
  if p_action is null or p_action not in ('approve', 'decline', 'waitlist', 'remove') then
    perform public.raise_rule('invalid', 'Approve, decline, waitlist or remove.');
  end if;

  select * into v_old from public.event_rsvps r
   where r.event_id = p_event_id and r.user_id = p_user_id
   for update;
  if not found then
    perform public.raise_rule('not_found', 'That person has no RSVP to this event.');
  end if;

  if p_action = 'remove' then
    delete from public.event_rsvps where event_id = p_event_id and user_id = p_user_id;
    perform public.log_moderation('remove_rsvp', 'event', p_event_id, v_event.group_id, p_reason,
                                  jsonb_build_object('user_id', p_user_id, 'status', v_old.status));
    return;
  end if;

  update public.event_rsvps
     set status = case p_action
                    when 'approve' then 'going'
                    when 'decline' then 'declined'
                    else 'waitlisted'
                  end::public.rsvp_status,
         updated_at = now()
   where event_id = p_event_id and user_id = p_user_id;
end
$$;

revoke execute on function public.manage_rsvp(uuid, uuid, text, text) from public, anon;
grant execute on function public.manage_rsvp(uuid, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Who can see requests and declines: the person and the organizers only.
-- Replaces the 20261010000005 policy; otherwise unchanged.
-- ---------------------------------------------------------------------------

drop policy "Members see who is going" on public.event_rsvps;
create policy "Members see who is going" on public.event_rsvps
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.events e
      where e.id = event_id
        and public.group_is_visible(e.group_id)
        and (public.is_group_admin(e.group_id)
             or (public.member_list_visible(e.group_id) and event_rsvps.status::text not in ('requested', 'declined')))
    )
    or (select public.is_site_admin())
  );

-- A declined member can't delete the decline and ask again.
drop policy "Members withdraw their own RSVP" on public.event_rsvps;
create policy "Members withdraw their own RSVP" on public.event_rsvps
  for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.can_write()) and status::text <> 'declined');

-- ---------------------------------------------------------------------------
-- 6. FAQ (FR-EV-19). Readable wherever the event is (the events policy
-- applies inside the check); written only through set_event_faq, which
-- replaces the whole list in one go, in the order given.
-- ---------------------------------------------------------------------------

create table public.event_faqs (
  event_id uuid not null references public.events (id) on delete cascade,
  position smallint not null check (position between 1 and 15),
  question text not null check (char_length(btrim(question)) between 3 and 200),
  answer text not null check (char_length(btrim(answer)) between 1 and 2000),
  primary key (event_id, position)
);

alter table public.event_faqs enable row level security;
revoke all on public.event_faqs from public, anon, authenticated;
grant select on public.event_faqs to anon, authenticated;

create policy "FAQs are as visible as their event" on public.event_faqs
  for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id));

create or replace function public.set_event_faq(p_event_id uuid, p_questions text[], p_answers text[])
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_group uuid;
begin
  perform public.require_writer();
  select e.group_id into v_group from public.events e where e.id = p_event_id;
  if v_group is null or not public.can_moderate(v_group) then
    perform public.raise_rule('not_allowed', 'Only the group''s organizers can edit the FAQ.');
  end if;
  if coalesce(cardinality(p_questions), 0) <> coalesce(cardinality(p_answers), 0) then
    perform public.raise_rule('invalid', 'Every question needs an answer.');
  end if;
  if coalesce(cardinality(p_questions), 0) > 15 then
    perform public.raise_rule('faq_limit', 'An event can have at most 15 questions.');
  end if;

  delete from public.event_faqs where event_id = p_event_id;
  insert into public.event_faqs (event_id, position, question, answer)
  select p_event_id, q.n, btrim(q.question), btrim(p_answers[q.n])
    from unnest(p_questions) with ordinality as q (question, n);
end
$$;

revoke execute on function public.set_event_faq(uuid, text[], text[]) from public, anon;
grant execute on function public.set_event_faq(uuid, text[], text[]) to authenticated;
