-- Overnight review, 12 October 2026.
--
-- 1. Hosted events (UC-37) get the same time zone check as group events:
--    an unknown zone ('Mountain Time') would make every page that lists the
--    event fail when it formats the date. The research path skips such
--    events instead of failing the whole listing.
-- 2. move_from_waitlist lets the site admin act like manage_rsvp does
--    (can_moderate), since the event page shows the site admin the button.
--
-- Tests: PT-227b (033-business-events.sql), PT-54b (017-event-form.sql).

create trigger business_events_before_write
  before insert or update on public.business_events
  for each row execute function public.events_before_write();

create or replace function research.publish_business_events(p_candidate_id uuid, p_business_id uuid)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.business_events (business_id, title, starts_at, ends_at, timezone, location_name, source_url)
  select p_business_id, e.title, e.starts_at, coalesce(e.ends_at, e.starts_at + interval '3 hours'),
         e.timezone, e.location_name, e.source_url
  from research.candidate_events e
  where e.candidate_id = p_candidate_id and e.starts_at > now()
    and exists (select 1 from pg_catalog.pg_timezone_names z where z.name = e.timezone)
  on conflict (business_id, title, starts_at) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

revoke execute on function research.publish_business_events(uuid, uuid) from public, anon, authenticated;

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
  if not found or not public.can_moderate(v_event.group_id) then
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
