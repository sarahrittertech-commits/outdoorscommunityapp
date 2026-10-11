-- UC-33, tell people about yourself: FR-PR-1 to FR-PR-10 and TR-SEC-12
-- (the private profile-photos bucket). PT-190 to PT-202.
begin;
select plan(99);
select tests.build_fixture();

select tests.make_user('cofan');      -- will join g1 as a plain member
select tests.make_user('neworg');     -- owns a group still waiting for review
select tests.as_admin();
insert into public.group_members (group_id, user_id, role, status)
values (tests.id('g1'), tests.uid('cofan'), 'member', 'active');
insert into public.groups (slug, name, description, subcategory_id, region_id, area, join_policy, created_by)
select 'g-waiting', 'Waiting Group', 'A group waiting for review.', s.id, r.id, 'Brevard', 'open', tests.uid('neworg')
from public.subcategories s, public.regions r limit 1;
update public.groups set review_status = 'pending' where slug = 'g-waiting';

create function pg_temp.cat(p_n int) returns uuid
language sql stable as $$ select id from public.categories order by sort_order, slug offset p_n - 1 limit 1 $$;
create function pg_temp.card_town(p_user text) returns text
language sql stable as $$ select town from public.profile_card(tests.uid(p_user)) $$;
create function pg_temp.can_view(p_user text) returns boolean
language sql stable as $$ select can_view from public.profile_card(tests.uid(p_user)) $$;
create function pg_temp.rows_of(p_table text, p_user text) returns int
language plpgsql stable as $$
declare n int;
begin
  execute format('select count(*)::int from public.%I where user_id = %L', p_table, tests.uid(p_user)) into n;
  return n;
end $$;
create function pg_temp.photo(p_user text, p_name text) returns text
language sql stable as $$ select tests.uid(p_user) || '/' || p_name || '.webp' $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Member and owner fill in their profiles --------------------------------------
select tests.as('member');
select lives_ok(
  format($$ select public.save_about_me('Member', 'Brevard', 'Weekend hiker.', false, '{}',
            array[%L, %L]::uuid[], array['always_wanted', 'favorite_place'], array['snowboarding', 'the Tetons'],
            array['Summit Mount Mitchell', '', 'Paddle Section 9'], array[true, false, false]) $$, pg_temp.cat(1), pg_temp.cat(2)),
  'PT-190 a member saves their profile in one go'
);
select is(pg_temp.rows_of('profile_goals', 'member'), 2, 'PT-190 blank goal rows are skipped');
select is(
  (select string_agg(body || ':' || done, ',' order by position) from public.profile_goals where user_id = tests.uid('member')),
  'Summit Mount Mitchell:true,Paddle Section 9:false',
  'PT-190 goals keep their order and ticks'
);
select is(
  (select year from public.profile_goals where user_id = tests.uid('member') limit 1),
  public.profile_goal_year(),
  'PT-190 goals belong to the current year, by the server''s clock'
);
select tests.as('owner');
select public.save_about_me('Owner', 'Asheville', 'I run Group One.', false, '{}', array[pg_temp.cat(1)]::uuid[],
  '{}', '{}', array['Lead ten hikes'], array[false]);

-- PT-190: rules 1 and 5 -------------------------------------------------------------
select tests.as('member');
select is(pg_temp.card_town('member'), 'Brevard', 'PT-190 a member sees their own profile');
select tests.as('siteadmin');
select is(pg_temp.card_town('member'), 'Brevard', 'PT-190 the site admin sees any profile');
select tests.as('outsider');
select is(pg_temp.can_view('member'), false, 'PT-190 a member who shares no group sees the display name only');
select is(pg_temp.card_town('member'), null, 'PT-190 ...and no town');
select is(pg_temp.rows_of('profile_activities', 'member'), 0, 'PT-190 ...and no activities');
select is(pg_temp.rows_of('profile_prompts', 'member'), 0, 'PT-190 ...and no fill-in-the-blanks');
select is(pg_temp.rows_of('profile_goals', 'member'), 0, 'PT-190 ...and no goals');
select is((select count(*)::int from public.profile_about where user_id = tests.uid('member')), 0, 'PT-190 profile_about rows are the owner''s alone');
select is((select display_name from public.profiles where id = tests.uid('member')), 'Member', 'PT-190 the display name stays public');
select tests.as_anon();
select is(pg_temp.can_view('member'), false, 'PT-190 a visitor does not see a regular member''s profile');
select is(pg_temp.rows_of('profile_activities', 'member'), 0, 'PT-190 ...nor their activities through the API');
select is((select display_name from public.profiles where id = tests.uid('member')), 'Member', 'PT-190 a visitor still sees the display name');
select is((select could_see_more from public.profile_card(tests.uid('member'))), false,
  'PT-190 signing in would not help: the member has not opted in');

-- PT-191: rule 2, organizers of listed groups are public ---------------------------
select tests.as_anon();
select is(pg_temp.card_town('owner'), 'Asheville', 'PT-191 a visitor sees a page admin''s profile');
select is(pg_temp.rows_of('profile_activities', 'owner'), 1, 'PT-191 ...and their activities');
select is(pg_temp.rows_of('profile_goals', 'owner'), 1, 'PT-191 ...and this year''s goals');
select is(pg_temp.can_view('admin'), true, 'PT-191 a page manager''s profile is public too');
select is(pg_temp.can_view('neworg'), false, 'PT-191 owning a group still waiting for review does not make a profile public');
select tests.as_admin();
update public.group_members set role = 'member' where group_id = tests.id('g1') and user_id = tests.uid('admin');
select tests.as_anon();
select is(pg_temp.can_view('admin'), false, 'PT-191 a former manager''s profile is private again');

-- PT-192: rule 3, organizers see members and requesters of their groups -------------
select tests.as('owner');
select is(pg_temp.card_town('member'), 'Brevard', 'PT-192 an organizer sees a member of their group');
select is(pg_temp.can_view('banned'), false, 'PT-192 ...but not someone banned from it');
select tests.as('owner2');
select is(pg_temp.can_view('pending'), true, 'PT-192 an organizer sees someone asking to join their group');
select is(pg_temp.can_view('member'), false, 'PT-192 an organizer of group B does not see a member of only group A');
select is(pg_temp.rows_of('profile_prompts', 'member'), 0, 'PT-192 ...nor their fill-in-the-blanks');
select tests.as('cofan');
select is(pg_temp.can_view('pending'), false, 'PT-192 a plain member does not see a requester');

-- PT-193: rule 4, opting in shares with co-members of active groups -----------------
select tests.as('cofan');
select is(pg_temp.can_view('member'), false, 'PT-193 by default, a fellow member sees the display name only');
select tests.as('member');
select public.save_about_me('Member', 'Brevard', 'Weekend hiker.', true, '{}',
  array[pg_temp.cat(1), pg_temp.cat(2)]::uuid[], array['always_wanted', 'favorite_place'], array['snowboarding', 'the Tetons'],
  array['Summit Mount Mitchell', 'Paddle Section 9'], array[true, false]);
select tests.as('cofan');
select is(pg_temp.card_town('member'), 'Brevard', 'PT-193 after opting in, a fellow member sees the profile');
select is(pg_temp.rows_of('profile_goals', 'member'), 2, 'PT-193 ...and its goals');
select tests.as('outsider');
select is(pg_temp.can_view('member'), false, 'PT-193 opting in does not share with members of other groups');
select tests.as('pending');
select is(pg_temp.can_view('member'), false, 'PT-193 ...nor with someone whose own membership is only pending');
select tests.as_anon();
select is(pg_temp.can_view('member'), false, 'PT-193 ...nor with visitors');
select is((select could_see_more from public.profile_card(tests.uid('member'))), true,
  'PT-193 a visitor is told signing in might show more');
select tests.as('owner');
select public.archive_group(tests.id('g1'));
select tests.as('cofan');
select is(pg_temp.can_view('member'), false, 'PT-193 sharing an archived group no longer counts');
select tests.as('owner');
select public.restore_group(tests.id('g1'));

-- PT-194: Show or Hide, enforced through the API ----------------------------------
select tests.as('member');
select public.save_about_me('Member', 'Brevard', 'Weekend hiker.', true, array['town', 'activities', 'goals'],
  array[pg_temp.cat(1), pg_temp.cat(2)]::uuid[], array['always_wanted', 'favorite_place'], array['snowboarding', 'the Tetons'],
  array['Summit Mount Mitchell', 'Paddle Section 9'], array[true, false]);
select tests.as('owner');
select is(pg_temp.card_town('member'), null, 'PT-194 a hidden town is not returned');
select is((select bio from public.profile_card(tests.uid('member'))), 'Weekend hiker.', 'PT-194 a shown blurb still is');
select is(pg_temp.rows_of('profile_activities', 'member'), 0, 'PT-194 hidden activities cannot be read through the API');
select is(pg_temp.rows_of('profile_goals', 'member'), 0, 'PT-194 hidden goals cannot be read through the API');
select is(pg_temp.rows_of('profile_prompts', 'member'), 2, 'PT-194 shown fill-in-the-blanks still can');
select tests.as('siteadmin');
select is(pg_temp.card_town('member'), null, 'PT-194 a hidden section is hidden from the site admin too');
select tests.as('member');
select is(pg_temp.card_town('member'), 'Brevard', 'PT-194 the owner still sees what they hid');
select is(pg_temp.rows_of('profile_activities', 'member'), 2, 'PT-194 ...including hidden activities');
select tests.as_anon();
select is((select show_groups from public.profile_card(tests.uid('owner'))), true, 'PT-194 the groups section is shown by default');

-- PT-195: earlier years' goals are the owner's alone, and read-only -----------------
select tests.as_admin();
alter table public.profile_goals disable trigger profile_goals_before_insert;
insert into public.profile_goals (user_id, year, position, body, done)
values (tests.uid('owner'), public.profile_goal_year() - 1, 1, 'Last year''s goal', true);
alter table public.profile_goals enable trigger profile_goals_before_insert;
select tests.as_anon();
select is(pg_temp.rows_of('profile_goals', 'owner'), 1, 'PT-195 visitors see only this year''s goals of a public profile');
select tests.as('owner');
select is(pg_temp.rows_of('profile_goals', 'owner'), 2, 'PT-195 the owner sees earlier years too');
update public.profile_goals set body = 'Rewritten' where user_id = tests.uid('owner') and year < public.profile_goal_year();
select is(
  (select body from public.profile_goals where user_id = tests.uid('owner') and year < public.profile_goal_year()),
  'Last year''s goal', 'PT-195 an earlier year''s list cannot be changed'
);
select lives_ok(
  $$ insert into public.profile_goals (user_id, position, body) values (tests.uid('owner'), 2, 'Sneaky') $$,
  'PT-195 a new goal goes in...'
);
select is(
  (select year from public.profile_goals where user_id = tests.uid('owner') and body = 'Sneaky'), public.profile_goal_year(),
  'PT-195 ...always in the current year'
);

-- PT-196: limits -------------------------------------------------------------------
select tests.as('member');
select throws_ok(
  $$ insert into public.profile_prompts (user_id, prompt_key, answer) values (tests.uid('member'), 'Bad Key!', 'x') $$,
  '23514', null, 'PT-196 a prompt key of the wrong shape is refused'
);
select lives_ok(
  $$ insert into public.profile_prompts (user_id, prompt_key, answer, position) values (tests.uid('member'), 'proudest', 'A 14er', 3) $$,
  'PT-196 a third fill-in-the-blank is allowed'
);
select throws_ok(
  $$ insert into public.profile_prompts (user_id, prompt_key, answer, position) values (tests.uid('member'), 'bucket_list', 'Denali', 3) $$,
  'P0001', 'prompts_full: Answer at most 3 fill-in-the-blanks.', 'PT-196 a fourth is refused'
);
select throws_ok(
  $$ insert into public.profile_goals (user_id, position, body) values (tests.uid('member'), 9, repeat('x', 101)) $$,
  '23514', null, 'PT-196 a goal over 100 characters is refused'
);
select lives_ok(
  $$ insert into public.profile_goals (user_id, position, body) select tests.uid('member'), i, 'Goal ' || i from generate_series(3, 10) i $$,
  'PT-196 ten goals in a year are allowed'
);
select throws_ok(
  $$ insert into public.profile_goals (user_id, position, body) values (tests.uid('member'), 10, 'One more') $$,
  'P0001', 'goals_full: Add at most 10 adventure goals a year.', 'PT-196 an eleventh is refused'
);
select throws_ok(
  $$ select public.save_about_me('Member', null, null, false, '{}', '{}', array['a1', 'a2', 'a3', 'a4'], array['x', 'x', 'x', 'x'], '{}', '{}') $$,
  'P0001', 'prompts_full: Answer at most 3 fill-in-the-blanks.', 'PT-196 the form cannot save four either'
);
select throws_ok(
  $$ select public.save_about_me('Member', null, repeat('b', 281), false, '{}', '{}', '{}', '{}', '{}', '{}') $$,
  '23514', null, 'PT-196 a blurb over 280 characters is refused'
);
select throws_ok(
  $$ select public.save_about_me('Member', null, null, false, '{}', '{}', '{}', '{}', array['x'], '{}') $$,
  'P0001', 'invalid: The form was incomplete.', 'PT-196 mismatched goal lists are refused'
);

-- PT-197: only real activity categories ---------------------------------------------
select throws_ok(
  format($$ insert into public.profile_activities (user_id, category_id) values (%L, %L) $$, tests.uid('member'), gen_random_uuid()),
  '23503', null, 'PT-197 an activity that is not a category is refused'
);

-- PT-198: who can write -----------------------------------------------------------
select tests.as_anon();
select throws_ok(
  format($$ insert into public.profile_activities (user_id, category_id) values (%L, %L) $$, tests.uid('member'), pg_temp.cat(3)),
  '42501', null, 'PT-198 a visitor never writes'
);
select throws_ok(
  $$ select public.save_about_me('X', null, null, false, '{}', '{}', '{}', '{}', '{}', '{}') $$,
  '42501', null, 'PT-198 a visitor cannot call the save function'
);
select tests.as('outsider');
select throws_ok(
  format($$ insert into public.profile_activities (user_id, category_id) values (%L, %L) $$, tests.uid('member'), pg_temp.cat(3)),
  '42501', null, 'PT-198 nobody writes someone else''s profile'
);
update public.profile_about set bio = 'hacked' where user_id = tests.uid('member');
select tests.as('member');
select is((select bio from public.profile_about where user_id = tests.uid('member')), 'Weekend hiker.', 'PT-198 ...or changes it');
select tests.as('suspended');
select throws_ok(
  $$ select public.save_about_me('Suspended', 'Brevard', null, false, '{}', '{}', '{}', '{}', '{}', '{}') $$,
  'P0001', 'not_allowed: Your account cannot make changes right now.', 'PT-198 a suspended account cannot save a profile'
);
select throws_ok(
  format($$ insert into public.profile_about (user_id, bio) values (%L, 'x') $$, tests.uid('suspended')),
  '42501', null, 'PT-198 ...nor write its about row directly'
);
select tests.as('noterms');
select throws_ok(
  $$ select public.save_about_me('Noterms', null, null, false, '{}', '{}', '{}', '{}', '{}', '{}') $$,
  'P0001', 'not_allowed: Your account cannot make changes right now.', 'PT-198 an account without the terms accepted cannot either'
);

-- PT-199: the profile-photos bucket ----------------------------------------------
select tests.as_admin();
select is((select public from storage.buckets where id = 'profile-photos'), false, 'PT-199 the bucket is private');
select tests.as('member');
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('profile-photos', %L) $$, pg_temp.photo('member', 'face0001')),
  'PT-199 a member uploads into their own folder'
);
select lives_ok(
  format($$ update public.profile_about set photo_path = %L, photo_alt = 'Member on a bike' where user_id = %L $$,
         pg_temp.photo('member', 'face0001'), tests.uid('member')),
  'PT-199 ...and makes it their photo'
);
select throws_ok(
  format($$ update public.profile_about set photo_path = %L, photo_alt = 'x' where user_id = %L $$,
         pg_temp.photo('owner', 'notmine1'), tests.uid('member')),
  '23514', null, 'PT-199 a photo path in someone else''s folder is refused'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('profile-photos', %L) $$, pg_temp.photo('owner', 'notmine1')),
  '42501', null, 'PT-199 nobody uploads into someone else''s folder'
);
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('profile-photos', %L), ('profile-photos', %L) $$,
         pg_temp.photo('member', 'spare001'), pg_temp.photo('member', 'spare002')),
  'PT-199 a folder holds up to three files'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('profile-photos', %L) $$, pg_temp.photo('member', 'spare003')),
  '42501', null, 'PT-199 a fourth file is refused'
);
select tests.as('suspended');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('profile-photos', %L) $$, pg_temp.photo('suspended', 'suspend1')),
  '42501', null, 'PT-199 a suspended account cannot upload'
);
select tests.as_anon();
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('profile-photos', %L) $$, pg_temp.photo('member', 'anonymus')),
  '42501', null, 'PT-199 a visitor never uploads'
);
select is((select count(*)::int from storage.objects where bucket_id = 'profile-photos'), 0,
  'PT-199 a visitor cannot read a private member''s photo');
select tests.as('owner');
select is((select count(*)::int from storage.objects where bucket_id = 'profile-photos'), 1,
  'PT-199 an organizer of their group reads the current photo only, not spare files');
select tests.as('member');
select public.save_about_me('Member', 'Brevard', 'Weekend hiker.', true, array['photo'], '{}', '{}', '{}', '{}', '{}');
select tests.as('owner');
select is((select count(*)::int from storage.objects where bucket_id = 'profile-photos'), 0,
  'PT-199 a hidden photo''s file cannot be read');
select is((select photo_path from public.profile_card(tests.uid('member'))), null, 'PT-199 ...nor its path');
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where bucket_id = 'profile-photos' and name = pg_temp.photo('member', 'spare001');
select tests.as('member');
select is((select count(*)::int from storage.objects where name = pg_temp.photo('member', 'spare001')), 1,
  'PT-199 nobody else deletes a member''s file');
select lives_ok(
  format($$ delete from storage.objects where bucket_id = 'profile-photos' and name = %L $$, pg_temp.photo('member', 'spare001')),
  'PT-199 the member deletes their own file'
);
select is((select count(*)::int from storage.objects where name = pg_temp.photo('member', 'spare001')), 0, 'PT-199 ...and it is gone');

-- PT-200: the site admin clears a section, logged ---------------------------------
select tests.as('owner');
select throws_ok(
  format($$ select public.clear_profile_section(%L, 'bio', 'x') $$, tests.uid('member')),
  'P0001', 'not_allowed: Only the site admin can clear part of someone''s profile.', 'PT-200 an organizer cannot clear a profile section'
);
select tests.as('siteadmin');
select lives_ok(
  format($$ select public.clear_profile_section(%L, 'bio', 'Phone number in blurb') $$, tests.uid('member')),
  'PT-200 the site admin clears a blurb'
);
select is(
  public.clear_profile_section(tests.uid('member'), 'photo', 'Not a photo of a person'),
  pg_temp.photo('member', 'face0001'),
  'PT-200 removing a photo returns its file for deletion'
);
select lives_ok(
  format($$ select public.clear_profile_section(%L, 'prompts', '') $$, tests.uid('member')),
  'PT-200 the site admin clears fill-in-the-blanks'
);
select throws_ok(
  format($$ select public.clear_profile_section(%L, 'nonsense', '') $$, tests.uid('member')),
  'P0001', 'invalid: No such section.', 'PT-200 an unknown section is refused'
);
select lives_ok(
  format($$ delete from storage.objects where bucket_id = 'profile-photos' and name = %L $$, pg_temp.photo('member', 'face0001')),
  'PT-200 the site admin deletes the removed photo''s file'
);
select tests.as_admin();
select is(
  (select coalesce(bio, 'none') || '|' || coalesce(photo_path, 'none') from public.profile_about where user_id = tests.uid('member')),
  'none|none', 'PT-200 the blurb and photo are gone'
);
select is(
  (select count(*)::int from public.moderation_actions
    where action = 'remove_content' and target_type = 'profile' and target_id = tests.uid('member')),
  3, 'PT-200 each removal is in the moderation log'
);
select is(
  (select content_snapshot ->> 'bio' from public.moderation_actions
    where target_id = tests.uid('member') and content_snapshot ->> 'section' = 'bio'),
  'Weekend hiker.', 'PT-200 the log keeps what was removed'
);

-- PT-201: "Groups" lists only what the reader may see of each group's member list --
select tests.as_admin();
update public.groups set member_list_visibility = 'signed_in' where id = tests.id('g1');
update public.groups set member_list_visibility = 'organizers' where id = tests.id('g3');
select tests.as('owner2');
select is(
  (select array_agg(g.slug order by g.slug) from public.group_members m join public.groups g on g.id = m.group_id
    where m.user_id = tests.uid('member') and m.status = 'active'),
  array['g1']::text[],
  'PT-201 a group whose member list is for organizers only does not appear'
);
select tests.as('cofan');
select is(
  (select count(*)::int from public.group_members m where m.user_id = tests.uid('pending')),
  0, 'PT-201 a pending request does not appear to other members'
);
select is(
  (select count(*)::int from public.group_members m where m.user_id = tests.uid('banned')),
  0, 'PT-201 a ban never appears'
);

-- PT-202: deleting the account clears the About me sections --------------------------
select tests.as('owner2');
select public.save_about_me('Owner2', 'Brevard', 'Bye soon.', false, '{}', array[pg_temp.cat(1)]::uuid[],
  array['always_wanted'], array['skydiving'], array['Leave'], array[false]);
select public.delete_my_account();
select tests.as_admin();
select is(
  (select count(*)::int from public.profile_about where user_id = tests.uid('owner2'))
  + (select count(*)::int from public.profile_activities where user_id = tests.uid('owner2'))
  + (select count(*)::int from public.profile_prompts where user_id = tests.uid('owner2'))
  + (select count(*)::int from public.profile_goals where user_id = tests.uid('owner2')),
  0, 'PT-202 deleting an account removes every About me section'
);
select is((select display_name from public.profiles where id = tests.uid('owner2')), null, 'PT-202 ...and the display name, as before');

-- Onboarding writes the blurb and town to the About me profile ------------------------
select tests.as_admin();
update public.accounts set accepted_terms_at = null where id = tests.uid('cofan');
select tests.as('cofan');
select public.complete_onboarding('Cofan', 'Just here for the hikes.', 'Brevard', true, true);
select is(
  (select town || '|' || bio from public.profile_about where user_id = tests.uid('cofan')),
  'Brevard|Just here for the hikes.', 'Onboarding saves the town and blurb to the About me profile'
);

select * from finish();
rollback;
