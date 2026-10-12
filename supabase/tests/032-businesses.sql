-- Guides and shops (UC-12, first part; FR-BZ-1, FR-BZ-2 listing, FR-BZ-7).
begin;
select plan(14);
select tests.build_fixture();

select tests.as_admin();
insert into public.regions (slug, name, timezone, center_lat, center_lng, state, status, sort_order)
values ('test-soon-bz', 'Coming Soon Test', 'America/Chicago', 41.88, -87.63, 'IL', 'coming_soon', 99);
insert into research.candidates (kind, name, subcategory_id, area, description, source_url, status, affinity_tags)
values
  ('guide', 'Test Climbing Guides', (select id from public.subcategories order by sort_order, slug limit 1),
   'Fayetteville, WV', 'A guide service for tests.', 'https://guides.example.org', 'kept', '{women}'),
  ('business', 'Test Gear Shop', (select id from public.subcategories order by sort_order, slug limit 1),
   'Brevard', 'A gear shop for tests.', 'https://shop.example.org', 'kept', '{}'),
  ('business', 'Test Closed Shop', (select id from public.subcategories order by sort_order, slug limit 1),
   'Brevard', 'A shop the admin skips.', 'https://closed.example.org', 'kept', '{}');
create temporary table ids as
select (select id from research.candidates where name = 'Test Climbing Guides') as guide,
       (select id from research.candidates where name = 'Test Gear Shop') as shop,
       (select id from research.candidates where name = 'Test Closed Shop') as closed,
       (select id from public.regions where status = 'live' order by sort_order limit 1) as live,
       (select id from public.regions where slug = 'test-soon-bz') as soon;
grant select on ids to anon, authenticated;

-- PT-220  Only the site admin sees the kept guides and shops ---------------
select tests.as('member');
select throws_ok($$ select * from public.admin_business_candidates() $$, 'P0001', null,
  'PT-220 a member cannot see the kept guides and shops');
select tests.as('siteadmin');
select ok((select count(*) from public.admin_business_candidates() where name like 'Test %') = 3,
  'PT-220 the site admin sees them');

-- PT-221  Only the site admin lists one, and only in a live region --------
select tests.as('member');
select throws_ok(format('select public.list_business_candidate(%L, %L)', (select guide from ids), (select live from ids)),
  'P0001', null, 'PT-221 a member cannot list a guide');
select tests.as('siteadmin');
select throws_ok(format('select public.list_business_candidate(%L, %L)', (select guide from ids), (select soon from ids)),
  'P0001', null, 'PT-221 not in a region that is coming soon');
select is(public.list_business_candidate((select guide from ids), (select live from ids)), 'test-climbing-guides',
  'PT-221 the site admin lists a guide');
select is(public.list_business_candidate((select shop from ids), (select live from ids)), 'test-gear-shop',
  'PT-221 and a shop');
select is((select kind from public.businesses where slug = 'test-climbing-guides'), 'guide',
  'PT-221 a kept guide becomes a guide listing, unclaimed, with its affinity tags');
select tests.as_admin();
select is((select status from research.candidates where id = (select shop from ids)), 'listed',
  'PT-221 the candidate is marked listed');

-- PT-222  Everyone reads active listings ----------------------------------
select tests.as_anon();
select is((select count(*)::integer from public.business_listings where slug in ('test-climbing-guides', 'test-gear-shop')), 2,
  'PT-222 visitors see the listings');

-- PT-223  Nobody writes listings directly ----------------------------------
select throws_ok($$ update public.businesses set name = 'Hijacked' $$, '42501', null,
  'PT-223 visitors cannot change a listing');
select tests.as('siteadmin');
select throws_ok(
  format($$ insert into public.businesses (slug, name, kind, description, subcategory_id, region_id, area, website)
            values ('x-shop', 'X Shop', 'shop', 'Straight in.', (select id from public.subcategories limit 1), %L, 'Brevard', 'https://x.example.org') $$,
         (select live from ids)),
  '42501', null, 'PT-223 not even the site admin inserts outside the listing function');

-- PT-224  Skipping and removing --------------------------------------------
select lives_ok(format('select public.skip_business_candidate(%L)', (select closed from ids)),
  'PT-224 the site admin skips a kept shop');
select lives_ok(format('select public.remove_business(%L)', (select id from public.businesses where slug = 'test-gear-shop')),
  'PT-224 and removes a listing');
select tests.as_anon();
select is((select count(*)::integer from public.business_listings where slug = 'test-gear-shop'), 0,
  'PT-224 a removed listing is gone from the board');

select * from finish();
rollback;
