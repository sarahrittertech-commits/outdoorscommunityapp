-- Unclaimed listings and claim requests: FR-GR-9, FR-GR-10.
begin;
select plan(29);
select tests.build_fixture();

-- The operator adds two listings, and an event, in SQL.
select tests.as_admin();
insert into public.groups (slug, name, description, subcategory_id, region_id, area, discussions_enabled, is_unclaimed, source_url)
select v.slug, v.name, 'A club added from its public website.', s.id, r.id, 'Brevard', false, true, v.url
from (values ('listed', 'Listed Club', 'https://listed.example.org'), ('listed2', 'Second Club', 'https://two.example.org')) v(slug, name, url),
     (select id from public.subcategories limit 1) s, (select id from public.regions limit 1) r;
select tests.remember('listed', (select id from public.groups where slug = 'listed'));
select tests.remember('listed2', (select id from public.groups where slug = 'listed2'));
insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name, source_url)
values (tests.id('listed'), 'Listed Walk', now() + interval '3 days', now() + interval '3 days 2 hours',
        'America/New_York', 'Pisgah', 'https://listed.example.org/walk');

select is(public.group_member_count(tests.id('listed')), 0, 'FR-GR-9 a listing has no owner or members');
select throws_ok(
  $$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, is_unclaimed)
     select 'nolink', 'No Link', 'A listing without a source.', s.id, r.id, 'Brevard', true
     from public.subcategories s, public.regions r limit 1 $$,
  '23514', null, 'FR-GR-9 a listing must link to its source'
);

-- Anyone can see a listing and its link.
select tests.as_anon();
select is(
  (select is_unclaimed and source_url = 'https://listed.example.org' from public.group_listings where slug = 'listed'), true,
  'FR-GR-9 visitors see a listing is unclaimed, with its link'
);
select is(
  (select source_url from public.event_listings where title = 'Listed Walk'), 'https://listed.example.org/walk',
  'FR-GR-9 visitors see where a listed event came from'
);

-- Nobody signed in makes listings or links, not even the site admin.
select tests.as('outsider');
insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by, is_unclaimed, source_url)
select 'sneaky', 'Sneaky Group', 'Pretending to be a listing.', s.id, r.id, 'Brevard', tests.uid('outsider'), true, 'https://x.example'
from public.subcategories s, public.regions r limit 1;
select is(
  (select not is_unclaimed and source_url is null from public.groups where slug = 'sneaky'), true,
  'FR-GR-9 a group made through the app is never a listing'
);

select tests.as('siteadmin');
select throws_ok(
  $$ update public.events set source_url = 'https://x.example' where title = 'Listed Walk' $$,
  '42501', null, 'FR-GR-9 the app cannot change a source link'
);

select tests.as('owner');
insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name, created_by, source_url)
values (tests.id('g1'), 'Linked Ride', now() + interval '4 days', now() + interval '4 days 1 hour',
        'America/New_York', 'Brevard', tests.uid('owner'), 'https://x.example');
select is(
  (select source_url from public.events where title = 'Linked Ride'), null,
  'FR-GR-9 group admins cannot set an event''s source link'
);

-- Nobody joins a listing, so nobody posts in it or RSVPs to its events.
select tests.as('outsider');
select throws_ok(
  format($$ insert into public.group_members (group_id, user_id, role, status) values (%L, %L, 'member', 'active') $$,
         tests.id('listed'), tests.uid('outsider')),
  '42501', null, 'FR-GR-9 nobody can join an unclaimed listing'
);
select throws_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status)
            select id, %L, 'going' from public.events where title = 'Listed Walk' $$, tests.uid('outsider')),
  '42501', null, 'FR-GR-9 nobody can RSVP to a listing''s event'
);
select throws_ok(
  format($$ insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name, created_by)
            values (%L, 'Hijack', now() + interval '1 day', now() + interval '1 day 1 hour', 'America/New_York', 'x', %L) $$,
         tests.id('listed'), tests.uid('outsider')),
  '42501', null, 'FR-GR-9 nobody can post events to a listing'
);

-- Asking to claim.
select tests.as_anon();
select throws_ok(
  format($$ insert into public.group_claims (group_id, user_id, note) values (%L, gen_random_uuid(), 'I run this club.') $$, tests.id('listed')),
  '42501', null, 'FR-GR-10 visitors cannot claim'
);
select tests.as('suspended');
select throws_ok(
  format($$ insert into public.group_claims (group_id, user_id, note) values (%L, %L, 'I run this club.') $$, tests.id('listed'), tests.uid('suspended')),
  '42501', null, 'FR-GR-10 suspended users cannot claim'
);
select tests.as('outsider');
select throws_ok(
  format($$ insert into public.group_claims (group_id, user_id, note) values (%L, %L, 'This one too please.') $$, tests.id('g1'), tests.uid('outsider')),
  '42501', null, 'FR-GR-10 only unclaimed listings can be claimed'
);
select throws_ok(
  format($$ insert into public.group_claims (group_id, user_id, note, status) values (%L, %L, 'I run this club.', 'approved') $$, tests.id('listed'), tests.uid('outsider')),
  '42501', null, 'FR-GR-10 a claim cannot approve itself'
);
select throws_ok(
  format($$ insert into public.group_claims (group_id, user_id, note) values (%L, %L, 'I run this club.') $$, tests.id('listed'), tests.uid('member')),
  '42501', null, 'FR-GR-10 you cannot claim in someone else''s name'
);
select lives_ok(
  format($$ insert into public.group_claims (group_id, user_id, note) values (%L, %L, 'I lead the Tuesday rides for this club.') $$, tests.id('listed'), tests.uid('outsider')),
  'FR-GR-10 signed-in users ask to claim a listing'
);
select tests.as('member');
insert into public.group_claims (group_id, user_id, note) values (tests.id('listed'), tests.uid('member'), 'I am on the club committee.');
select is((select count(*)::int from public.group_claims), 1, 'FR-GR-10 claimants see only their own claims');
select throws_ok(
  $$ update public.group_claims set status = 'approved' $$,
  '42501', null, 'FR-GR-10 claimants cannot approve their own claim'
);

-- Deciding.
select throws_ok(
  format($$ select public.approve_claim(%L) $$, (select id from public.group_claims limit 1)),
  'P0001', 'not_allowed: Only the site admin can approve claims.', 'FR-GR-10 only the site admin approves claims'
);
select tests.as_anon();
select throws_ok(
  $$ select public.approve_claim(gen_random_uuid()) $$,
  '42501', null, 'FR-GR-10 visitors cannot call approve_claim'
);

select tests.as('siteadmin');
select is((select count(*)::int from public.group_claims where group_id = tests.id('listed')), 2, 'FR-GR-10 the site admin sees every claim');
select lives_ok(
  format($$ select public.approve_claim(%L) $$,
         (select id from public.group_claims where user_id = tests.uid('outsider'))),
  'FR-GR-10 the site admin approves a claim'
);
select is(
  (select role::text || '/' || status::text from public.group_members where group_id = tests.id('listed') and user_id = tests.uid('outsider')),
  'owner/active', 'FR-GR-10 the claimant becomes the owner'
);
select is(
  (select not is_unclaimed and discussions_enabled from public.groups where id = tests.id('listed')), true,
  'FR-GR-10 the group becomes an ordinary group with discussions on'
);
select is(
  (select status::text from public.group_claims where user_id = tests.uid('member')), 'declined',
  'FR-GR-10 other pending claims on it are declined'
);
select throws_ok(
  format($$ select public.decline_claim(%L) $$, (select id from public.group_claims where user_id = tests.uid('member'))),
  'P0001', 'not_found: No pending claim with that id.', 'FR-GR-10 a decided claim cannot be decided again'
);

select tests.as('admin');
select lives_ok(
  format($$ insert into public.group_members (group_id, user_id, role, status) values (%L, %L, 'member', 'active') $$,
         tests.id('listed'), tests.uid('admin')),
  'FR-GR-10 once claimed, people can join'
);
select throws_ok(
  format($$ insert into public.group_claims (group_id, user_id, note) values (%L, %L, 'I also run this club.') $$, tests.id('listed'), tests.uid('admin')),
  '42501', null, 'FR-GR-10 a claimed group cannot be claimed again'
);

-- Declining leaves the listing as it was.
insert into public.group_claims (group_id, user_id, note) values (tests.id('listed2'), tests.uid('admin'), 'I organize this club''s events.');
select tests.as('siteadmin');
select public.decline_claim((select id from public.group_claims where group_id = tests.id('listed2')));
select is(
  (select c.status::text || '/' || g.is_unclaimed::text
     from public.group_claims c join public.groups g on g.id = c.group_id
    where c.group_id = tests.id('listed2')),
  'declined/true', 'FR-GR-10 declining a claim leaves the listing unclaimed'
);

select * from finish();
rollback;
