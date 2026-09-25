-- Test helpers, installed once before the other test files run (files run in
-- name order, and this one commits).
--
-- tests.as('member')   act as a fixture user, the way the Supabase API would
-- tests.as_anon()      act as a signed-out visitor
-- tests.as_admin()     back to the database owner (bypasses RLS)
-- tests.build_fixture() creates the standard cast of users, groups, events
--                       and posts described in docs/test-cases.md
-- tests.uid('member'), tests.id('g1')  look up fixture ids by name

create extension if not exists pgtap with schema extensions;

begin;
select plan(1);

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create table if not exists tests.fixture_ids (
  name text primary key,
  id uuid not null
);
grant select on tests.fixture_ids to anon, authenticated;

create or replace function tests.id(p_name text) returns uuid
language sql stable as $$
  select id from tests.fixture_ids where name = p_name
$$;

create or replace function tests.uid(p_name text) returns uuid
language sql stable as $$
  select tests.id('user:' || p_name)
$$;

create or replace function tests.as(p_name text) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', tests.uid(p_name), 'role', 'authenticated')::text, true);
end
$$;

create or replace function tests.as_anon() returns void
language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
end
$$;

create or replace function tests.as_admin() returns void
language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end
$$;

-- Creates a signed-up user who has finished onboarding.
create or replace function tests.make_user(p_name text) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  insert into auth.users (email) values (p_name || '@example.test') returning id into v_id;
  update public.profiles set display_name = initcap(p_name) where id = v_id;
  update public.accounts set accepted_terms_at = now() where id = v_id;
  insert into tests.fixture_ids values ('user:' || p_name, v_id);
  return v_id;
end
$$;

create or replace function tests.remember(p_name text, p_id uuid) returns uuid
language sql as $$
  insert into tests.fixture_ids values (p_name, p_id) returning id
$$;

-- The standard cast. Built inside each test file's transaction, so it rolls
-- back with the file.
--
--   g1  open group, discussions on.   owner, admin, member, banned
--   g2  approval group.               owner2 (owner), pending (pending)
--   g3  open group, discussions off.  owner, member
--   e1  g1, public address, capacity 2, next week
--   e2  g1, members-only address, next week
--   e_past  g1, started yesterday
--   t1  g1 thread by member, with reply r1
--   t_locked  g1 locked thread
--   t3  g3 thread (discussions now off)
--   rep_thread  report on t1 (reaches g1 admins)
--   rep_group   report on g2 itself (site admin only)
--
-- Users with no group role: outsider, suspended, noterms, siteadmin.
create or replace function tests.build_fixture() returns void
language plpgsql as $$
declare
  v_sub uuid := (select id from public.subcategories order by sort_order, slug limit 1);
  v_region uuid := (select id from public.regions limit 1);
  v_g1 uuid; v_g2 uuid; v_g3 uuid;
  v_e uuid; v_t uuid;
begin
  perform tests.as_admin();
  delete from tests.fixture_ids;

  perform tests.make_user(n) from unnest(array[
    'owner', 'admin', 'member', 'banned', 'owner2', 'pending',
    'outsider', 'suspended', 'noterms', 'siteadmin'
  ]) as n;

  update public.accounts set suspended_at = now() where id = tests.uid('suspended');
  update public.accounts set accepted_terms_at = null where id = tests.uid('noterms');
  update public.accounts set is_site_admin = true where id = tests.uid('siteadmin');

  insert into public.groups (slug, name, description, subcategory_id, region_id, area, join_policy, created_by)
  values ('g1', 'Group One', 'An open test group.', v_sub, v_region, 'Brevard', 'open', tests.uid('owner'))
  returning id into v_g1;
  perform tests.remember('g1', v_g1);

  insert into public.groups (slug, name, description, subcategory_id, region_id, area, join_policy, created_by)
  values ('g2', 'Group Two', 'An approval test group.', v_sub, v_region, 'Asheville', 'approval', tests.uid('owner2'))
  returning id into v_g2;
  perform tests.remember('g2', v_g2);

  insert into public.groups (slug, name, description, subcategory_id, region_id, area, join_policy, created_by)
  values ('g3', 'Group Three', 'A quiet test group.', v_sub, v_region, 'Brevard', 'open', tests.uid('owner'))
  returning id into v_g3;
  perform tests.remember('g3', v_g3);

  insert into public.group_members (group_id, user_id, role, status) values
    (v_g1, tests.uid('admin'), 'admin', 'active'),
    (v_g1, tests.uid('member'), 'member', 'active'),
    (v_g1, tests.uid('banned'), 'member', 'banned'),
    (v_g2, tests.uid('pending'), 'member', 'pending'),
    (v_g3, tests.uid('member'), 'member', 'active');

  insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name, address_visibility, capacity, created_by)
  values (v_g1, 'Public event', now() + interval '7 days', now() + interval '7 days 3 hours',
          'America/New_York', 'Trailhead lot', 'public', 2, tests.uid('owner'))
  returning id into v_e;
  perform tests.remember('e1', v_e);
  insert into public.event_private_details values (v_e, '1 Public Road');

  insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name, address_visibility, created_by)
  values (v_g1, 'Members event', now() + interval '7 days', now() + interval '7 days 3 hours',
          'America/New_York', 'Somebody''s house', 'members', tests.uid('owner'))
  returning id into v_e;
  perform tests.remember('e2', v_e);
  insert into public.event_private_details values (v_e, '2 Secret Lane');

  insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name, created_by)
  values (v_g1, 'Past event', now() - interval '1 day', now() - interval '20 hours',
          'America/New_York', 'The river', tests.uid('owner'))
  returning id into v_e;
  perform tests.remember('e_past', v_e);

  insert into public.threads (group_id, author_id, title, body)
  values (v_g1, tests.uid('member'), 'Carpool?', 'Anyone driving from Brevard?')
  returning id into v_t;
  perform tests.remember('t1', v_t);
  insert into public.replies (thread_id, author_id, body)
  values (v_t, tests.uid('member'), 'I can drive.')
  returning id into v_e;
  perform tests.remember('r1', v_e);

  insert into public.threads (group_id, author_id, title, body)
  values (v_g1, tests.uid('admin'), 'Locked', 'No more replies.')
  returning id into v_t;
  update public.threads set is_locked = true where id = v_t;
  perform tests.remember('t_locked', v_t);

  insert into public.threads (group_id, author_id, title, body)
  values (v_g3, tests.uid('member'), 'Old thread', 'From before discussions were switched off.')
  returning id into v_t;
  perform tests.remember('t3', v_t);
  update public.groups set discussions_enabled = false where id = v_g3;

  insert into public.reports (reporter_id, target_type, target_id, reason)
  values (tests.uid('member'), 'thread', tests.id('t1'), 'spam')
  returning id into v_e;
  perform tests.remember('rep_thread', v_e);

  insert into public.reports (reporter_id, target_type, target_id, reason)
  values (tests.uid('outsider'), 'group', v_g2, 'spam')
  returning id into v_e;
  perform tests.remember('rep_group', v_e);
end
$$;

grant execute on all functions in schema tests to anon, authenticated;

select pass('test helpers installed');
select * from finish();
commit;
