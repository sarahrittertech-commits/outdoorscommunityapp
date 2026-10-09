-- UC-31: page managers, invite links and email invites. PT-60..PT-69,
-- FR-MB-11 to FR-MB-16.
--
-- In the UI the owner is the *page admin* and admins are *page managers*.
begin;
select plan(63);
select tests.build_fixture();

-- PT-60  at most two page managers (FR-MB-11) ------------------------------
-- g1 already has one manager (admin).
select tests.as('owner');
select lives_ok(
  format($$ select public.set_member_role(%L, %L, 'admin') $$, tests.id('g1'), tests.uid('member')),
  'PT-60 the page admin adds a second page manager'
);
select tests.as('outsider');
insert into public.group_members (group_id, user_id) values (tests.id('g1'), tests.uid('outsider'));
select tests.as('owner');
select throws_ok(
  format($$ select public.set_member_role(%L, %L, 'admin') $$, tests.id('g1'), tests.uid('outsider')),
  'P0001', 'manager_limit: A group can have at most two page managers.',
  'PT-60 a third page manager is refused'
);
select tests.as_admin();
select throws_ok(
  format($$ update public.group_members set role = 'admin' where group_id = %L and user_id = %L $$,
         tests.id('g1'), tests.uid('outsider')),
  'P0001', 'manager_limit: A group can have at most two page managers.',
  'PT-60 the limit holds for any write, not just the function'
);

-- PT-69 (part)  transfer still works with two managers, only to a manager --
select tests.as('owner');
select throws_ok(
  format($$ select public.transfer_ownership(%L, %L) $$, tests.id('g1'), tests.uid('outsider')),
  'P0001', 'not_allowed: Ownership can only go to an admin.',
  'PT-69 ownership goes only to a page manager'
);
select tests.as('admin');
select throws_ok(
  format($$ select public.transfer_ownership(%L, %L) $$, tests.id('g1'), tests.uid('member')),
  'P0001', 'not_allowed: Only the owner can transfer ownership.',
  'PT-69 a page manager cannot transfer ownership'
);
select tests.as('owner');
select lives_ok(
  format($$ select public.transfer_ownership(%L, %L) $$, tests.id('g1'), tests.uid('admin')),
  'PT-69 the page admin hands over to a manager while there are already two'
);
select tests.as_admin();
select is(
  (select string_agg(p.display_name || '=' || m.role, ',' order by p.display_name)
     from public.group_members m join public.profiles p on p.id = m.user_id
    where m.group_id = tests.id('g1') and m.role <> 'member'),
  'Admin=owner,Member=admin,Owner=admin',
  'PT-69 the old page admin becomes a manager; still two managers'
);
-- Hand it back so the rest of the file reads naturally.
select tests.as('admin');
select public.transfer_ownership(tests.id('g1'), tests.uid('owner'));

-- PT-61  only the page admin adds or invites managers ----------------------
select tests.as('admin');
select throws_ok(
  format($$ select public.set_member_role(%L, %L, 'member') $$, tests.id('g1'), tests.uid('member')),
  'P0001', 'not_allowed: Only the owner can change roles.',
  'PT-61 a page manager cannot change roles'
);
select throws_ok(
  format($$ select public.invite_manager(%L, 'someone@example.test') $$, tests.id('g1')),
  'P0001', 'not_allowed: Only the page admin can invite a page manager.',
  'PT-61 a page manager cannot invite a page manager'
);
select tests.as('outsider');
select throws_ok(
  format($$ select public.invite_manager(%L, 'someone@example.test') $$, tests.id('g1')),
  'P0001', 'not_allowed: Only the page admin can invite a page manager.',
  'PT-61 a member cannot invite a page manager'
);

-- PT-62  open manager invites count toward the limit (FR-MB-12) ------------
-- g3: owner and member, no managers.
select tests.as('owner');
select lives_ok(
  format($$ select public.invite_manager(%L, 'Outsider@Example.test') $$, tests.id('g3')),
  'PT-62 the page admin invites a manager by email'
);
select lives_ok(
  format($$ select public.invite_manager(%L, 'pending@example.test') $$, tests.id('g3')),
  'PT-62 and a second'
);
select throws_ok(
  format($$ select public.invite_manager(%L, 'third@example.test') $$, tests.id('g3')),
  'P0001', 'manager_limit: A group can have at most two page managers.',
  'PT-62 a third open manager invite is refused'
);
select throws_ok(
  format($$ select public.set_member_role(%L, %L, 'admin') $$, tests.id('g3'), tests.uid('member')),
  'P0001', 'manager_limit: A group can have at most two page managers.',
  'PT-62 open invites block promoting a member too'
);
select is(
  (select count(*)::int from public.open_manager_invites(tests.id('g3'))), 2,
  'PT-62 the page admin sees the open manager invites they sent'
);
select tests.as_admin();
select set_config('t.cancel', (select id::text from invites.email_invites where email = 'pending@example.test'), true);
select tests.as('member');
select throws_ok(
  $$ select public.cancel_manager_invite(current_setting('t.cancel')::uuid) $$,
  'P0001', 'not_allowed: Only the page admin can cancel a manager invite.',
  'PT-62 nobody else cancels a manager invite'
);
select tests.as('owner');
select lives_ok(
  $$ select public.cancel_manager_invite(current_setting('t.cancel')::uuid) $$,
  'PT-62 the page admin cancels a manager invite'
);
select lives_ok(
  format($$ select public.set_member_role(%L, %L, 'admin') $$, tests.id('g3'), tests.uid('member')),
  'PT-62 which frees the place'
);
select tests.as_admin();
select set_config('t.mgr', (select token from invites.email_invites
                             where group_id = tests.id('g3') and email = 'outsider@example.test'), true);

select tests.as('member');
select is(
  (select count(*)::int from public.open_manager_invites(tests.id('g3'))), 0,
  'PT-62 a page manager cannot list manager invites'
);
select throws_ok(
  $$ select count(*) from invites.email_invites $$,
  '42501', null, 'PT-62 nobody reads invite addresses through the API'
);

-- A manager invite works only for the address it was sent to.
select tests.as('owner2');
select throws_ok(
  $$ select * from public.join_by_invite(current_setting('t.mgr')) $$,
  'P0001', 'invite_wrong_account: This invite is for a different email address.',
  'PT-62 another account cannot accept a manager invite'
);
select tests.as('outsider');
select is(
  (select result from public.join_by_invite(current_setting('t.mgr'))), 'manager',
  'PT-62 the invited address accepts and becomes a page manager'
);
select tests.as_admin();
select is(
  (select role::text || '/' || status::text from public.group_members
    where group_id = tests.id('g3') and user_id = tests.uid('outsider')),
  'admin/active', 'PT-62 a member and a manager at once'
);
select tests.as('outsider');
select throws_ok(
  $$ select * from public.join_by_invite(current_setting('t.mgr')) $$,
  'P0001', 'invite_invalid: That invite is not valid.',
  'PT-62 a manager invite is single use'
);

-- PT-63  invite link: page admin and managers only (FR-MB-15) --------------
select tests.as('member');
select throws_ok(
  format($$ select public.create_invite_link(%L, 30) $$, tests.id('g2')),
  'P0001', 'not_allowed: Only the page admin and page managers can make an invite link.',
  'PT-63 a non-member cannot make an invite link'
);
select tests.as('pending');
select throws_ok(
  format($$ select public.create_invite_link(%L, 30) $$, tests.id('g2')),
  'P0001', 'not_allowed: Only the page admin and page managers can make an invite link.',
  'PT-63 someone waiting for approval cannot make one'
);
select tests.as('owner2');
select throws_ok(
  format($$ select public.create_invite_link(%L, 14) $$, tests.id('g2')),
  'P0001', 'invalid: An invite link lasts 7 days, 30 days or until turned off.',
  'PT-63 only 7 days, 30 days or until turned off'
);
select set_config('t.link', public.create_invite_link(tests.id('g2'), 30), true);
select ok(current_setting('t.link') ~ '^[a-f0-9]{64}$', 'PT-63 the page admin makes a link with a long random code');
select is(
  (select token from public.group_invite_links where group_id = tests.id('g2')), current_setting('t.link'),
  'PT-63 the page admin can read the link again to copy it'
);
select tests.as_anon();
select is(
  (select name || '|' || slug from public.invite_preview(current_setting('t.link'))), 'Group Two|g2',
  'PT-65 a visitor holding the link sees only the group''s name and slug'
);
select is((select count(*)::int from public.invite_preview(repeat('0', 64))), 0, 'PT-66 a made-up code previews nothing');
select is((select count(*)::int from public.invite_preview('badtoken')), 0, 'PT-66 a malformed code previews nothing');
select tests.as('pending');
select is((select count(*)::int from public.group_invite_links), 0, 'PT-63 someone waiting cannot read invite links');
select tests.as('outsider');
select is((select count(*)::int from public.group_invite_links), 0, 'PT-63 an outsider cannot read invite links');
select tests.as_anon();
select throws_ok(
  $$ select count(*) from public.group_invite_links $$,
  '42501', null, 'PT-63 visitors cannot read invite links'
);
select tests.as('owner2');
select throws_ok(
  format($$ insert into public.group_invite_links (group_id, token) values (%L, repeat('a', 64)) $$, tests.id('g3')),
  '42501', null, 'PT-63 nobody writes invite links directly'
);

-- A manager makes one too, replacing the old one (one link per group).
select tests.as('owner');
select set_config('t.g1link', public.create_invite_link(tests.id('g1'), 7), true);
select tests.as('admin');
select set_config('t.g1link2', public.create_invite_link(tests.id('g1'), null), true);
select is(
  (select count(*)::int || '/' || coalesce(max(expires_at)::text, 'never') from public.group_invite_links where group_id = tests.id('g1')),
  '1/never', 'PT-63 a page manager replaces the link; one per group'
);

-- PT-65  joining by link skips approval (FR-MB-14) -------------------------
select tests.as('outsider');
select is(
  (select slug || '/' || result from public.join_by_invite(current_setting('t.link'))), 'g2/joined',
  'PT-65 joining by link works in an approval group'
);
select is(public.is_group_member(tests.id('g2')), true, 'PT-65 and makes you an active member at once');
select is(
  (select result from public.join_by_invite(current_setting('t.link'))), 'already_member',
  'PT-65 using it again says you are already in'
);
select tests.as('pending');
select is(
  (select result from public.join_by_invite(current_setting('t.link'))), 'joined',
  'PT-65 a waiting request is approved by the link'
);

-- PT-66  refusals -------------------------------------------------------
select tests.as('member');
select throws_ok(
  $$ select * from public.join_by_invite(current_setting('t.g1link')) $$,
  'P0001', 'invite_invalid: That invite is not valid.',
  'PT-66 a replaced link joins nobody'
);
select throws_ok(
  $$ select * from public.join_by_invite('badtoken') $$,
  'P0001', 'invite_invalid: That invite is not valid.',
  'PT-66 a made-up code joins nobody'
);
select tests.as('banned');
select throws_ok(
  $$ select * from public.join_by_invite(current_setting('t.g1link2')) $$,
  'P0001', 'cannot_join: You can''t join this group.',
  'PT-66 a banned person cannot rejoin by link'
);
select tests.as('suspended');
select throws_ok(
  $$ select * from public.join_by_invite(current_setting('t.g1link2')) $$,
  'P0001', 'not_allowed: Your account cannot make changes right now.',
  'PT-66 a suspended account cannot join by link'
);
select tests.as('member');
select throws_ok(
  format($$ select public.turn_off_invite_link(%L) $$, tests.id('g2')),
  'P0001', 'not_allowed: Only the page admin and page managers can turn off the invite link.',
  'PT-64 a member cannot turn off the link'
);
select tests.as('owner2');
select lives_ok(format($$ select public.turn_off_invite_link(%L) $$, tests.id('g2')), 'PT-64 the page admin turns off the link');
select tests.as_anon();
select is((select count(*)::int from public.invite_preview(current_setting('t.link'))), 0, 'PT-64 a turned-off link previews nothing');
select tests.as('member');
select throws_ok(
  $$ select * from public.join_by_invite(current_setting('t.link')) $$,
  'P0001', 'invite_invalid: That invite is not valid.',
  'PT-64 a turned-off link joins nobody'
);
select tests.as_admin();
update public.group_invite_links set expires_at = now() - interval '1 second' where group_id = tests.id('g1');
select tests.as('noterms');
select throws_ok(
  $$ select * from public.join_by_invite(current_setting('t.g1link2')) $$,
  'P0001', 'not_allowed: Your account cannot make changes right now.',
  'PT-66 someone who has not accepted the terms cannot join'
);
select tests.as('owner2');
select throws_ok(
  $$ select * from public.join_by_invite(current_setting('t.g1link2')) $$,
  'P0001', 'invite_invalid: That invite is not valid.',
  'PT-66 an expired link joins nobody'
);
select is((select count(*)::int from public.invite_preview(current_setting('t.g1link2'))), 0, 'PT-66 an expired link previews nothing');
select tests.as('owner');
select set_config('t.g3link', public.create_invite_link(tests.id('g3'), 30), true);
select public.archive_group(tests.id('g3'));
select tests.as('owner2');
select throws_ok(
  $$ select * from public.join_by_invite(current_setting('t.g3link')) $$,
  'P0001', 'cannot_join: This group is not taking new members.',
  'PT-66 an archived group refuses its link'
);
select tests.as('owner');
select public.restore_group(tests.id('g3'));

-- PT-67  joins by invite count toward 20 a day (FR-MB-16, TR-SEC-8) --------
select tests.as_admin();
insert into public.groups (slug, name, description, subcategory_id, region_id, area, join_policy, created_by)
select 'inv-' || i, 'Inv ' || i, 'A group for the invite join limit test.',
       (select id from public.subcategories order by sort_order limit 1),
       (select id from public.regions limit 1), 'Brevard', 'open', tests.uid('siteadmin')
from generate_series(1, 19) as i;
select tests.as('owner2');
insert into public.group_members (group_id, user_id)
select id, tests.uid('owner2') from public.groups where slug like 'inv-%';
select throws_ok(
  $$ select * from public.join_by_invite(current_setting('t.g3link')) $$,
  'P0001', 'rate_limited: You can join at most 20 groups a day.',
  'PT-67 a join by invite after twenty joins in a day is refused (owning g2 counts as one)'
);

-- PT-68  member invites by email (FR-MB-13) --------------------------------
select tests.as('member');
select throws_ok(
  format($$ select public.invite_members(%L, array['a@example.test']) $$, tests.id('g2')),
  'P0001', 'not_allowed: Only the page admin and page managers can invite people.',
  'PT-68 a non-organizer cannot send invites'
);
select tests.as('owner2');
select throws_ok(
  format($$ select public.invite_members(%L, array(select 'p' || i || '@example.test' from generate_series(1, 26) i)) $$, tests.id('g2')),
  'P0001', 'too_many_invites: At most 25 addresses per send.',
  'PT-68 a send of 26 addresses is refused'
);
select is(
  public.invite_members(tests.id('g2'), array['A@example.test', 'a@example.test', 'b@example.test']), 2,
  'PT-68 addresses are deduplicated'
);
select is(
  public.invite_members(tests.id('g2'), array['a@example.test', 'c@example.test']), 1,
  'PT-68 an address invited in the last 30 days is skipped'
);
select throws_ok($$ select count(*) from invites.email_invites $$, '42501', null,
  'PT-68 nobody can see who was invited, not even the page admin');
select public.invite_members(tests.id('g2'), array(select 'd' || i || '@example.test' from generate_series(1, 25) i));
select public.invite_members(tests.id('g2'), array(select 'e' || i || '@example.test' from generate_series(1, 25) i));
select public.invite_members(tests.id('g2'), array(select 'f' || i || '@example.test' from generate_series(1, 25) i));
select throws_ok(
  format($$ select public.invite_members(%L, array(select 'g' || i || '@example.test' from generate_series(1, 25) i)) $$, tests.id('g2')),
  'P0001', 'rate_limited: A group can send at most 100 invites a day.',
  'PT-68 more than 100 invites a day for a group are refused'
);

-- PT-69  moderation log and retention (FR-MB-16) ---------------------------
select tests.as_admin();
select is(
  (select string_agg(action::text, ',' order by action::text) from (
     select distinct action from public.moderation_actions
      where action in ('create_invite_link', 'turn_off_invite_link', 'invite_manager', 'send_invites')) a),
  'create_invite_link,invite_manager,send_invites,turn_off_invite_link',
  'PT-69 links, manager invites and email invites are in the moderation log'
);
update invites.email_invites set created_at = now() - interval '31 days' where email like 'd%';
select is(public.purge_old_invites(), 25, 'PT-69 invites older than 30 days are deleted');
select tests.as('owner2');
select throws_ok($$ select public.purge_old_invites() $$, '42501', null, 'PT-69 the cleanup is not callable through the API');

select * from finish();
rollback;
