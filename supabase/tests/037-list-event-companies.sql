-- Event companies list as companies (12 October 2026). PT-235.
begin;
select plan(3);
select tests.build_fixture();
select tests.as_admin();
create temporary table sub as select (select slug from public.subcategories order by sort_order, slug limit 1) as s;
select research.add_candidate(jsonb_build_object('kind', 'company', 'name', 'Test Race Company', 'subcategory', (select s from sub),
  'area', 'Brevard', 'description', 'A race organizer for tests.', 'source_url', 'https://race.example.org',
  'verification', 'verified'));
create temporary table co as
select (select id from research.candidates where name = 'Test Race Company') as cid,
       (select id from public.regions where status = 'live' order by sort_order limit 1) as rid;
grant select on co to authenticated;

select tests.as('siteadmin');
-- PT-235: the site admin sees a race company with the other candidates and lists it as an event company.
select ok(exists (select 1 from public.admin_business_candidates() where name = 'Test Race Company'),
  'PT-235 an event company appears among business candidates');
select lives_ok($$ select public.list_business_candidate((select cid from co), (select rid from co)) $$,
  'PT-235 the site admin lists an event company');
select is((select kind from public.businesses where name = 'Test Race Company'), 'company',
  'PT-235 it is listed as an event company, not a shop');

select * from finish();
rollback;
