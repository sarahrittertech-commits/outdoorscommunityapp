-- Regions ("go national", approved 11 October 2026). PT-210 to PT-219.
begin;
select plan(43);
select tests.build_fixture();

create function pg_temp.region(p_slug text) returns uuid
language sql stable as $$ select id from public.regions where slug = p_slug $$;

-- Pin the fixture groups to the default region, and add a region that isn't
-- open yet (the migration adds none).
select tests.as_admin();
update public.groups set region_id = pg_temp.region('western-nc') where slug in ('g1', 'g2', 'g3');
insert into public.regions (slug, name, timezone, center_lat, center_lng, state, status, sort_order)
values ('test-soon', 'Coming Soon Test', 'America/Chicago', 41.88, -87.63, 'IL', 'coming_soon', 99);

-- PT-210  Anyone can read the regions -------------------------------------
select tests.as_anon();
select is(
  array(select slug from public.regions where status = 'live' order by sort_order),
  array['western-nc', 'front-range', 'triangle', 'puget-sound', 'new-river-gorge', 'east-tennessee', 'wasatch', 'reno-tahoe', 'sedona-flagstaff', 'upstate-sc'],
  'PT-210 visitors read the live regions, in order'
);
select is(
  (select hub_towns from public.regions where slug = 'puget-sound'), '{Seattle,Bellingham}'::text[],
  'PT-210 visitors read a region''s hub towns'
);
select is((select status from public.regions where slug = 'test-soon'), 'coming_soon',
  'PT-210 visitors see regions that are coming soon too');

-- PT-211  Nobody changes regions from the app ------------------------------
select throws_ok(
  $$ insert into public.regions (slug, name, timezone, center_lat, center_lng) values ('x', 'X', 'UTC', 0, 0) $$,
  '42501', null, 'PT-211 visitors cannot add a region'
);
select tests.as('siteadmin');
select throws_ok(
  $$ insert into public.regions (slug, name, timezone, center_lat, center_lng) values ('x', 'X', 'UTC', 0, 0) $$,
  '42501', null, 'PT-211 not even the site admin adds a region from the app'
);
select throws_ok(
  $$ update public.regions set status = 'coming_soon' where slug = 'triangle' $$,
  '42501', null, 'PT-211 nobody changes a region from the app'
);
select throws_ok(
  $$ delete from public.regions where slug = 'test-soon' $$,
  '42501', null, 'PT-211 nobody deletes a region from the app'
);

-- PT-212  The columns and the launch regions -------------------------------
select tests.as_admin();
select has_column('public', 'regions', 'center_lat', 'PT-212 regions have a center latitude');
select has_column('public', 'regions', 'center_lng', 'PT-212 regions have a center longitude');
select col_not_null('public', 'regions', 'center_lat', 'PT-212 the center is required');
select col_default_is('public', 'regions', 'radius_miles', '100', 'PT-212 the radius defaults to 100 miles');
select col_default_is('public', 'regions', 'status', 'live'::text, 'PT-212 a region is live by default');
select has_column('public', 'regions', 'sort_order', 'PT-212 regions have a sort order');
select has_column('public', 'regions', 'state', 'PT-212 regions have a state');
select is(
  (select center_lat::text || ',' || center_lng::text || '|' || state || '|' || array_to_string(hub_towns, ';') || '|' || timezone
     from public.regions where slug = 'western-nc'),
  '35.60,-82.55|NC|Asheville|America/New_York',
  'PT-212 western-nc is filled in'
);
select is(
  array(select slug || ':' || timezone from public.regions where slug <> 'test-soon' order by slug),
  array['east-tennessee:America/New_York', 'front-range:America/Denver', 'new-river-gorge:America/New_York',
        'puget-sound:America/Los_Angeles', 'reno-tahoe:America/Los_Angeles', 'sedona-flagstaff:America/Phoenix', 'triangle:America/New_York', 'upstate-sc:America/New_York', 'wasatch:America/Denver', 'western-nc:America/New_York'],
  'PT-212 the five new regions carry their time zones'
);
select is((select hub_towns from public.regions where slug = 'new-river-gorge'), '{"Fayetteville, WV"}'::text[],
  'PT-212 a hub town whose name is used in two states carries its state');
select throws_ok(
  $$ update public.regions set radius_miles = 5 where slug = 'triangle' $$,
  '23514', null, 'PT-212 a radius under 10 miles is refused'
);
select throws_ok(
  $$ update public.regions set status = 'closed' where slug = 'triangle' $$,
  '23514', null, 'PT-212 status is live or coming_soon'
);

-- PT-213  event_listings carries the region --------------------------------
select is(
  (select attname::text from pg_attribute where attrelid = 'public.event_listings'::regclass and attnum = 20),
  'region_id', 'PT-213 region_id is appended to event_listings (UC-37 appends more after it)'
);
select is(
  (select count(*)::int from pg_attribute where attrelid = 'public.event_listings'::regclass and attnum > 0), 25,
  'PT-213 and every earlier column is still there (20, plus five UC-37 host columns)'
);
update public.groups set region_id = pg_temp.region('triangle') where slug = 'g1';
select tests.as_anon();
select is(
  (select bool_and(region_id = pg_temp.region('triangle')) from public.event_listings where group_slug = 'g1'), true,
  'PT-213 an event''s region is its group''s region'
);
select is(
  (select count(*)::int from public.event_listings where region_id = pg_temp.region('western-nc') and group_slug = 'g1'), 0,
  'PT-213 filtering by region leaves out other regions'' events'
);

-- PT-214  Group counts per region ------------------------------------------
-- g1 is in triangle; g2 and g3 in western-nc. One more western-nc group is
-- archived and one is waiting for review: neither counts.
select tests.as_admin();
insert into public.groups (slug, name, description, subcategory_id, region_id, area, join_policy, created_by)
select 'g-archived', 'Archived Group', 'An archived test group.', subcategory_id, pg_temp.region('western-nc'), 'Brevard', 'open', tests.uid('owner')
from public.groups where slug = 'g2';
update public.groups set status = 'archived' where slug = 'g-archived';
insert into public.groups (slug, name, description, subcategory_id, region_id, area, join_policy, created_by)
select 'g-waiting', 'Waiting Group', 'A test group waiting for review.', subcategory_id, pg_temp.region('western-nc'), 'Brevard', 'open', tests.uid('owner')
from public.groups where slug = 'g2';
update public.groups set review_status = 'pending' where slug = 'g-waiting';

create temporary table fixture_sub as select subcategory_id as id from public.groups where slug = 'g1';
-- Expected counts, worked out from the table as the site admin, so the test
-- holds whether or not the local demo seed (supabase/seed.sql) is loaded.
create temporary table fixture_expect as
select r.slug,
       count(g.id) filter (where g.status = 'active' and g.review_status = 'approved')::int as active_approved,
       count(g.id)::int as all_groups
from public.regions r
left join public.groups g on g.region_id = r.id and g.subcategory_id = (select id from fixture_sub)
group by r.slug;
grant select on fixture_sub, fixture_expect to anon, authenticated;
select tests.as_anon();
select is(
  (select group_count from public.subcategory_region_counts
    where region_slug = 'western-nc' and subcategory_id = (select id from fixture_sub)),
  (select active_approved from fixture_expect where slug = 'western-nc'),
  'PT-214 counts only active, approved groups in the region'
);
select ok(
  (select all_groups - active_approved from fixture_expect where slug = 'western-nc') >= 2,
  'PT-214 the archived and waiting groups are there, and left out of the count'
);
select is(
  (select group_count from public.subcategory_region_counts
    where region_slug = 'triangle' and subcategory_id = (select id from fixture_sub)),
  (select active_approved from fixture_expect where slug = 'triangle'),
  'PT-214 a group counts in its own region only'
);
select is(
  (select count(*)::int from public.subcategory_region_counts where region_slug = 'puget-sound'),
  (select count(*)::int from public.subcategories),
  'PT-214 every subcategory has a row in every region, zero included'
);
select is(
  (select sum(group_count)::int from public.subcategory_region_counts),
  (select sum(group_count)::int from public.subcategory_group_counts),
  'PT-214 the region counts add up to the board-wide counts'
);

-- PT-215  Listing a candidate in a chosen region ---------------------------
select tests.as_admin();
select research.add_candidate(jsonb_build_object(
  'kind', 'group', 'name', 'Galbraith Riders', 'subcategory', (select slug from public.subcategories order by sort_order, slug limit 1),
  'area', 'Bellingham', 'description', 'A mountain bike club.', 'source_url', 'https://galbraith.example.org'));
select research.add_candidate(jsonb_build_object(
  'kind', 'group', 'name', 'Default Region Club', 'subcategory', (select slug from public.subcategories order by sort_order, slug limit 1),
  'area', 'Brevard', 'description', 'Listed with no region chosen.', 'source_url', 'https://default.example.org'));
select tests.remember('cand-wa', (select id from research.candidates where name = 'Galbraith Riders'));
select tests.remember('cand-default', (select id from research.candidates where name = 'Default Region Club'));

select tests.as('owner');
select throws_ok(
  format($$ select public.list_candidate(%L, %L) $$, tests.id('cand-wa'), pg_temp.region('puget-sound')),
  'P0001', 'not_allowed: Only the site admin can list candidates.', 'PT-215 only the site admin lists a candidate'
);
select tests.as('siteadmin');
select throws_ok(
  format($$ select public.list_candidate(%L, %L) $$, tests.id('cand-wa'), pg_temp.region('test-soon')),
  'P0001', 'region_closed: Groups can only be listed in a live region.', 'PT-215 a region that is coming soon is refused'
);
select throws_ok(
  format($$ select public.list_candidate(%L, %L) $$, tests.id('cand-wa'), gen_random_uuid()),
  'P0001', 'region_closed: Groups can only be listed in a live region.', 'PT-215 an unknown region is refused'
);
select is(
  public.list_candidate(tests.id('cand-wa'), pg_temp.region('puget-sound')), 'galbraith-riders',
  'PT-215 the site admin lists a candidate in a region'
);
select is(
  (select region_id from public.groups where slug = 'galbraith-riders'), pg_temp.region('puget-sound'),
  'PT-215 the listing is in the chosen region'
);
select public.list_candidate(tests.id('cand-default'));
select is(
  (select region_id from public.groups where slug = 'default-region-club'), pg_temp.region('western-nc'),
  'PT-215 with no region, the listing goes in the first live region'
);

-- PT-216  Owners and page admins move their group between live regions ------
select tests.as('owner');
select lives_ok(
  format($$ update public.groups set region_id = %L where id = %L $$, pg_temp.region('east-tennessee'), tests.id('g3')),
  'PT-216 the owner moves their group to another live region'
);
select is((select region_id from public.groups where id = tests.id('g3')), pg_temp.region('east-tennessee'),
  'PT-216 the group is in its new region');
select tests.as('admin');
select lives_ok(
  format($$ update public.groups set region_id = %L where id = %L $$, pg_temp.region('front-range'), tests.id('g1')),
  'PT-216 a page admin moves the group too'
);
select tests.as('owner');
select throws_ok(
  format($$ update public.groups set region_id = %L where id = %L $$, pg_temp.region('test-soon'), tests.id('g3')),
  'P0001', 'region_closed: Groups can only be in a live region.', 'PT-216 not to a region that is coming soon'
);

-- PT-217  Others cannot move a group ----------------------------------------
select tests.as('member');
update public.groups set region_id = pg_temp.region('triangle') where id = tests.id('g3');
select tests.as('outsider');
update public.groups set region_id = pg_temp.region('triangle') where id = tests.id('g3');
select tests.as_admin();
select is((select region_id from public.groups where id = tests.id('g3')), pg_temp.region('east-tennessee'),
  'PT-217 members and outsiders cannot move a group');

-- PT-218  New groups go in a live region ------------------------------------
select tests.as('outsider');
select throws_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by)
            values ('soon-group', 'Soon Group', 'A group in a region not open yet.', %L, %L, 'Chicago', %L) $$,
         (select id from fixture_sub), pg_temp.region('test-soon'), tests.uid('outsider')),
  'P0001', 'region_closed: Groups can only be in a live region.', 'PT-218 a new group cannot start in a region that is coming soon'
);
select lives_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by)
            values ('rainier-hikers', 'Rainier Hikers', 'Hikes on the slopes of Mount Rainier.', %L, %L, 'Seattle', %L) $$,
         (select id from fixture_sub), pg_temp.region('puget-sound'), tests.uid('outsider')),
  'PT-218 a new group starts in any live region'
);

-- PT-219  A group in a region that closes keeps working ---------------------
select tests.as_admin();
update public.regions set status = 'coming_soon' where slug = 'east-tennessee';
select tests.as('owner');
select lives_ok(
  format($$ update public.groups set name = 'Group Three, renamed' where id = %L $$, tests.id('g3')),
  'PT-219 a group in a region that closed can still be edited'
);
select lives_ok(
  format($$ update public.groups set region_id = %L where id = %L $$, pg_temp.region('western-nc'), tests.id('g3')),
  'PT-219 and moved back to a live region'
);

select * from finish();
rollback;
