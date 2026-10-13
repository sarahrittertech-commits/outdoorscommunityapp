-- Event sources and the weekly reader (UC-39). PT-243 to PT-252.
begin;
select plan(21);
select tests.build_fixture();

select tests.as_admin();
create temporary table sub as select (select slug from public.subcategories order by sort_order, slug limit 1) as s;
grant select on sub to anon, authenticated;
select research.add_candidate(jsonb_build_object('kind', 'group', 'name', 'Test Source Club', 'subcategory', (select s from sub),
  'area', 'Brevard', 'description', 'A club with an events page.', 'source_url', 'https://sourceclub.example.org', 'verification', 'verified'));
select research.add_candidate(jsonb_build_object('kind', 'venue', 'name', 'Test Source Venue', 'subcategory', (select s from sub),
  'area', 'Brevard', 'description', 'A venue with an events page.', 'source_url', 'https://venue.example.org', 'verification', 'verified'));
create temporary table ids as
select (select id from research.candidates where name = 'Test Source Club') as club_cand,
       (select id from research.candidates where name = 'Test Source Venue') as venue_cand,
       (select id from public.regions where status = 'live' order by sort_order limit 1) as rid;
grant select on ids to anon, authenticated;
select tests.as('siteadmin');
select public.list_candidate((select club_cand from ids), (select rid from ids));
select public.list_business_candidate((select venue_cand from ids), (select rid from ids));

-- PT-243: only the site admin reads or adds sources.
select lives_ok($$ select public.add_event_source('group', 'test-source-club', 'https://sourceclub.example.org/events/', 'own_page') $$,
  'PT-243 the site admin adds a source');
select lives_ok($$ select public.add_event_source('business', 'test-source-venue', 'https://venue.example.org/calendar', 'own_page') $$,
  'PT-243 to a business too');
select tests.as('member');
select throws_ok($$ select public.add_event_source('group', 'test-source-club', 'https://evil.example.org/', 'own_page') $$,
  null, null, 'PT-243 a member cannot add a source');
select throws_ok($$ select * from public.admin_event_sources((select rid from ids)) $$, null, null, 'PT-243 a member cannot list sources');
select throws_ok($$ select count(*) from research.event_sources $$, null, null, 'PT-243 the research tables are closed to members');
select tests.as_anon();
select throws_ok($$ select * from public.admin_source_coverage() $$, null, null, 'PT-243 visitors cannot see coverage');

select tests.as_admin();
create temporary table src as
select (select s.id from research.event_sources s join public.groups g on g.id = s.group_id where g.slug = 'test-source-club') as club,
       (select s.id from research.event_sources s join public.businesses b on b.id = s.business_id where b.slug = 'test-source-venue') as venue;
grant select on src to authenticated;

-- PT-244: a read publishes the host's new, timed, verified events and keeps the rest with the reason.
select is(research.record_source_read(jsonb_build_object('source_id', (select club from src), 'ok', true, 'result', 'schema.org event data',
  'events', jsonb_build_array(
    jsonb_build_object('title', 'Beginner Ride', 'starts_at', '2030-05-04T09:00:00-04:00', 'timezone', 'America/New_York',
      'location_name', 'Trailhead', 'source_url', 'https://sourceclub.example.org/events/beginner', 'verification', 'verified'),
    jsonb_build_object('title', 'Spring Festival', 'starts_at', '2030-05-10', 'timezone', 'America/New_York', 'date_only', true,
      'location_name', 'The park', 'source_url', 'https://sourceclub.example.org/events/fest', 'verification', 'unverified'),
    jsonb_build_object('title', 'Partner Race', 'starts_at', '2030-05-11T08:00:00-04:00', 'timezone', 'America/New_York',
      'location_name', 'Downtown', 'source_url', 'https://othercalendar.example.com/race', 'verification', 'verified'),
    jsonb_build_object('title', 'Far Away Trip', 'starts_at', '2030-05-12T08:00:00-06:00', 'timezone', 'America/Denver',
      'location_name', 'Moab', 'source_url', 'https://sourceclub.example.org/events/moab', 'verification', 'verified', 'far', 'Out of the region (UT)')))) ->> 'published',
  '1', 'PT-244 one event is published');
select is(array(select title from public.events e join public.groups g on g.id = e.group_id where g.slug = 'test-source-club' order by title),
  array['Beginner Ride'], 'PT-244 only the timed, verified event from the host''s own site is on the board');
select is((select count(*)::integer from research.source_events where source_id = (select club from src) and status = 'kept'), 3,
  'PT-244 the other three are kept with their reasons');

-- PT-245: a second read of the same page changes nothing.
select is(research.record_source_read(jsonb_build_object('source_id', (select club from src), 'ok', true, 'result', 'schema.org event data',
  'events', jsonb_build_array(jsonb_build_object('title', 'Beginner Ride', 'starts_at', '2030-05-04T09:00:00-04:00', 'timezone', 'America/New_York',
      'location_name', 'Trailhead', 'source_url', 'https://sourceclub.example.org/events/beginner', 'verification', 'verified')))) ->> 'on_board',
  '1', 'PT-245 the same event read again is recognized, not added twice');

-- PT-246: a moved time is updated and logged.
select is(research.record_source_read(jsonb_build_object('source_id', (select club from src), 'ok', true, 'result', 'schema.org event data',
  'events', jsonb_build_array(jsonb_build_object('title', 'Beginner Ride', 'starts_at', '2030-05-04T10:00:00-04:00', 'timezone', 'America/New_York',
      'location_name', 'Trailhead', 'source_url', 'https://sourceclub.example.org/events/beginner', 'verification', 'verified')))) ->> 'updated',
  '1', 'PT-246 a changed start time updates the event');
select is((select starts_at from public.events where title = 'Beginner Ride'), '2030-05-04 14:00:00+00'::timestamptz,
  'PT-246 the event moved to the new time');
select is((select what from research.event_changes where title = 'Beginner Ride'), 'time', 'PT-246 the change is in the log');

-- PT-247: a cancellation marks the event cancelled, not deleted.
select is(research.record_source_read(jsonb_build_object('source_id', (select club from src), 'ok', true, 'result', 'schema.org event data',
  'events', jsonb_build_array(jsonb_build_object('title', 'Beginner Ride', 'starts_at', '2030-05-04T10:00:00-04:00', 'timezone', 'America/New_York',
      'location_name', 'Trailhead', 'source_url', 'https://sourceclub.example.org/events/beginner', 'verification', 'verified', 'cancelled', true)))) ->> 'cancelled',
  '1', 'PT-247 a cancelled event is marked cancelled');

-- PT-248: a business source works the same way.
select is(research.record_source_read(jsonb_build_object('source_id', (select venue from src), 'ok', true, 'result', 'schema.org event data',
  'events', jsonb_build_array(jsonb_build_object('title', 'Owl Walk', 'starts_at', '2030-06-01T19:00:00-04:00', 'timezone', 'America/New_York',
      'location_name', 'The meadow', 'source_url', 'https://venue.example.org/calendar/owls', 'verification', 'verified')))) ->> 'published',
  '1', 'PT-248 a venue''s new event is published');

-- PT-249: organizer-posted events and claimed groups are never touched (FR-ES-10).
update public.groups set is_unclaimed = false where slug = 'test-source-club';
select is(research.record_source_read(jsonb_build_object('source_id', (select club from src), 'ok', true, 'result', 'schema.org event data',
  'events', jsonb_build_array(jsonb_build_object('title', 'Claimed Ride', 'starts_at', '2030-07-04T09:00:00-04:00', 'timezone', 'America/New_York',
      'location_name', 'Trailhead', 'source_url', 'https://sourceclub.example.org/events/claimed', 'verification', 'verified')))) ->> 'published',
  '0', 'PT-249 nothing is published for a claimed group');
select ok(not exists (select 1 from jsonb_array_elements(research.sources_to_read()) x where (x ->> 'id')::uuid = (select club from src)),
  'PT-249 a claimed group''s sources are not read');

-- PT-250: three failed reads mark a source broken (FR-ES-9).
select research.record_source_read(jsonb_build_object('source_id', (select venue from src), 'ok', false, 'result', 'HTTP 500'));
select research.record_source_read(jsonb_build_object('source_id', (select venue from src), 'ok', false, 'result', 'HTTP 500'));
select research.record_source_read(jsonb_build_object('source_id', (select venue from src), 'ok', false, 'result', 'HTTP 500'));
select is((select status from research.event_sources where id = (select venue from src)), 'broken', 'PT-250 three failures make a source broken');

-- PT-251: a page the reader notices becomes a new source.
select is(jsonb_array_length(research.record_source_read(jsonb_build_object('source_id', (select club from src), 'ok', true, 'result', 'homepage',
  'discovered', jsonb_build_array(jsonb_build_object('url', 'https://www.meetup.com/test-source-club/events/', 'kind', 'meetup')))) -> 'new_sources'),
  1, 'PT-251 a discovered page is added as a source');

-- PT-252: the site admin sees coverage and retires a source.
select tests.as('siteadmin');
select ok((select hosts_with_source from public.admin_source_coverage() where region_id = (select rid from ids)) >= 1,
  'PT-252 coverage counts hosts with a source');
select lives_ok(format($$ select public.set_event_source_status(%L, 'retired') $$, (select venue from src)), 'PT-252 the site admin retires a source');

select * from finish();
rollback;
