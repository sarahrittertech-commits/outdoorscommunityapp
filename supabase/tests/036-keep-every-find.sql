-- Keep every find (12 October 2026). PT-231 to PT-234.
begin;
select plan(6);
select tests.build_fixture();
select tests.as_admin();
create temporary table sub as select (select slug from public.subcategories order by sort_order, slug limit 1) as s;

-- PT-231: a brand and a place are kept, with evidence, out of every queue.
select is(
  research.add_candidate(jsonb_build_object('kind', 'brand', 'name', 'Test Bike Brand', 'subcategory', (select s from sub),
    'area', 'Squamish', 'description', 'An independent bike brand for tests.', 'source_url', 'https://brand.example.org',
    'evidence', 'Possible demo-day partner', 'other_urls', jsonb_build_array('https://instagram.com/testbrand'))) ->> 'result',
  'added', 'PT-231 a brand find is stored');
select is((select status || ':' || verification from research.candidates where name = 'Test Bike Brand'), 'kept:unverified',
  'PT-231 kept, unverified, out of the review queue');

-- PT-232: a group that failed verification is kept, not queued.
select research.add_candidate(jsonb_build_object('kind', 'group', 'name', 'Test Dead Domain Club', 'subcategory', (select s from sub),
  'area', 'Somewhere', 'description', 'A club whose website does not exist.', 'source_url', 'https://dead.example.org',
  'verification', 'failed', 'evidence', 'Domain does not resolve'));
select is((select status from research.candidates where name = 'Test Dead Domain Club'), 'kept',
  'PT-232 a failed group find is kept, not put in the review queue');

-- PT-233: a date-only or unverified event is stored but never published.
select research.add_candidate(jsonb_build_object('kind', 'group', 'name', 'Test Festival Club', 'subcategory', (select s from sub),
  'area', 'Brevard', 'description', 'A club with a festival for tests.', 'source_url', 'https://fest.example.org',
  'verification', 'verified', 'events', jsonb_build_array(
    jsonb_build_object('title', 'Spring Festival', 'starts_at', (now() + interval '30 days')::text, 'timezone', 'America/New_York',
      'location_name', 'The park', 'source_url', 'https://fest.example.org/spring', 'date_only', true, 'note', 'No start time yet'),
    jsonb_build_object('title', 'Rumored Ride', 'starts_at', (now() + interval '10 days')::text, 'timezone', 'America/New_York',
      'location_name', 'The shop', 'source_url', 'https://fest.example.org/ride', 'verification', 'unverified'),
    jsonb_build_object('title', 'Real Ride', 'starts_at', (now() + interval '12 days')::text, 'timezone', 'America/New_York',
      'location_name', 'The shop', 'source_url', 'https://fest.example.org/real', 'verification', 'verified'))));
select is((select count(*)::integer from research.candidate_events e join research.candidates c on c.id = e.candidate_id
           where c.name = 'Test Festival Club'), 3, 'PT-233 all three events are stored');
create temporary table fest as
select (select id from research.candidates where name = 'Test Festival Club') as cid,
       (select id from public.regions where status = 'live' order by sort_order limit 1) as rid;
grant select on fest to authenticated;
select tests.as('siteadmin');
select public.list_candidate((select cid from fest), (select rid from fest));
select tests.as_admin();
select is(array(select title from public.events where group_id = (select group_id from research.candidates where name = 'Test Festival Club')),
  array['Real Ride'], 'PT-233 only the verified, timed event is published');

-- PT-234: a later find updates what we know about a kept candidate.
select research.add_candidate(jsonb_build_object('kind', 'brand', 'name', 'Test Bike Brand', 'subcategory', (select s from sub),
  'area', 'Squamish', 'description', 'An independent bike brand for tests.', 'source_url', 'https://brand.example.org',
  'verification', 'verified', 'evidence', 'Website checked; sells through local shops'));
select is((select verification from research.candidates where name = 'Test Bike Brand'), 'verified',
  'PT-234 a later find updates verification and evidence');

select * from finish();
rollback;
