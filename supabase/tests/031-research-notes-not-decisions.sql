-- FR-RS-10 (11 October 2026): an exact name match with the research tables
-- comes in as a candidate flagged as a possible duplicate, not dropped.
begin;
select plan(4);
select tests.build_fixture();

insert into research.organizations (org_id, name, org_type, status, activities, area, website, source)
values ('ORG-T1', 'Old Fort Test Riders', 'Women''s MTB club', 'Active', array['mountain_biking'], 'Old Fort', 'https://oftr.example.org', 'test');

select tests.as_admin();
create temporary table finds as
select (select slug from public.subcategories order by sort_order, slug limit 1) as sub;

select is(
  research.add_candidate(jsonb_build_object(
    'kind', 'group', 'name', 'Old Fort Test Riders', 'subcategory', (select sub from finds),
    'area', 'Old Fort', 'description', 'A find that matches a research row.', 'source_url', 'https://oftr.example.org',
    'affinity_tags', jsonb_build_array('women'))) ->> 'result',
  'added',
  'PT-40b an exact match with a research note is added as a candidate'
);
select is(
  (select status from research.candidates where name = 'Old Fort Test Riders'), 'new',
  'PT-40b it waits for the site admin'
);
select is(
  (select possible_duplicate_of from research.candidates where name = 'Old Fort Test Riders'), 'Old Fort Test Riders',
  'PT-40b and is flagged as a possible duplicate of the research row'
);
update research.candidates set status = 'skipped' where name = 'Old Fort Test Riders';
select is(
  research.add_candidate(jsonb_build_object(
    'kind', 'group', 'name', 'Old Fort Test Riders', 'subcategory', (select sub from finds),
    'area', 'Old Fort', 'description', 'The same find again.', 'source_url', 'https://oftr.example.org')) ->> 'result',
  'duplicate',
  'PT-40b once the site admin has decided, the same name is dropped silently'
);

select * from finish();
rollback;
