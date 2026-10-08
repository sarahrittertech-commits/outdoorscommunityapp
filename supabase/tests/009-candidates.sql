-- Research candidates and affinity tags: FR-RS-2 to FR-RS-9, FR-GR-11.
begin;
select plan(29);
select tests.build_fixture();

-- Affinity tags (FR-GR-11) --------------------------------------------------
select tests.as('owner');
select lives_ok(
  format($$ update public.groups set affinity_tags = '{women,lgbtqia}' where id = %L $$, tests.id('g1')),
  'FR-GR-11 owners set affinity tags'
);
select throws_ok(
  format($$ update public.groups set affinity_tags = '{ninjas}' where id = %L $$, tests.id('g1')),
  '23514', null, 'FR-GR-11 only tags on the list are allowed'
);
select tests.as('member');
update public.groups set affinity_tags = '{youth}' where id = tests.id('g1');
select is((select affinity_tags from public.groups where id = tests.id('g1')), '{women,lgbtqia}'::text[],
  'FR-GR-11 members cannot change tags');
select tests.as_anon();
select is((select affinity_tags from public.group_listings where slug = 'g1'), '{women,lgbtqia}'::text[],
  'FR-GR-11 visitors see a group''s tags');

-- The agent's way in (FR-RS-2, FR-RS-3, FR-RS-9) ---------------------------
select tests.as('outsider');
select throws_ok($$ select research.add_candidate('{}'::jsonb) $$, '42501', null,
  'FR-RS-9 signed-in users cannot add candidates');
select throws_ok($$ select count(*) from research.candidates $$, '42501', null,
  'FR-RS-5 signed-in users cannot read candidates');

select tests.as_admin();
create temporary table finds as
select (select slug from public.subcategories order by sort_order, slug limit 1) as sub;

select is(
  research.add_candidate(jsonb_build_object(
    'kind', 'group', 'name', 'River Rats Paddle Club', 'subcategory', (select sub from finds),
    'area', 'Brevard', 'description', 'A paddling club found on its public page.',
    'source_url', 'https://riverrats.example.org', 'affinity_tags', '["women"]'::jsonb,
    'events', jsonb_build_array(
      jsonb_build_object('title', 'Saturday float', 'starts_at', now() + interval '5 days',
                         'location_name', 'Hap Simpson Park', 'source_url', 'https://riverrats.example.org/float'),
      jsonb_build_object('title', 'Last month''s float', 'starts_at', now() - interval '30 days',
                         'location_name', 'Hap Simpson Park', 'source_url', 'https://riverrats.example.org/old')
    ))) ->> 'result',
  'added', 'FR-RS-2 the agent adds a group candidate'
);
select is((select count(*)::int from research.candidate_events), 1, 'FR-RS-4 past events are not saved');
select is(
  research.add_candidate(jsonb_build_object(
    'kind', 'group', 'name', 'river rats paddle club', 'subcategory', (select sub from finds),
    'area', 'Brevard', 'description', 'The same club, found again.',
    'source_url', 'https://riverrats.example.org')) ->> 'result',
  'updated', 'FR-RS-3 finding a waiting candidate again adds no new candidate'
);
select is((select count(*)::int from research.candidates), 1, 'FR-RS-3 no duplicate candidate');
select is(
  research.add_candidate(jsonb_build_object(
    'kind', 'group', 'name', 'Group One', 'subcategory', (select sub from finds),
    'area', 'Brevard', 'description', 'Already a group on the board.',
    'source_url', 'https://g1.example.org')) ->> 'result',
  'duplicate', 'FR-RS-3 a group already on the board is not suggested'
);
select throws_ok(
  $$ select research.add_candidate(jsonb_build_object('kind', 'group', 'name', 'No Link Club', 'subcategory', (select sub from finds),
       'area', 'Brevard', 'description', 'Missing its source link.')) $$,
  '23502', null, 'FR-RS-9 a candidate needs a source link'
);
select throws_ok(
  $$ select research.add_candidate(jsonb_build_object('kind', 'group', 'name', 'Bad Activity Club', 'subcategory', 'underwater-basket-weaving',
       'area', 'Brevard', 'description', 'Not an activity on the board.', 'source_url', 'https://x.example.org')) $$,
  'P0001', 'unknown subcategory: underwater-basket-weaving', 'FR-RS-9 the activity must be one on the board'
);
select throws_ok(
  $$ select research.add_candidate(jsonb_build_object('kind', 'group', 'name', 'Tagged Club', 'subcategory', (select sub from finds),
       'area', 'Brevard', 'description', 'A tag that is not on the list.', 'source_url', 'https://x.example.org',
       'affinity_tags', '["ninjas"]'::jsonb)) $$,
  '23514', null, 'FR-RS-9 candidate tags must be on the list'
);
select is(
  research.add_candidate(jsonb_build_object(
    'kind', 'business', 'name', 'Pisgah Paddle Rentals', 'subcategory', (select sub from finds),
    'area', 'Brevard', 'description', 'A boat rental shop.', 'source_url', 'https://rentals.example.com')) ->> 'result',
  'added', 'FR-RS-2 the agent saves businesses too'
);

-- The site admin's review (FR-RS-5, FR-RS-6) -------------------------------
select tests.remember('cand', (select id from research.candidates where kind = 'group'));
select tests.as_anon();
select throws_ok($$ select * from public.admin_candidates() $$, '42501', null, 'FR-RS-5 visitors cannot see candidates');
select tests.as('outsider');
select throws_ok($$ select * from public.admin_candidates() $$, 'P0001',
  'not_allowed: Only the site admin can see candidates.', 'FR-RS-5 users cannot see candidates');
select throws_ok(
  format($$ select public.list_candidate(%L) $$, tests.id('cand')),
  'P0001', 'not_allowed: Only the site admin can list candidates.', 'FR-RS-6 users cannot list a candidate'
);

select tests.as('siteadmin');
select is((select count(*)::int from public.admin_candidates()), 1, 'FR-RS-5 the site admin sees new group candidates only');
select is((select upcoming_events from public.admin_candidates()), 1, 'FR-RS-5 with their number of upcoming events');
select is((select kept from public.admin_candidate_counts() where kind = 'business'), 1,
  'FR-RS-5 businesses are counted as kept');

select tests.as('siteadmin');
select is(public.list_candidate(tests.id('cand')), 'river-rats-paddle-club', 'FR-RS-6 the site admin lists a candidate');
select is(
  (select is_unclaimed and source_url = 'https://riverrats.example.org' and affinity_tags = '{women}'
     from public.groups where slug = 'river-rats-paddle-club'),
  true, 'FR-RS-6 it becomes an unclaimed listing with its link and tags'
);
select is(
  (select count(*)::int from public.events e join public.groups g on g.id = e.group_id where g.slug = 'river-rats-paddle-club'),
  1, 'FR-RS-6 with its upcoming events'
);
select throws_ok(format($$ select public.list_candidate(%L) $$, tests.id('cand')),
  'P0001', 'not_found: No new group candidate with that id.', 'FR-RS-6 a candidate is listed once');

-- New events for a listed group (FR-RS-8) ----------------------------------
select tests.as_admin();
select is(
  research.add_candidate(jsonb_build_object(
    'kind', 'group', 'name', 'River Rats Paddle Club', 'subcategory', (select sub from finds),
    'area', 'Brevard', 'description', 'Found again with a new trip.', 'source_url', 'https://riverrats.example.org',
    'events', jsonb_build_array(jsonb_build_object('title', 'Moonlight paddle', 'starts_at', now() + interval '12 days',
      'location_name', 'Lake Julia', 'source_url', 'https://riverrats.example.org/moon')))) ->> 'events',
  '1', 'FR-RS-8 new events reach a group that is still unclaimed'
);
update public.groups set is_unclaimed = false where slug = 'river-rats-paddle-club';
select is(
  research.add_candidate(jsonb_build_object(
    'kind', 'group', 'name', 'River Rats Paddle Club', 'subcategory', (select sub from finds),
    'area', 'Brevard', 'description', 'Found again after being claimed.', 'source_url', 'https://riverrats.example.org',
    'events', jsonb_build_array(jsonb_build_object('title', 'Owner-run trip', 'starts_at', now() + interval '20 days',
      'location_name', 'Lake Julia', 'source_url', 'https://riverrats.example.org/owner')))) ->> 'result',
  'duplicate', 'FR-RS-8 once claimed, the agent adds no events'
);

-- Skipping ------------------------------------------------------------------
select research.add_candidate(jsonb_build_object(
  'kind', 'group', 'name', 'Not Really A Club', 'subcategory', (select sub from finds),
  'area', 'Asheville', 'description', 'Turns out to be a shop.', 'source_url', 'https://shop.example.com'));
select tests.as('siteadmin');
select lives_ok(
  format($$ select public.skip_candidate(%L) $$, (select c.id from public.admin_candidates() c where c.name = 'Not Really A Club')),
  'FR-RS-6 the site admin skips a candidate'
);
select tests.as_admin();
select is(
  research.add_candidate(jsonb_build_object(
    'kind', 'group', 'name', 'Not Really A Club', 'subcategory', (select sub from finds),
    'area', 'Asheville', 'description', 'Found again next week.', 'source_url', 'https://shop.example.com')) ->> 'result',
  'duplicate', 'FR-RS-3 a skipped candidate is never suggested again'
);

select * from finish();
rollback;
