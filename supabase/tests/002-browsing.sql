-- Who can see what: PT-3, PT-4, PT-5, PT-6 and the browsing rows of the matrix.
begin;
select plan(22);
select tests.build_fixture();

-- A thread in the approval group, for the pending-member checks.
insert into public.threads (group_id, author_id, title, body)
values (tests.id('g2'), tests.uid('owner2'), 'Welcome', 'Hello, members.');

-- PT-3: visitors -------------------------------------------------------------
select tests.as_anon();

select ok((select count(*) from public.categories) > 0, 'PT-3 visitors see categories');
select is((select count(*)::int from public.groups where slug in ('g1', 'g2', 'g3')), 3, 'PT-3 visitors see active groups');
select is((select count(*)::int from public.events where group_id = tests.id('g1')), 3, 'PT-3 visitors see events');
select is((select count(*)::int from public.threads), 0, 'PT-3 visitors see no threads');
select is((select count(*)::int from public.replies), 0, 'PT-3 visitors see no replies');
select is((select count(*)::int from public.reports), 0, 'PT-3 visitors see no reports');
select is((select count(*)::int from public.event_rsvps), 0, 'PT-3 visitors see no RSVPs');
select is(
  (select array_agg(role::text order by role) from public.group_members where group_id = tests.id('g1')),
  array['owner', 'admin'],
  'PT-3 visitors see a group''s organizers and nobody else'
);
select is(
  (select member_count from public.group_listings where slug = 'g1'), 3,
  'Visitors see the member count, which excludes banned users'
);
select is((select count(*)::int from public.accounts), 0, 'Visitors see no account rows');

-- PT-6: addresses
select is(
  (select address from public.event_private_details where event_id = tests.id('e1')), '1 Public Road',
  'PT-6 visitors see a public address'
);
select is_empty(
  format($$ select 1 from public.event_private_details where event_id = %L $$, tests.id('e2')),
  'PT-6 visitors cannot see a members-only address'
);

-- PT-4: signed-in non-members ------------------------------------------------
select tests.as('outsider');
select is((select count(*)::int from public.threads where group_id = tests.id('g1')), 0, 'PT-4 non-members see no threads');
select is((select count(*)::int from public.replies), 0, 'PT-4 non-members see no replies');
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g1') and role = 'member'), 0,
  'PT-4 non-members cannot see the member list'
);
select is_empty(
  format($$ select 1 from public.event_private_details where event_id = %L $$, tests.id('e2')),
  'PT-6 non-members cannot see a members-only address'
);

-- PT-5: pending members ------------------------------------------------------
select tests.as('pending');
select is((select count(*)::int from public.threads where group_id = tests.id('g2')), 0, 'PT-5 pending members see no threads');

select tests.as('owner2');
select is((select count(*)::int from public.threads where group_id = tests.id('g2')), 1, 'Owners see their group''s threads');

-- Members --------------------------------------------------------------------
select tests.as('member');
select is((select count(*)::int from public.threads where group_id = tests.id('g1')), 2, 'Members see their group''s threads');
select is(
  (select address from public.event_private_details where event_id = tests.id('e2')), '2 Secret Lane',
  'PT-6 members see a members-only address'
);
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g1') and status = 'banned'), 0,
  'Members do not see banned users in the member list'
);

select tests.as('admin');
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g1') and status = 'banned'), 1,
  'Admins see banned users'
);

select * from finish();
rollback;
