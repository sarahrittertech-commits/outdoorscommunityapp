-- Joining, leaving, approving and roles: PT-12, PT-14, FR-MB-*.
begin;
select plan(21);
select tests.build_fixture();

-- Joining ---------------------------------------------------------------------
select tests.as('outsider');

select lives_ok(
  format($$ insert into public.group_members (group_id, user_id) values (%L, %L) $$, tests.id('g1'), tests.uid('outsider')),
  'FR-MB-1 joining an open group works'
);
select is(
  (select status::text from public.group_members where group_id = tests.id('g1') and user_id = tests.uid('outsider')),
  'active', 'FR-MB-1 and makes you an active member at once'
);

select throws_ok(
  format($$ insert into public.group_members (group_id, user_id, status) values (%L, %L, 'active') $$, tests.id('g2'), tests.uid('outsider')),
  '42501', null, 'FR-MB-2 you cannot make yourself active in an approval group'
);
select lives_ok(
  format($$ insert into public.group_members (group_id, user_id, status) values (%L, %L, 'pending') $$, tests.id('g2'), tests.uid('outsider')),
  'FR-MB-2 requesting to join an approval group works'
);
select throws_ok(
  format($$ insert into public.group_members (group_id, user_id, role) values (%L, %L, 'admin') $$, tests.id('g3'), tests.uid('outsider')),
  '42501', null, 'You cannot join as an admin'
);
select throws_ok(
  format($$ insert into public.group_members (group_id, user_id) values (%L, %L) $$, tests.id('g3'), tests.uid('member')),
  '42501', null, 'You cannot add someone else'
);

-- PT-14: bans -----------------------------------------------------------------
select tests.as('banned');
select throws_ok(
  format($$ insert into public.group_members (group_id, user_id) values (%L, %L) $$, tests.id('g1'), tests.uid('banned')),
  '23505', null, 'PT-14 a banned user cannot rejoin'
);
delete from public.group_members where group_id = tests.id('g1') and user_id = tests.uid('banned');
select tests.as_admin();
select is(
  (select status::text from public.group_members where group_id = tests.id('g1') and user_id = tests.uid('banned')),
  'banned', 'PT-14 a banned user cannot delete their ban'
);

-- Leaving ---------------------------------------------------------------------
select tests.as('member');
delete from public.group_members where group_id = tests.id('g3') and user_id = tests.uid('member');
select is(public.is_group_member(tests.id('g3')), false, 'FR-MB-3 members can leave');

select tests.as('owner');
delete from public.group_members where group_id = tests.id('g1') and user_id = tests.uid('owner');
select is(public.is_group_owner(tests.id('g1')), true, 'FR-MB-3 the owner cannot leave');

-- Approving -------------------------------------------------------------------
select tests.as('member');
select throws_ok(
  format($$ select public.approve_member(%L, %L) $$, tests.id('g2'), tests.uid('pending')),
  'P0001', null, 'Non-admins cannot approve requests'
);
select tests.as('owner2');
select lives_ok(
  format($$ select public.approve_member(%L, %L) $$, tests.id('g2'), tests.uid('pending')),
  'Owners approve requests'
);
select tests.as('pending');
select is(public.is_group_member(tests.id('g2')), true, 'An approved request makes you a member');

-- PT-12: admins versus owner --------------------------------------------------
select tests.as('admin');
select throws_ok(
  format($$ select public.set_member_role(%L, %L, 'admin') $$, tests.id('g1'), tests.uid('member')),
  'P0001', null, 'PT-12 admins cannot promote'
);
select throws_ok(
  format($$ select public.remove_member(%L, %L) $$, tests.id('g1'), tests.uid('owner')),
  'P0001', null, 'PT-12 nobody can remove the owner'
);
select throws_ok(
  format($$ update public.group_members set role = 'admin' where user_id = %L $$, tests.uid('member')),
  '42501', null, 'PT-12 roles cannot be changed by direct update'
);

select tests.as('owner');
select lives_ok(
  format($$ select public.set_member_role(%L, %L, 'admin') $$, tests.id('g1'), tests.uid('member')),
  'FR-MB-5 the owner promotes a member to admin'
);

select tests.as('admin');
select throws_ok(
  format($$ select public.remove_member(%L, %L) $$, tests.id('g1'), tests.uid('member')),
  'P0001', null, 'PT-12 admins cannot remove another admin'
);

select tests.as('owner');
select lives_ok(
  format($$ select public.transfer_ownership(%L, %L) $$, tests.id('g1'), tests.uid('admin')),
  'FR-MB-6 the owner transfers ownership to an admin'
);
select tests.as_admin();
select is(
  (select array_agg(role::text order by role) from public.group_members
   where group_id = tests.id('g1') and user_id in (tests.uid('owner'), tests.uid('admin'))),
  array['owner', 'admin'], 'FR-MB-6 the new owner is the admin, the old owner becomes an admin'
);

-- Suspended users can't join --------------------------------------------------
select tests.as('suspended');
select throws_ok(
  format($$ insert into public.group_members (group_id, user_id) values (%L, %L) $$, tests.id('g1'), tests.uid('suspended')),
  '42501', null, 'PT-16 suspended users cannot join'
);

select * from finish();
rollback;
