-- Events from guides, shops and venues (UC-37).
begin;
select plan(10);
select tests.build_fixture();

select tests.as_admin();
insert into research.candidates (kind, name, subcategory_id, area, description, source_url, status)
values ('venue', 'Test Nature Center', (select id from public.subcategories order by sort_order, slug limit 1),
        'Brevard', 'A venue for tests.', 'https://venue.example.org', 'kept');
create temporary table ids as
select (select id from research.candidates where name = 'Test Nature Center') as venue,
       (select id from public.regions where status = 'live' order by sort_order limit 1) as live;
grant select on ids to anon, authenticated;

-- PT-225  A kept venue takes events from the research and lists as a venue
select is(
  research.add_candidate(jsonb_build_object(
    'kind', 'venue', 'name', 'Test Nature Center', 'subcategory', (select slug from public.subcategories order by sort_order, slug limit 1),
    'area', 'Brevard', 'description', 'A venue for tests.', 'source_url', 'https://venue.example.org',
    'events', jsonb_build_array(jsonb_build_object('verification', 'verified', 'title', 'Learn to Ride', 'starts_at', (now() + interval '3 days')::text,
      'timezone', 'America/New_York', 'location_name', 'The pump track', 'source_url', 'https://venue.example.org/learn')))) ->> 'result',
  'updated', 'PT-225 a kept venue keeps its new events while it waits');
select tests.as('siteadmin');
select is(public.list_business_candidate((select venue from ids), (select live from ids)), 'test-nature-center',
  'PT-225 the site admin lists it');
select is((select kind from public.businesses where slug = 'test-nature-center'), 'venue', 'PT-225 as a venue');

-- PT-226  Its events are public and in the one events list ---------------
select tests.as_anon();
select is((select count(*)::integer from public.business_events be join public.businesses b on b.id = be.business_id
           where b.slug = 'test-nature-center'), 1, 'PT-226 visitors see the venue''s event');
select is((select host_kind || ':' || business_slug from public.event_listings where title = 'Learn to Ride'),
  'venue:test-nature-center', 'PT-226 it is in event_listings with its host');

-- PT-227  Nobody writes these events directly ------------------------------
select throws_ok(
  format($$ insert into public.business_events (business_id, title, starts_at, ends_at, timezone, location_name, source_url)
            values (%L, 'Sneaky', now() + interval '1 day', now() + interval '2 days', 'UTC', 'Somewhere', 'https://x.example.org') $$,
         (select id from public.businesses where slug = 'test-nature-center')),
  '42501', null, 'PT-227 visitors cannot add an event');
select tests.as('member');
select throws_ok($$ update public.business_events set title = 'Changed' $$, '42501', null,
  'PT-227 members cannot change one');

-- PT-227b  An unknown time zone is refused (it would break every list) ----
select tests.as_admin();
select throws_ok(
  format($$ insert into public.business_events (business_id, title, starts_at, ends_at, timezone, location_name, source_url)
            values (%L, 'Bad zone', now() + interval '1 day', now() + interval '2 days', 'Mountain Time', 'Somewhere', 'https://x.example.org') $$,
         (select id from public.businesses where slug = 'test-nature-center')),
  'P0001', null, 'PT-227b a hosted event with an unknown time zone is refused');

-- PT-228  A later research find adds events to the listed venue -----------
select tests.as_admin();
select is(
  research.add_candidate(jsonb_build_object(
    'kind', 'venue', 'name', 'Test Nature Center', 'subcategory', (select slug from public.subcategories order by sort_order, slug limit 1),
    'area', 'Brevard', 'description', 'Again.', 'source_url', 'https://venue.example.org',
    'events', jsonb_build_array(jsonb_build_object('verification', 'verified', 'title', 'Owl Prowl', 'starts_at', (now() + interval '5 days')::text,
      'timezone', 'America/New_York', 'location_name', 'The meadow', 'source_url', 'https://venue.example.org/owls')))) ->> 'result',
  'events_added', 'PT-228 a listed venue takes new events');

-- PT-229  Removed listings take their events with them ---------------------
select tests.as('siteadmin');
select public.remove_business((select id from public.businesses where slug = 'test-nature-center'));
select tests.as_anon();
select is((select count(*)::integer from public.event_listings where title in ('Learn to Ride', 'Owl Prowl')), 0,
  'PT-229 a removed listing''s events leave the list');

select * from finish();
rollback;
