-- Big regions over local areas (UC-40). PT-253, PT-254.
begin;
select plan(4);
select tests.build_fixture();

-- PT-253: anyone reads the big regions; nobody but a migration changes them.
select tests.as_anon();
select is((select count(*)::integer from public.region_groups), 8, 'PT-253 visitors read the eight big regions');
select tests.as('siteadmin');
select throws_ok($$ insert into public.region_groups (slug, name) values ('plains', 'Plains') $$, '42501', null,
  'PT-253 not even the site admin adds a big region outside a migration');
select throws_ok($$ update public.region_groups set name = 'Elsewhere' where slug = 'southeast' $$, '42501', null,
  'PT-253 nor renames one');

-- PT-254: every live area sits in a big region.
select tests.as_admin();
select is((select count(*)::integer from public.regions where status = 'live' and slug <> 'test-soon' and group_id is null), 0,
  'PT-254 every live area has a big region');

select * from finish();
rollback;
