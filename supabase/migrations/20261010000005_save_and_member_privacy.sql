-- UC-22 and UC-16, approved and built 9 October 2026.
--
-- 1. Saved events (FR-EV-18). A signed-in user saves any event they can see,
--    without RSVPing. Nobody else, organizers and the site admin included,
--    can read what someone saved.
-- 2. Member list privacy (FR-MB-10). Each group chooses who sees its member
--    list: organizers only, members (the default) or anyone signed in. The
--    same rule decides who sees names on *who's going*. Organizers stay
--    public, and counts are always shown.

-- ---------------------------------------------------------------------------
-- 1. Saved events
-- ---------------------------------------------------------------------------

create table public.saved_events (
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

comment on table public.saved_events is
  'FR-EV-18: events a user saved for later. Private to that user.';

create index saved_events_event_id_idx on public.saved_events (event_id);

alter table public.saved_events enable row level security;

-- No update: a save is made or removed, never changed.
revoke all on public.saved_events from anon, authenticated;
grant select, insert, delete on public.saved_events to authenticated;

create policy "Users read their own saved events" on public.saved_events
  for select to authenticated
  using (user_id = (select auth.uid()));

-- The events policy applies inside exists(), so only an event the user can
-- see can be saved.
create policy "Users save events they can see" on public.saved_events
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_write()
    and exists (select 1 from public.events e where e.id = event_id)
  );

-- Unsaving is always allowed, as leaving a waitlist is.
create policy "Users unsave their own events" on public.saved_events
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- A sane cap, as every other write has one. Runs as the user: their own rows
-- are the ones RLS lets them count.
create or replace function public.saved_events_cap()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (select count(*) from public.saved_events s where s.user_id = (select auth.uid())) >= 500 then
    raise exception using errcode = 'P0001', message = 'rate_limited: You can save at most 500 events.';
  end if;
  return new;
end
$$;

revoke execute on function public.saved_events_cap() from public, anon, authenticated;

-- a_limit_guard (per-person lock, server-set created_at) runs first by name.
create trigger a_limit_guard before insert on public.saved_events
  for each row execute function public.before_insert_limit_guard();
create trigger saved_events_cap before insert on public.saved_events
  for each row execute function public.saved_events_cap();

-- ---------------------------------------------------------------------------
-- 2. Member list privacy
-- ---------------------------------------------------------------------------

create type public.member_list_visibility as enum ('organizers', 'members', 'signed_in');

alter table public.groups
  add column member_list_visibility public.member_list_visibility not null default 'members';

comment on column public.groups.member_list_visibility is
  'FR-MB-10: who sees the member list and names on who''s going. Set by owner and admins.';

-- Owners and admins set it under the existing update policy.
grant update (member_list_visibility) on public.groups to authenticated;

-- Whether the current user may see this group's full member list and the
-- names of who's going. Organizers and the site admin always may; the
-- policies below add those separately. SECURITY DEFINER so the policies can
-- read the setting without going through the groups policy.
create or replace function public.member_list_visible(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select case g.member_list_visibility
      when 'signed_in' then auth.uid() is not null
      when 'members' then public.is_group_member(g.id)
      else public.is_group_admin(g.id)
    end
    from public.groups g
    where g.id = p_group_id
  ), false)
$$;

revoke execute on function public.member_list_visible(uuid) from public;
grant execute on function public.member_list_visible(uuid) to anon, authenticated;

-- Replaces the 20261009000001 policy. Unchanged: your own row, the site
-- admin, removed groups hidden, active organizers public, organizers see
-- every row (pending and banned included). Changed: the rest of the active
-- list follows the group's setting instead of "members".
drop policy "Organizers are public; members see the member list" on public.group_members;
create policy "Organizers are public; members see the member list" on public.group_members
  for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_site_admin())
    or (
      public.group_is_visible(group_id)
      and (
        (role in ('owner', 'admin') and status = 'active')
        or (status = 'active' and public.member_list_visible(group_id))
        or public.is_group_admin(group_id)
      )
    )
  );

-- Replaces the 20261009000001 policy: names on who's going follow the same
-- setting. Your own RSVP and the site admin are unchanged; organizers always
-- see who's coming to their events.
drop policy "Members see who is going" on public.event_rsvps;
create policy "Members see who is going" on public.event_rsvps
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.events e
      where e.id = event_id
        and public.group_is_visible(e.group_id)
        and (public.is_group_admin(e.group_id) or public.member_list_visible(e.group_id))
    )
    or (select public.is_site_admin())
  );

-- Counts are always shown. With names hidden a member can no longer count
-- the waitlist from the rows, so this gives the number waiting and the
-- caller's own place (0 when not waiting), and no names.
create or replace function public.event_waitlist_place(p_event_id uuid)
returns table (waiting integer, my_place integer)
language sql stable security definer set search_path = ''
as $$
  with w as (
    select r.user_id, row_number() over (order by r.waitlisted_at, r.user_id) as place
    from public.event_rsvps r
    join public.events e on e.id = r.event_id
    where r.event_id = p_event_id and r.status = 'waitlisted' and public.group_is_visible(e.group_id)
  )
  select (select count(*)::integer from w),
         coalesce((select w.place::integer from w where w.user_id = (select auth.uid())), 0)
$$;

revoke execute on function public.event_waitlist_place(uuid) from public, anon;
grant execute on function public.event_waitlist_place(uuid) to authenticated;
