-- Accounts, reports, the moderation log and rate limits: PT-16..PT-21.
begin;
select plan(19);
select tests.build_fixture();

-- PT-16: suspended users read but never write ---------------------------------
select tests.as('suspended');
select is((select count(*)::int from public.groups where slug in ('g1', 'g2', 'g3')), 3, 'PT-16 suspended users can still read');
select throws_ok(
  format($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (%L, 'group', %L, 'spam') $$, tests.uid('suspended'), tests.id('g1')),
  '42501', null, 'PT-16 suspended users cannot report'
);
update public.profiles set bio = 'still here' where id = tests.uid('suspended');
select is((select bio from public.profiles where id = tests.uid('suspended')), null, 'PT-16 suspended users cannot edit their profile');

-- PT-17: terms first ----------------------------------------------------------
select tests.as('noterms');
select throws_ok(
  format($$ insert into public.group_members (group_id, user_id) values (%L, %L) $$, tests.id('g1'), tests.uid('noterms')),
  '42501', null, 'PT-17 users who have not accepted the terms cannot join'
);
select throws_ok(
  $$ select public.complete_onboarding('Newbie', null, null, true, false) $$,
  'P0001', null, 'FR-AC-2 onboarding requires accepting the terms'
);
select lives_ok(
  $$ select public.complete_onboarding('Newbie', null, 'Brevard', true, true) $$,
  'FR-AC-2 onboarding with 18+ and terms works'
);
select lives_ok(
  format($$ insert into public.group_members (group_id, user_id) values (%L, %L) $$, tests.id('g1'), tests.uid('noterms')),
  'FR-AC-2 after onboarding, joining works'
);

-- PT-18: report routing -------------------------------------------------------
select tests.as('admin');
select is(
  (select array_agg(id) from public.reports), array[tests.id('rep_thread')],
  'PT-18 a group admin sees only their group''s reports'
);
select tests.as('owner2');
select is((select count(*)::int from public.reports), 0, 'PT-18 reports on a group itself go to the site admin, not its owner');
select tests.as('siteadmin');
select is((select count(*)::int from public.reports), 2, 'PT-18 the site admin sees every report');

select tests.as('member');
insert into public.reports (reporter_id, target_type, target_id, group_id, reason)
values (tests.uid('member'), 'thread', tests.id('t1'), tests.id('g2'), 'spam');
select tests.as_admin();
select is(
  (select group_id from public.reports where reporter_id = tests.uid('member') order by created_at desc limit 1),
  tests.id('g1'), 'FR-MD-2 a report is routed by its target, not by what the client claims'
);

select tests.as('admin');
select throws_ok(
  format($$ select public.resolve_report(%L, 'dismissed') $$, tests.id('rep_group')),
  'P0001', null, 'Group admins cannot handle site-level reports'
);

-- PT-19: the moderation log is append-only ------------------------------------
select tests.as('siteadmin');
select lives_ok(
  format($$ select public.suspend_user(%L, 'spam') $$, tests.uid('outsider')),
  'FR-MD-3 the site admin suspends accounts'
);
select tests.as_admin();
select throws_ok($$ update public.moderation_actions set reason = 'edited' $$, 'P0001', null, 'PT-19 moderation log rows cannot be edited');
select throws_ok($$ delete from public.moderation_actions $$, 'P0001', null, 'PT-19 moderation log rows cannot be deleted');
select tests.as('member');
select is((select count(*)::int from public.moderation_actions), 0, 'Only the site admin reads the moderation log');
select is((select count(*)::int from public.accounts), 1, 'Users see only their own account row');

-- PT-21: rate limits ----------------------------------------------------------
-- The fixture already gave member two threads (t1, t3) and a reply (r1).
select lives_ok(
  format($$ do $x$ begin
              for i in 1..7 loop
                insert into public.threads (group_id, author_id, title, body) values (%L, %L, 'Post ' || i, 'Body');
              end loop;
            end $x$ $$, tests.id('g1'), tests.uid('member')),
  'PT-21 ten posts in ten minutes are allowed'
);
select throws_ok(
  format($$ insert into public.threads (group_id, author_id, title, body) values (%L, %L, 'One more', 'Body') $$, tests.id('g1'), tests.uid('member')),
  'P0001', null, 'PT-21 the eleventh post in ten minutes is refused'
);

select * from finish();
rollback;
