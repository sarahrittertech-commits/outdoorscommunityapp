-- Gaps found in the 8 October code review: functions with no test of their
-- own, the rate limits not yet covered (posts and claims are in 006 and
-- 011), and an allow-list of SECURITY DEFINER functions. PT-35..PT-39, PT-21.
begin;
select plan(28);
select tests.build_fixture();

-- PT-35  decline_member (FR-MB-2) -----------------------------------------
-- g2 is owner2's approval group; pending has asked to join.
select tests.as('outsider');
select throws_ok(
  format($$ select public.decline_member(%L, %L) $$, tests.id('g2'), tests.uid('pending')),
  'P0001', 'not_allowed: Only group admins can decline requests.',
  'PT-35 a non-admin cannot decline a join request'
);
select tests.as('owner2');
select lives_ok(
  format($$ select public.decline_member(%L, %L) $$, tests.id('g2'), tests.uid('pending')),
  'PT-35 the owner declines a join request'
);
select tests.as_admin();
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g2') and user_id = tests.uid('pending')), 0,
  'PT-35 declining removes the request, so they can ask again'
);
select tests.as('owner2');
select throws_ok(
  format($$ select public.decline_member(%L, %L) $$, tests.id('g2'), tests.uid('outsider')),
  'P0001', 'not_found: No pending request from that person.',
  'PT-35 declining someone who has not asked is refused'
);

-- PT-36  restore_group (FR-GR-6, FR-MD-3) ---------------------------------
select tests.as('owner');
select public.archive_group(tests.id('g1'));
select tests.as('admin');
select throws_ok(
  format($$ select public.restore_group(%L) $$, tests.id('g1')),
  'P0001', 'not_allowed: Only the owner can restore the group.',
  'PT-36 a group admin cannot restore an archived group'
);
select tests.as('owner');
select lives_ok(format($$ select public.restore_group(%L) $$, tests.id('g1')), 'PT-36 the owner restores an archived group');
select is((select status::text from public.groups where id = tests.id('g1')), 'active', 'PT-36 the group is active again');

select tests.as('siteadmin');
select public.remove_group(tests.id('g3'), 'spam');
select tests.as('owner');
select throws_ok(
  format($$ select public.restore_group(%L) $$, tests.id('g3')),
  'P0001', 'not_found: That group cannot be restored.',
  'PT-36 an owner cannot undo the site admin removing their group'
);
select tests.as('siteadmin');
select lives_ok(format($$ select public.restore_group(%L) $$, tests.id('g3')), 'PT-36 the site admin restores a removed group');
select tests.as_admin();
select is(
  (select count(*)::int from public.moderation_actions where action = 'restore_group' and target_id = tests.id('g3')), 1,
  'PT-36 restoring is written to the moderation log'
);

-- PT-37  delete_own_post (FR-DS-4) ----------------------------------------
-- t1 and r1 are member's.
select tests.as('admin');
select throws_ok(
  format($$ select public.delete_own_post('thread', %L) $$, tests.id('t1')),
  'P0001', 'not_found: You can only delete your own posts.',
  'PT-37 an admin cannot author-delete someone else''s thread'
);
select tests.as('member');
select throws_ok(
  format($$ select public.delete_own_post('event', %L) $$, tests.id('e1')),
  'P0001', 'invalid: Only threads and replies can be deleted this way.',
  'PT-37 only threads and replies can be deleted this way'
);
select lives_ok(format($$ select public.delete_own_post('reply', %L) $$, tests.id('r1')), 'PT-37 the author deletes their reply');
select lives_ok(format($$ select public.delete_own_post('thread', %L) $$, tests.id('t1')), 'PT-37 the author deletes their thread');
select tests.as_admin();
select is(
  (select status::text || '|' || title || '|' || body from public.threads where id = tests.id('t1')),
  'deleted_by_author|[deleted]|',
  'PT-37 a deleted thread is blanked, not removed'
);
select is(
  (select status::text || '|' || body from public.replies where id = tests.id('r1')),
  'deleted_by_author|',
  'PT-37 a deleted reply is blanked, not removed'
);

-- PT-38  unsuspend_user (FR-MD-3) -----------------------------------------
select tests.as('admin');
select throws_ok(
  format($$ select public.unsuspend_user(%L) $$, tests.uid('suspended')),
  'P0001', 'not_allowed: Only the site admin can unsuspend accounts.',
  'PT-38 a group admin cannot unsuspend an account'
);
select tests.as('siteadmin');
select lives_ok(format($$ select public.unsuspend_user(%L) $$, tests.uid('suspended')), 'PT-38 the site admin unsuspends an account');
select tests.as_admin();
select is(
  (select suspended_at from public.accounts where id = tests.uid('suspended')), null,
  'PT-38 the account is no longer suspended'
);
select tests.as('suspended');
select lives_ok(
  format($$ insert into public.group_members (group_id, user_id) values (%L, %L) $$, tests.id('g1'), tests.uid('suspended')),
  'PT-38 an unsuspended account can write again'
);

-- PT-21  the remaining rate limits (TR-SEC-8) -----------------------------
-- Joins: 20 a day. outsider joins 20 fresh open groups, then a 21st.
select tests.as_admin();
insert into public.groups (slug, name, description, subcategory_id, region_id, area, join_policy, created_by)
select 'join-' || i, 'Join ' || i, 'A group for the join limit test.',
       (select id from public.subcategories order by sort_order limit 1),
       (select id from public.regions limit 1), 'Brevard', 'open', tests.uid('owner2')
from generate_series(1, 21) as i;
select tests.as('outsider');
select lives_ok(
  $$ insert into public.group_members (group_id, user_id)
     select id, tests.uid('outsider') from public.groups where slug like 'join-%' and slug <> 'join-21' $$,
  'PT-21 twenty joins in a day are allowed'
);
select throws_ok(
  $$ insert into public.group_members (group_id, user_id)
     values ((select id from public.groups where slug = 'join-21'), tests.uid('outsider')) $$,
  'P0001', 'rate_limited: You can join at most 20 groups a day.',
  'PT-21 the twenty-first join in a day is refused'
);

-- Reports: 10 a day. outsider already reported g2 (rep_group).
select lives_ok(
  format($$ insert into public.reports (reporter_id, target_type, target_id, reason)
            select %L, 'group', %L, 'spam' from generate_series(1, 9) $$, tests.uid('outsider'), tests.id('g1')),
  'PT-21 ten reports in a day are allowed'
);
select throws_ok(
  format($$ insert into public.reports (reporter_id, target_type, target_id, reason)
            values (%L, 'group', %L, 'spam') $$, tests.uid('outsider'), tests.id('g1')),
  'P0001', 'rate_limited: You can send at most 10 reports a day.',
  'PT-21 the eleventh report in a day is refused'
);

-- Groups: 3 created a week, separate from owning at most 3. The site admin
-- removes the first three, so the fourth is refused by the weekly limit,
-- not the ownership one.
select tests.as_admin();
update public.accounts set accepted_terms_at = now() where id = tests.uid('noterms');
select tests.as('noterms');
select lives_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by)
            select 'week-' || i, 'Week ' || i, 'A group for the weekly limit test.',
                   (select id from public.subcategories order by sort_order limit 1),
                   (select id from public.regions limit 1), 'Brevard', %L
            from generate_series(1, 3) as i $$, tests.uid('noterms')),
  'PT-21 three new groups in a week are allowed'
);
select tests.as_admin();
update public.groups set status = 'removed' where slug like 'week-%';
select tests.as('noterms');
select throws_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by)
            select 'week-4', 'Week 4', 'One too many this week.', s.id, r.id, 'Brevard', %L
            from public.subcategories s, public.regions r limit 1 $$, tests.uid('noterms')),
  'P0001', 'rate_limited: You can create at most 3 groups a week.',
  'PT-21 a fourth new group in a week is refused, even owning none'
);

-- PT-39  SECURITY DEFINER allow-list -----------------------------
-- A SECURITY DEFINER function runs with the owner's rights and skips RLS,
-- so each one is a deliberate exception. A new one fails here by name until
-- it is reviewed and added to this list.
select tests.as_admin();
set local search_path = public, extensions, pg_catalog;
create temporary table definer_allowed (signature text primary key) on commit drop;
insert into definer_allowed values
  ('admin_candidate_counts()'),
  ('admin_candidates()'),
  ('approve_claim(uuid)'),
  ('approve_new_group(uuid)'),
  ('approve_member(uuid, uuid)'),
  ('archive_group(uuid, text)'),
  ('before_insert_limit_guard()'),
  ('can_moderate(uuid)'),
  ('can_write()'),
  ('cancel_manager_invite(uuid)'),
  ('check_post_rate_limit()'),
  ('complete_onboarding(text, text, text, boolean, boolean)'),
  ('create_invite_link(uuid, integer)'),
  ('decline_claim(uuid)'),
  ('decline_member(uuid, uuid)'),
  ('decline_new_group(uuid, text)'),
  ('delete_declined_group(uuid)'),
  ('delete_my_account()'),
  ('delete_own_post(report_target, uuid)'),
  ('event_going_count(uuid)'),
  ('event_rsvps_before_write()'),
  ('event_waitlist_place(uuid)'),
  ('events_source_url_guard()'),
  ('first_group_needs_review()'),
  ('group_claims_before_insert()'),
  ('group_discussions_open(uuid)'),
  ('group_is_active(uuid)'),
  ('group_is_visible(uuid)'),
  ('has_approved_group(uuid)'),
  ('group_member_count(uuid)'),
  ('group_members_after_delete()'),
  ('group_members_before_insert()'),
  ('group_members_log_join()'),
  ('group_members_manager_limit()'),
  ('groups_after_insert()'),
  ('groups_before_insert()'),
  ('groups_before_update()'),
  ('handle_new_user()'),
  ('invite_manager(uuid, text)'),
  ('invite_preview(text)'),
  ('invite_members(uuid, text[])'),
  ('is_group_admin(uuid)'),
  ('is_group_member(uuid)'),
  ('is_group_owner(uuid)'),
  ('is_site_admin()'),
  ('join_answers(uuid)'),
  ('join_by_invite(text)'),
  ('list_candidate(uuid)'),
  ('move_from_waitlist(uuid, uuid)'),
  ('member_list_visible(uuid)'),
  ('log_moderation(moderation_action_type, report_target, uuid, uuid, text, jsonb)'),
  ('open_manager_invites(uuid)'),
  ('profiles_before_update()'),
  ('remove_group(uuid, text)'),
  ('remove_member(uuid, uuid, text)'),
  ('remove_post(report_target, uuid, text)'),
  ('replies_after_insert()'),
  ('replies_before_insert()'),
  ('report_reporters(uuid)'),
  ('reports_before_insert()'),
  ('require_writer()'),
  ('resolve_report(uuid, report_status)'),
  ('restore_group(uuid)'),
  ('set_member_role(uuid, uuid, member_role)'),
  ('set_suggestion_status(uuid, suggestion_status, text)'),
  ('set_thread_flags(uuid, boolean, boolean)'),
  ('skip_candidate(uuid)'),
  ('suggestions_before_insert()'),
  ('suspend_user(uuid, text)'),
  ('threads_before_insert()'),
  ('transfer_ownership(uuid, uuid)'),
  ('turn_off_invite_link(uuid)'),
  ('unsuspend_user(uuid)');
create temporary view definer_actual as
  select p.proname || '(' || oidvectortypes(p.proargtypes) || ')' as signature
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef;
select is(
  array(select signature from definer_actual except select signature from definer_allowed order by 1),
  '{}'::text[],
  'PT-39 every SECURITY DEFINER function in public is on the reviewed list (any listed here are new)'
);
select is(
  array(select signature from definer_allowed except select signature from definer_actual order by 1),
  '{}'::text[],
  'PT-39 the list names no function that is gone or no longer SECURITY DEFINER'
);

select * from finish();
rollback;
