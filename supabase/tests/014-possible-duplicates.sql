-- FR-RS-10: near matches are flagged for the site admin; exact matches are
-- still dropped silently (FR-RS-3).
begin;
select plan(13);
select tests.build_fixture();

select tests.as_admin();
create temporary table finds as
select (select slug from public.subcategories order by sort_order, slug limit 1) as sub;
create function pg_temp.find(p_name text, p_url text, p_kind text default 'group') returns jsonb
language sql as $$
  select research.add_candidate(jsonb_build_object(
    'kind', p_kind, 'name', p_name, 'subcategory', (select sub from finds),
    'area', 'Brevard', 'description', 'A find for the duplicate tests.', 'source_url', p_url))
$$;

select is(pg_temp.find('Pisgah Area SORBA', 'https://www.pisgahareasorba.org') ->> 'possible_duplicate', 'false',
  'A new find with nothing like it is not flagged');

select is(pg_temp.find('PISGAH AREA SORBA', 'https://elsewhere.example.org') ->> 'result', 'updated',
  'FR-RS-3 an exact name match (any case) is not a new candidate');

select is(pg_temp.find('Pisgah SORBA Club', 'https://pisgah-sorba.example.org') ->> 'possible_duplicate', 'true',
  'FR-RS-10 a similar name is flagged');
select is((select possible_duplicate_of from research.candidates where name = 'Pisgah SORBA Club'), 'Pisgah Area SORBA',
  'FR-RS-10 the flag names what it may duplicate');

select is(pg_temp.find('Trail Builders of Transylvania', 'https://pisgahareasorba.org/trailwork') ->> 'possible_duplicate', 'true',
  'FR-RS-10 the same website is flagged, whatever the name');

select is(pg_temp.find('Brevard Bouldering Crew', 'https://www.facebook.com/groups/brevardbouldering') ->> 'possible_duplicate', 'false',
  'FR-RS-10 a shared site like Facebook is not the same website');
select is(pg_temp.find('Asheville Night Riders', 'https://www.facebook.com/groups/ashevillenightriders') ->> 'possible_duplicate', 'false',
  'FR-RS-10 two different Facebook groups are not flagged as each other');

update public.groups set name = 'Brevard Saturday Paddlers' where id = tests.id('g1');
select is(pg_temp.find('Brevard Saturday Paddle Club', 'https://bsp.example.org') ->> 'possible_duplicate', 'true',
  'FR-RS-10 a find like a group already on the board is flagged');

select is(pg_temp.find('Brevard Saturday Paddlers', 'https://bsp-other.example.org') ->> 'result', 'duplicate',
  'FR-RS-3 an exact match with a board group is still dropped silently');

-- FR-RS-8 tightened: events for an unclaimed listing publish without review
-- only from a group find, and only with links on the listing's own website.
select tests.as_admin();
set local branch.operator_listing = 'on';
insert into public.groups (slug, name, description, subcategory_id, region_id, area, is_unclaimed, source_url, created_by)
select 'real-trail-club', 'Real Trail Club', 'An unclaimed listing for the tests.', s.id, r.id, 'Brevard', true,
       'https://www.realtrail.example.org', null
from public.subcategories s, public.regions r limit 1;
create function pg_temp.events_for(p_name text, p_kind text, p_event_url text) returns jsonb
language sql as $$
  select research.add_candidate(jsonb_build_object(
    'kind', p_kind, 'name', p_name, 'subcategory', (select sub from finds), 'area', 'Brevard',
    'description', 'Events for the listing tests.', 'source_url', 'https://realtrail.example.org',
    'events', jsonb_build_array(jsonb_build_object('title', 'Event from ' || p_event_url,
      'starts_at', now() + interval '3 days', 'location_name', 'Trailhead', 'source_url', p_event_url))))
$$;
select is(pg_temp.events_for('REAL TRAIL CLUB', 'group', 'https://attacker.example/phish') ->> 'events', '0',
  'An event linking off the listing''s own site is not published without review');
select is(pg_temp.events_for('Real Trail Club', 'business', 'https://realtrail.example.org/rides') ->> 'events', '0',
  'A find that is not a group never publishes events onto a listing');
select is(pg_temp.events_for('Real Trail Club', 'group', 'https://realtrail.example.org/rides') ->> 'events', '1',
  'FR-RS-8 an event on the listing''s own site is still published');

select tests.as('siteadmin');
select is(
  (select possible_duplicate_of from public.admin_candidates() where name = 'Pisgah SORBA Club'), 'Pisgah Area SORBA',
  'FR-RS-10 the site admin sees the flag on the admin list'
);

select * from finish();
rollback;
