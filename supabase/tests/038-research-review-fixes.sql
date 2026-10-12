-- Research review fixes (12 October 2026). PT-236 to PT-242.
begin;
select plan(13);
select tests.build_fixture();
select tests.as_admin();
create temporary table sub as select (select slug from public.subcategories order by sort_order, slug limit 1) as s;
grant select on sub to anon, authenticated;

select research.add_candidate(jsonb_build_object('kind', 'company', 'name', 'Test Skip Company', 'subcategory', (select s from sub),
  'area', 'Brevard', 'description', 'A race organizer to skip.', 'source_url', 'https://skip.example.org', 'verification', 'verified'));
select research.add_candidate(jsonb_build_object('kind', 'company', 'name', 'Test Listed Races', 'subcategory', (select s from sub),
  'area', 'Brevard', 'description', 'A race organizer to list.', 'source_url', 'https://races.example.org', 'verification', 'verified'));
select research.add_candidate(jsonb_build_object('kind', 'guide', 'name', 'Test Failed Guide', 'subcategory', (select s from sub),
  'area', 'Brevard', 'description', 'A guide whose site is gone.', 'source_url', 'https://gone.example.org', 'verification', 'failed'));

-- PT-237 to PT-240: a group find with events that each need repair.
select research.add_candidate(jsonb_build_object('kind', 'group', 'name', 'Test Repair Club', 'subcategory', (select s from sub),
  'area', 'Durango', 'description', 'A club whose events need repair.', 'source_url', 'https://repair.example.org',
  'verification', 'verified', 'events', jsonb_build_array(
    jsonb_build_object('title', 'No Verification Ride', 'starts_at', (now() + interval '9 days')::text, 'timezone', 'America/Denver',
      'location_name', 'Trailhead', 'source_url', 'https://repair.example.org/a'),
    jsonb_build_object('title', 'Local Time Ride', 'starts_at', '2030-03-12T09:00', 'timezone', 'America/Denver',
      'location_name', 'Trailhead', 'source_url', 'https://repair.example.org/b', 'verification', 'verified'),
    jsonb_build_object('title', 'Bad Zone Ride', 'starts_at', (now() + interval '10 days')::text, 'timezone', 'Mountain Time',
      'location_name', 'Trailhead', 'source_url', 'https://repair.example.org/c', 'verification', 'verified'),
    jsonb_build_object('title', 'Same End Ride', 'starts_at', '2030-03-13T09:00:00-06:00', 'ends_at', '2030-03-13T09:00:00-06:00',
      'timezone', 'America/Denver', 'location_name', 'Trailhead', 'source_url', ' not a link ', 'verification', 'verified'))));

create temporary table ids as
select (select id from research.candidates where name = 'Test Skip Company') as skip_id,
       (select id from research.candidates where name = 'Test Listed Races') as races_id,
       (select id from research.candidates where name = 'Test Failed Guide') as failed_id,
       (select id from research.candidates where name = 'Test Repair Club') as club_id,
       (select id from public.regions where status = 'live' order by sort_order limit 1) as rid;
grant select on ids to authenticated;

-- PT-237: an event sent without a verification is stored as unverified.
select is((select verification from research.candidate_events where title = 'No Verification Ride'), 'unverified',
  'PT-237 an event without a verification is unverified');

-- PT-238: a start without an offset is read in the event's time zone.
select is((select starts_at from research.candidate_events where title = 'Local Time Ride'), '2030-03-12 15:00:00+00'::timestamptz,
  'PT-238 9:00 in Denver (daylight time), not 9:00 UTC');

-- PT-239: an unknown zone is kept, unverified, with a note.
select is((select verification || ':' || (note like '%Unknown time zone%')::text from research.candidate_events where title = 'Bad Zone Ride'),
  'unverified:true', 'PT-239 an unknown time zone is kept as unverified with a note');

-- PT-240: an end equal to the start is dropped; a bad link falls back to the find's.
select is((select coalesce(ends_at::text, 'none') || ' ' || source_url from research.candidate_events where title = 'Same End Ride'),
  'none https://repair.example.org', 'PT-240 the end is dropped and the link repaired, not the whole find');

select tests.as('siteadmin');
select lives_ok($$ select public.list_candidate((select club_id from ids), (select rid from ids)) $$,
  'PT-239 the group lists despite a bad-zone event');
select tests.as_admin();
select is(array(select title from public.events where group_id = (select group_id from research.candidates where name = 'Test Repair Club') order by title),
  array['Local Time Ride', 'Same End Ride'], 'PT-237 PT-239 only verified events with real zones are published');

-- PT-236: Skip works on an event company.
select tests.as('siteadmin');
select lives_ok($$ select public.skip_business_candidate((select skip_id from ids)) $$, 'PT-236 the site admin skips an event company');

-- PT-242: a failed find can't be listed by id.
select throws_ok($$ select public.list_business_candidate((select failed_id from ids), (select rid from ids)) $$,
  null, null, 'PT-242 a failed find cannot be listed');

-- PT-241: a listed business takes new events from its own site or a registration site only.
select public.list_business_candidate((select races_id from ids), (select rid from ids));
select tests.as_admin();
select is(research.add_candidate(jsonb_build_object('kind', 'company', 'name', 'Test Listed Races', 'subcategory', (select s from sub),
  'area', 'Brevard', 'description', 'Again.', 'source_url', 'https://races.example.org',
  'events', jsonb_build_array(
    jsonb_build_object('title', 'Own Site Race', 'starts_at', (now() + interval '20 days')::text, 'timezone', 'America/New_York',
      'location_name', 'Downtown', 'source_url', 'https://races.example.org/own', 'verification', 'verified'),
    jsonb_build_object('title', 'Registration Race', 'starts_at', (now() + interval '21 days')::text, 'timezone', 'America/New_York',
      'location_name', 'Downtown', 'source_url', 'https://runsignup.com/Race/NC/Brevard/TestRace', 'verification', 'verified'),
    jsonb_build_object('title', 'Aggregator Race', 'starts_at', (now() + interval '22 days')::text, 'timezone', 'America/New_York',
      'location_name', 'Downtown', 'source_url', 'https://somecalendar.example.com/race', 'verification', 'verified')))) ->> 'events',
  '2', 'PT-241 two of three events are published');
select ok(not exists (select 1 from public.business_events where title = 'Aggregator Race'),
  'PT-241 an event from another site is kept in the research, not published');
select ok(exists (select 1 from research.candidate_events where title = 'Aggregator Race'),
  'PT-241 the aggregator event is still kept');

-- event_listings carries the subcategory for subcategory pages.
select tests.as_anon();
select ok((select bool_and(subcategory_id is not null) from public.event_listings), 'PT-241 every listed event has a subcategory');
select ok(exists (select 1 from public.event_listings where title = 'Own Site Race'
  and subcategory_id = (select id from public.subcategories where slug = (select s from sub))),
  'PT-241 a business event carries its host''s subcategory');

select * from finish();
rollback;
