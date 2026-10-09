-- Fixes from the 9 October 2026 code review (20261010000004). PT-70..PT-79.
begin;
select plan(44);
select tests.build_fixture();

-- PT-70  Reports about an organizer's own content (FR-MD-2) -----------------
-- t_locked is admin's thread; e1 is owner's event. member reports both.
select tests.as_admin();
insert into public.reports (reporter_id, target_type, target_id, reason)
values (tests.uid('member'), 'thread', tests.id('t_locked'), 'spam');
select tests.remember('rep_admin_thread', (select id from public.reports where target_id = tests.id('t_locked')));
insert into public.reports (reporter_id, target_type, target_id, reason)
values (tests.uid('member'), 'event', tests.id('e1'), 'spam');
select tests.remember('rep_owner_event', (select id from public.reports where target_id = tests.id('e1')));

select tests.as('admin');
select throws_ok(
  format($$ select public.resolve_report(%L, 'dismissed') $$, tests.id('rep_admin_thread')),
  'P0001', 'own_content: A report about your own post goes to the site admin.',
  'PT-70 a page manager cannot dismiss a report about their own thread'
);
select throws_ok(
  format($$ select public.resolve_report(%L, 'dismissed') $$, tests.id('rep_owner_event')),
  'P0001', 'own_content: A report about an organizer''s post goes to the site admin.',
  'PT-70 a page manager cannot dismiss a report about the page admin''s event'
);
select tests.as('owner');
select throws_ok(
  format($$ select public.resolve_report(%L, 'dismissed') $$, tests.id('rep_owner_event')),
  'P0001', 'own_content: A report about your own post goes to the site admin.',
  'PT-70 the page admin cannot dismiss a report about their own event'
);
select throws_ok(
  format($$ select public.resolve_report(%L, 'actioned') $$, tests.id('rep_admin_thread')),
  'P0001', 'own_content: A report about an organizer''s post goes to the site admin.',
  'PT-70 the page admin cannot close a report about a page manager''s thread'
);
select throws_ok(
  format($$ select public.resolve_report(%L, 'dismissed') $$, tests.id('rep_group')),
  'P0001', 'not_allowed: You cannot handle this report.',
  'PT-70 a report about a group itself is for the site admin only'
);
select tests.as('admin');
select lives_ok(
  format($$ select public.resolve_report(%L, 'dismissed') $$, tests.id('rep_thread')),
  'PT-70 organizers still dismiss reports about a member''s post'
);
select tests.as('siteadmin');
select lives_ok(
  format($$ select public.resolve_report(%L, 'dismissed') $$, tests.id('rep_admin_thread')),
  'PT-70 the site admin handles a report about an organizer''s post'
);
select tests.as_admin();
select is(
  (select count(*)::int from public.moderation_actions
    where action = 'dismiss_report' and target_id in (tests.id('t1'), tests.id('t_locked'))), 2,
  'PT-70 dismissals are written to the moderation log'
);
select is(
  (select actor_id from public.moderation_actions where action = 'dismiss_report' and target_id = tests.id('t1')),
  tests.uid('admin'),
  'PT-70 the log names who dismissed the report'
);

-- PT-71  remove_member tells non-admins nothing (FR-MB-7) ------------------
select tests.as('outsider');
select throws_ok(
  format($$ select public.remove_member(%L, %L) $$, tests.id('g1'), tests.uid('member')),
  'P0001', 'not_allowed: Only group admins can remove members.',
  'PT-71 a non-admin naming a member is refused'
);
select throws_ok(
  format($$ select public.remove_member(%L, %L) $$, tests.id('g1'), tests.uid('outsider')),
  'P0001', 'not_allowed: Only group admins can remove members.',
  'PT-71 a non-admin naming a non-member gets the same answer'
);
select throws_ok(
  format($$ select public.remove_member(%L, %L) $$, tests.id('g1'), tests.uid('owner')),
  'P0001', 'not_allowed: Only group admins can remove members.',
  'PT-71 a non-admin naming the owner gets the same answer'
);
select tests.as('member');
select throws_ok(
  format($$ select public.remove_member(%L, %L) $$, tests.id('g1'), tests.uid('banned')),
  'P0001', 'not_allowed: Only group admins can remove members.',
  'PT-71 a member cannot learn who is banned'
);

-- PT-72  transfer_ownership keeps the 3-owned-groups limit (FR-GR-7) -------
select tests.as_admin();
insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by)
select 'own-' || i, 'Own ' || i, 'A group for the ownership limit test.',
       (select id from public.subcategories order by sort_order limit 1),
       (select id from public.regions limit 1), 'Brevard', tests.uid('admin')
from generate_series(1, 3) as i;
select tests.as('owner');
select throws_ok(
  format($$ select public.transfer_ownership(%L, %L) $$, tests.id('g1'), tests.uid('admin')),
  'P0001', 'group_limit: That person already owns 3 groups.',
  'PT-72 ownership cannot go to someone who already owns 3 groups'
);
select tests.as_admin();
update public.groups set status = 'removed' where slug = 'own-3';
select tests.as('owner');
select lives_ok(
  format($$ select public.transfer_ownership(%L, %L) $$, tests.id('g1'), tests.uid('admin')),
  'PT-72 a removed group does not count toward the limit'
);
select tests.as('admin');
select public.transfer_ownership(tests.id('g1'), tests.uid('owner'));

-- PT-73  Organizers of an archived group can't moderate (FR-GR-6) ----------
select tests.as('owner');
select public.archive_group(tests.id('g1'));
select tests.as('admin');
select throws_ok(
  format($$ select public.remove_post('thread', %L) $$, tests.id('t1')),
  'P0001', 'not_allowed: Only group admins can remove posts.',
  'PT-73 no removing posts in an archived group'
);
select throws_ok(
  format($$ select public.set_thread_flags(%L, true) $$, tests.id('t1')),
  'P0001', 'not_allowed: Only group admins can pin or lock threads.',
  'PT-73 no pinning in an archived group'
);
select throws_ok(
  format($$ select public.remove_member(%L, %L) $$, tests.id('g1'), tests.uid('member')),
  'P0001', 'not_allowed: Only group admins can remove members.',
  'PT-73 no removing members from an archived group'
);
select throws_ok(
  format($$ select public.resolve_report(%L, 'actioned') $$, tests.id('rep_thread')),
  'P0001', 'not_allowed: You cannot handle this report.',
  'PT-73 no handling reports in an archived group'
);
select tests.as('owner');
select throws_ok(
  format($$ select public.set_member_role(%L, %L, 'member') $$, tests.id('g1'), tests.uid('admin')),
  'P0001', 'not_allowed: Only the owner can change roles.',
  'PT-73 the page admin cannot change roles in an archived group'
);
select throws_ok(
  format($$ select public.transfer_ownership(%L, %L) $$, tests.id('g1'), tests.uid('admin')),
  'P0001', 'not_allowed: Only the owner can transfer ownership.',
  'PT-73 the page admin cannot transfer an archived group'
);
select tests.as('siteadmin');
select lives_ok(
  format($$ select public.set_thread_flags(%L, true) $$, tests.id('t1')),
  'PT-73 the site admin still moderates an archived group'
);
-- Decline in a removed group.
select tests.as_admin();
update public.groups set status = 'removed' where id = tests.id('g2');
select tests.as('owner2');
select throws_ok(
  format($$ select public.decline_member(%L, %L) $$, tests.id('g2'), tests.uid('pending')),
  'P0001', 'not_allowed: Only group admins can decline requests.',
  'PT-73 no declining requests in a removed group'
);

-- PT-74  Event addresses in an archived group (FR-GR-6) --------------------
select tests.as('admin');
update public.event_private_details set address = '9 Changed Road' where event_id = tests.id('e1');
delete from public.event_private_details where event_id = tests.id('e2');
select tests.as_admin();
select is(
  (select address from public.event_private_details where event_id = tests.id('e1')), '1 Public Road',
  'PT-74 an archived group''s event address cannot be changed'
);
select is(
  (select count(*)::int from public.event_private_details where event_id = tests.id('e2')), 1,
  'PT-74 an archived group''s event address cannot be cleared'
);

-- PT-78  Event listings show only active groups' events (FR-GR-6) ----------
select tests.as_anon();
select is(
  (select count(*)::int from public.event_listings where group_id = tests.id('g1')), 0,
  'PT-78 an archived group''s events leave the event listings'
);
select ok(
  (select count(*) from public.events where group_id = tests.id('g1')) >= 3,
  'PT-78 its events are still readable on its own pages'
);
select tests.as('owner');
select public.restore_group(tests.id('g1'));
select tests.as_anon();
select is(
  (select count(*)::int from public.event_listings where group_id = tests.id('g1')), 3,
  'PT-78 restoring the group lists its events again'
);
select is(
  (select count(*)::int from public.event_listings where group_id = tests.id('g2')), 0,
  'PT-78 a removed group''s events are not listed'
);

-- PT-74 (continued): active again, the organizers edit addresses as before.
select tests.as('admin');
update public.event_private_details set address = '9 Changed Road' where event_id = tests.id('e1');
select tests.as_admin();
select is(
  (select address from public.event_private_details where event_id = tests.id('e1')), '9 Changed Road',
  'PT-74 an active group''s organizers still change addresses'
);

-- PT-75  Suspended accounts can't delete their posts (FR-MD-3) --------------
select tests.as_admin();
insert into public.threads (group_id, author_id, title, body)
values (tests.id('g1'), tests.uid('suspended'), 'Before suspension', 'Posted earlier.');
select tests.as('suspended');
select throws_ok(
  format($$ select public.delete_own_post('thread', %L) $$,
         (select id from public.threads where title = 'Before suspension')),
  'P0001', 'not_allowed: Your account cannot make changes right now.',
  'PT-75 a suspended account cannot delete its posts'
);

-- PT-76  The join limit survives leaving (TR-SEC-8) -------------------------
select tests.as_admin();
insert into public.groups (slug, name, description, subcategory_id, region_id, area, join_policy, created_by)
select 'hop-' || i, 'Hop ' || i, 'A group for the join and leave test.',
       (select id from public.subcategories order by sort_order limit 1),
       (select id from public.regions limit 1), 'Brevard', 'open', tests.uid('owner2')
from generate_series(1, 21) as i;
select tests.as('outsider');
select lives_ok(
  $$ insert into public.group_members (group_id, user_id)
     select id, tests.uid('outsider') from public.groups where slug like 'hop-%' and slug <> 'hop-21' $$,
  'PT-76 twenty joins in a day are allowed'
);
select lives_ok(
  $$ delete from public.group_members where user_id = tests.uid('outsider') $$,
  'PT-76 leaving them all is allowed'
);
select throws_ok(
  $$ insert into public.group_members (group_id, user_id)
     values ((select id from public.groups where slug = 'hop-1'), tests.uid('outsider')) $$,
  'P0001', 'rate_limited: You can join at most 20 groups a day.',
  'PT-76 leaving does not reset the limit'
);
select throws_ok(
  $$ select count(*) from public.join_log $$,
  '42501', null,
  'PT-76 the join log cannot be read through the API'
);
select throws_ok(
  format($$ delete from public.join_log where user_id = %L $$, tests.uid('outsider')),
  '42501', null,
  'PT-76 the join log cannot be cleared through the API'
);

-- PT-77  The unused group-covers bucket takes no uploads (TR-SEC-9) ---------
select tests.as_admin();
select is(
  (select count(*)::int from pg_policies where schemaname = 'storage' and policyname ilike '%cover%'
     and policyname not like '% v2'), 0,  -- UC-24's group-covers-v2 policies end in v2
  'PT-77 group-covers has no storage policies'
);
select is(
  (select count(*)::int from storage.buckets where id = 'group-covers'), 0,
  'PT-77 the empty group-covers bucket is gone'
);

-- PT-79  Cleanup: raise_rule, indexes, approve_claim -----------------------
select ok(
  not has_function_privilege('authenticated', 'public.raise_rule(text, text)', 'execute'),
  'PT-79 signed-in users cannot call raise_rule'
);
select tests.as('owner');
select throws_ok(
  format($$ insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name, created_by)
            values (%L, 'Bad zone', now() + interval '1 day', now() + interval '2 days', 'Mars/Olympus', 'Somewhere', %L) $$,
         tests.id('g1'), tests.uid('owner')),
  'P0001', 'invalid_timezone: Unknown time zone Mars/Olympus.',
  'PT-79 an unknown time zone still gets the friendly message'
);
select tests.as_admin();
select is(
  (select count(*)::int from pg_indexes where indexname in (
     'groups_created_by_created_idx', 'group_claims_user_created_idx', 'group_claims_decided_by_idx',
     'events_created_by_idx', 'reports_handled_by_idx', 'moderation_actions_actor_idx',
     'moderation_actions_group_idx', 'moderation_actions_created_idx', 'candidates_group_idx')), 9,
  'PT-79 the missing indexes exist'
);

-- approve_claim keeps the claimant's RSVPs: member of an unclaimed listing,
-- going to its event, claims it.
insert into public.groups (slug, name, description, subcategory_id, region_id, area, join_policy, is_unclaimed, source_url)
values ('listing', 'A Listing', 'An unclaimed listing for the claim test.',
        (select id from public.subcategories order by sort_order limit 1),
        (select id from public.regions limit 1), 'Brevard', 'open', true, 'https://listing.example.test/');
insert into public.group_members (group_id, user_id, role, status)
values ((select id from public.groups where slug = 'listing'), tests.uid('member'), 'member', 'active');
insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name)
values ((select id from public.groups where slug = 'listing'), 'Listing ride',
        now() + interval '3 days', now() + interval '3 days 2 hours', 'America/New_York', 'Lot');
insert into public.event_rsvps (event_id, user_id, status)
values ((select id from public.events where title = 'Listing ride'), tests.uid('member'), 'going');
insert into public.group_claims (group_id, user_id, note)
values ((select id from public.groups where slug = 'listing'), tests.uid('member'), 'I run this club.');
select tests.as('siteadmin');
select lives_ok(
  $$ select public.approve_claim((select id from public.group_claims where note = 'I run this club.')) $$,
  'PT-79 the site admin approves a member''s claim'
);
select tests.as_admin();
select is(
  (select role::text from public.group_members
    where group_id = (select id from public.groups where slug = 'listing') and user_id = tests.uid('member')),
  'owner',
  'PT-79 the claimant''s membership becomes the owner row'
);
select is(
  (select count(*)::int from public.event_rsvps
    where event_id = (select id from public.events where title = 'Listing ride') and user_id = tests.uid('member')), 1,
  'PT-79 the claimant keeps their RSVPs'
);

select * from finish();
rollback;
