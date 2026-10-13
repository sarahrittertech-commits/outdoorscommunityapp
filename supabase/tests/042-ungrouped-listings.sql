-- Listings with no area yet (UC-41). PT-257 to PT-259.
begin;
select plan(9);
select tests.build_fixture();

select tests.as_admin();
create temporary table sub as select (select slug from public.subcategories order by sort_order, slug limit 1) as s;
grant select on sub to anon, authenticated;
select research.add_candidate(jsonb_build_object('kind', 'group', 'name', 'Faraway Hiking Club', 'subcategory', (select s from sub),
  'area', 'Austin, TX', 'description', 'A club far from any open area.', 'source_url', 'https://faraway.example.org',
  'verification', 'verified', 'out_of_region', true));
select research.add_candidate(jsonb_build_object('kind', 'guide', 'name', 'Faraway Guides', 'subcategory', (select s from sub),
  'area', 'Austin, TX', 'description', 'A guide far from any open area.', 'source_url', 'https://guides.faraway.example.org',
  'verification', 'verified', 'out_of_region', true));
create temporary table ids as
select (select id from research.candidates where name = 'Faraway Hiking Club') as club,
       (select id from research.candidates where name = 'Faraway Guides') as guide,
       (select slug from public.regions where status = 'live' order by sort_order limit 1) as live_slug;
grant select on ids to anon, authenticated;

-- PT-257: only the site admin lists a find with no area.
select tests.as('member');
select throws_ok($$ select public.list_ungrouped_candidate((select club from ids)) $$, null, null,
  'PT-257 a member cannot list a find with no area');
select tests.as('siteadmin');
select is(public.list_ungrouped_candidate((select club from ids)), 'faraway-hiking-club', 'PT-257 the site admin lists the club with no area');
select is(public.list_ungrouped_candidate((select guide from ids)), 'faraway-guides', 'PT-257 and the guide');

-- PT-258: visitors find them, with no area.
select tests.as_anon();
select is((select region_id from public.group_listings where slug = 'faraway-hiking-club'), null::uuid,
  'PT-258 visitors see the club, in no area');
select is((select count(*)::integer from public.business_listings where slug = 'faraway-guides' and region_id is null), 1,
  'PT-258 and the guide in Guides and shops');

-- PT-259: an organizer's own group still needs a live area; only the site admin assigns one later.
-- Listing above switched on research listing for this transaction; a real
-- request starts without it.
select set_config('branch.operator_listing', '', true);
select tests.as('owner');
select throws_ok($$ update public.groups set region_id = null where id = tests.id('g1') $$,
  null, null, 'PT-259 an owner cannot take their group out of every area');
select tests.as('member');
select throws_ok($$ select public.assign_area('group', 'faraway-hiking-club', (select live_slug from ids)) $$, null, null,
  'PT-259 a member cannot assign an area');
select tests.as('siteadmin');
select lives_ok($$ select public.assign_area('group', 'faraway-hiking-club', (select live_slug from ids)) $$,
  'PT-259 the site admin assigns an area');
select is((select r.slug from public.groups g join public.regions r on r.id = g.region_id where g.slug = 'faraway-hiking-club'),
  (select live_slug from ids), 'PT-259 and the club is in it');

select * from finish();
rollback;
