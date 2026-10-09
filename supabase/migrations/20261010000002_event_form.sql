-- UC-30, approved 9 October 2026: the event form (FR-EV-23 to FR-EV-28).
--
--   FR-EV-23  a required Description (checked by the app) plus optional Details
--   FR-EV-24  one optional photo per event, in the event-photos bucket
--   FR-EV-25  Free or Paid, with a registration fee and a total cost as text
--   FR-EV-26  Take RSVPs on Branch Outdoors, or not
--   FR-EV-27  an optional sign-up link when the event takes no RSVPs
--   FR-EV-28  a waitlist when full; only organizers move people to going

-- ---------------------------------------------------------------------------
-- 1. A waitlisted RSVP.
--
-- A new enum value can't be used in the transaction that adds it, so nothing
-- below names 'waitlisted' outside a function body (those are checked when
-- they run, after this migration has committed).
-- ---------------------------------------------------------------------------

alter type public.rsvp_status add value if not exists 'waitlisted';

-- Join order for the waitlist, set by the database (never by the member).
alter table public.event_rsvps add column waitlisted_at timestamptz;
create index event_rsvps_waitlist_idx on public.event_rsvps (event_id, waitlisted_at)
  where waitlisted_at is not null;

-- ---------------------------------------------------------------------------
-- 2. The new event fields.
-- ---------------------------------------------------------------------------

alter table public.events
  add column details text check (char_length(details) <= 10000),
  add column photo_path text,
  add column photo_alt text check (char_length(btrim(photo_alt)) between 1 and 200),
  add column is_paid boolean not null default false,
  add column registration_fee text check (char_length(btrim(registration_fee)) between 1 and 80),
  add column total_cost text check (char_length(btrim(total_cost)) between 1 and 80),
  add column takes_rsvps boolean not null default true,
  add column signup_url text check (signup_url ~ '^https?://[^\s]+$' and char_length(signup_url) <= 500),
  add column waitlist_enabled boolean not null default false;

-- FR-EV-23: existing events keep their text as Details. Their new
-- Description is a plain sentence built from the title and the group, so
-- every event has one; the form requires a real one from now on.
update public.events e
   set details = nullif(btrim(e.description), ''),
       description = left(e.title || ', hosted by ' || g.name || '.', 2000)
  from public.groups g
 where g.id = e.group_id;

alter table public.events drop constraint if exists events_description_check;
alter table public.events
  add constraint events_description_check check (char_length(description) <= 2000),
  -- FR-EV-24: the photo lives in this event's own folder, and has alt text.
  add constraint events_photo_path_check check (
    photo_path is null
    or photo_path ~ ('^' || group_id::text || '/' || id::text || '/[A-Za-z0-9_-]{8,64}\.webp$')
  ),
  add constraint events_photo_needs_alt check (photo_path is null or photo_alt is not null),
  -- FR-EV-25: a paid event states its registration fee.
  add constraint events_paid_needs_fee check (not is_paid or registration_fee is not null);

-- Owner and admins may change the new fields; members still can't (RLS).
grant update (
  details, photo_path, photo_alt, is_paid, registration_fee, total_cost,
  takes_rsvps, signup_url, waitlist_enabled
) on public.events to authenticated;

-- ---------------------------------------------------------------------------
-- 3. RSVP rules (FR-EV-3, FR-EV-5, FR-EV-26, FR-EV-28).
--
-- The event row is still locked first, so two people (or two organizers)
-- can't take the last place at the same moment.
-- ---------------------------------------------------------------------------

create or replace function public.event_rsvps_before_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_going integer;
  v_waiting boolean;
begin
  select * into v_event from public.events e where e.id = new.event_id for update;

  if v_event.status <> 'scheduled' then
    perform public.raise_rule('event_cancelled', 'This event has been cancelled.');
  end if;
  if v_event.starts_at <= now() then
    perform public.raise_rule('event_started', 'RSVPs close when the event starts.');
  end if;
  if not v_event.takes_rsvps then
    perform public.raise_rule('rsvps_off', 'This event takes no RSVPs here.');
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
    if not public.is_group_admin(v_event.group_id) and (
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

-- An organizer moves someone from the waitlist to going (FR-EV-28): only an
-- owner or admin of an active group, only while a place is free.
create or replace function public.move_from_waitlist(p_event_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_going integer;
begin
  perform public.require_writer();
  select * into v_event from public.events e where e.id = p_event_id for update;
  if not found
     or not public.is_group_admin(v_event.group_id)
     or not public.group_is_active(v_event.group_id) then
    perform public.raise_rule('not_allowed', 'Only the group''s organizers can move people from the waitlist.');
  end if;

  select count(*) into v_going from public.event_rsvps r
  where r.event_id = p_event_id and r.status = 'going';
  if v_event.capacity is not null and v_going >= v_event.capacity then
    perform public.raise_rule('event_full', 'This event is full.');
  end if;

  update public.event_rsvps set status = 'going', updated_at = now()
   where event_id = p_event_id and user_id = p_user_id and status = 'waitlisted';
  if not found then
    perform public.raise_rule('not_found', 'That person isn''t on the waitlist.');
  end if;
end
$$;

revoke execute on function public.move_from_waitlist(uuid, uuid) from public, anon;
grant execute on function public.move_from_waitlist(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Event lists show Paid (FR-EV-25) and hide going counts for events that
-- take no RSVPs (FR-EV-26). New columns go at the end so the view can be
-- replaced in place, keeping its grants and security_invoker.
-- ---------------------------------------------------------------------------

create or replace view public.event_listings
with (security_invoker = true) as
select
  e.id,
  e.group_id,
  g.slug as group_slug,
  g.name as group_name,
  c.slug as category_slug,
  e.title,
  e.starts_at,
  e.ends_at,
  e.timezone,
  e.location_name,
  e.address_visibility,
  e.capacity,
  e.status,
  public.event_going_count(e.id) as going_count,
  e.search,
  g.is_unclaimed,
  e.source_url,
  e.is_paid,
  e.takes_rsvps
from public.events e
join public.groups g on g.id = e.group_id
join public.subcategories s on s.id = g.subcategory_id
join public.categories c on c.id = s.category_id;

-- ---------------------------------------------------------------------------
-- 5. Event photos (FR-EV-24, TR-SEC-9, TR-SEC-12). Public to read; only the
-- app's re-encoded WebP goes in, at event-photos/<group_id>/<event_id>/<file>.
-- Unlike group-covers, writing also needs a writable account and an active
-- group, and the event must belong to the group in the path.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-photos', 'event-photos', true, 5242880, array['image/webp'])
on conflict (id) do nothing;

-- Returns null instead of failing when the second folder isn't an event id.
create or replace function public.storage_event_id(p_name text)
returns uuid
language plpgsql immutable set search_path = ''
as $$
begin
  return ((storage.foldername(p_name))[2])::uuid;
exception when others then
  return null;
end
$$;

revoke execute on function public.storage_event_id(text) from public, anon;
grant execute on function public.storage_event_id(text) to authenticated;

-- True when the signed-in user may write this event photo path.
create or replace function public.can_write_event_photo(p_name text)
returns boolean
language sql stable set search_path = ''
as $$
  select public.can_write()
     and public.is_group_admin(public.storage_group_id(p_name))
     and public.group_is_active(public.storage_group_id(p_name))
     and exists (
       select 1 from public.events e
       where e.id = public.storage_event_id(p_name)
         and e.group_id = public.storage_group_id(p_name)
     )
$$;

revoke execute on function public.can_write_event_photo(text) from public, anon;
grant execute on function public.can_write_event_photo(text) to authenticated;

create policy "Group admins see their event photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'event-photos' and public.can_write_event_photo(name));

create policy "Group admins upload event photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'event-photos' and public.can_write_event_photo(name));

create policy "Group admins replace event photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'event-photos' and public.can_write_event_photo(name))
  with check (bucket_id = 'event-photos' and public.can_write_event_photo(name));

create policy "Group admins delete event photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'event-photos' and public.can_write_event_photo(name));
