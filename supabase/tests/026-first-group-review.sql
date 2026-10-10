-- UC-27: a person's first group waits for the site admin (FR-GR-8,
-- FR-GR-21, FR-GR-22). PT-160..PT-169.
begin;
select plan(50);
select tests.build_fixture();

-- PT-160  a first-time organizer's group waits for review ----------------
-- outsider owns nothing and has no approved claim.
select tests.as('outsider');
select is(public.first_group_needs_review(), true, 'PT-160 the form can tell a first-time organizer their group will be checked');
select lives_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by)
            select 'first-try', 'First Try', 'My first group.', s.id, r.id, 'Brevard', %L
            from public.subcategories s, public.regions r limit 1 $$, tests.uid('outsider')),
  'PT-160 a first-time organizer can start a group'
);
select tests.as_admin();
select is(
  (select review_status::text || '|' || status::text from public.groups where slug = 'first-try'),
  'pending|active',
  'PT-160 their first group starts waiting for review'
);
select is(
  (select count(*)::int from public.groups where slug in ('g1', 'g2', 'g3') and review_status = 'approved'), 3,
  'PT-160 groups made outside the app (the fixture, the operator) are approved'
);

-- PT-161  people who have been checked once skip review --------------------
-- owner already owns approved g1 and g3.
select tests.as('owner');
select is(public.first_group_needs_review(), false, 'PT-161 an organizer with an approved group is not told to wait');
select lives_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by)
            select 'owner-more', 'Owner More', 'Another one.', s.id, r.id, 'Brevard', %L
            from public.subcategories s, public.regions r limit 1 $$, tests.uid('owner')),
  'PT-161 an organizer with an approved group starts another'
);
select is(
  (select review_status::text from public.groups where slug = 'owner-more'), 'approved',
  'PT-161 it is listed at once'
);
-- An approved claim counts too (FR-GR-10).
select tests.as_admin();
insert into public.group_claims (group_id, user_id, note) values (tests.id('g2'), tests.uid('banned'), 'I run it with owner2.');
update public.group_claims set status = 'approved', decided_at = now() where user_id = tests.uid('banned');
select tests.as('banned');
select is(public.first_group_needs_review(), false, 'PT-161 someone who had a claim approved skips review');

-- PT-162  only its owner, its page managers and the site admin see it ------
select tests.as_admin();
insert into public.group_members (group_id, user_id, role, status)
select id, tests.uid('admin'), 'admin', 'active' from public.groups where slug = 'first-try';
select tests.as_anon();
select is((select count(*)::int from public.groups where slug = 'first-try'), 0, 'PT-162 a visitor cannot see a group waiting for review');
select tests.as('member');
select is((select count(*)::int from public.groups where slug = 'first-try'), 0, 'PT-162 another member cannot see it');
select tests.as('outsider');
select is((select count(*)::int from public.groups where slug = 'first-try'), 1, 'PT-162 its owner sees it');
select tests.as('admin');
select is((select count(*)::int from public.groups where slug = 'first-try'), 1, 'PT-162 its page manager sees it');
select tests.as('siteadmin');
select is((select count(*)::int from public.groups where slug = 'first-try'), 1, 'PT-162 the site admin sees it');

-- PT-163  it stays out of the listings; its events stay hidden with it ----
select tests.as('outsider');
select lives_ok(
  format($$ insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name, created_by)
            select id, 'First outing', now() + interval '3 days', now() + interval '3 days 2 hours',
                   'America/New_York', 'The lake', %L
            from public.groups where slug = 'first-try' $$, tests.uid('outsider')),
  'PT-163 the owner posts an event while waiting'
);
select lives_ok(
  $$ update public.groups set description = 'My first group, edited.' where slug = 'first-try' $$,
  'PT-163 the owner edits it while waiting'
);
select is(
  (select description from public.groups where slug = 'first-try'), 'My first group, edited.',
  'PT-163 the edit is saved'
);
select is((select count(*)::int from public.group_listings where slug = 'first-try'), 0, 'PT-163 not in group listings, even for its owner');
select is(
  (select count(*)::int from public.event_listings where title = 'First outing'), 0,
  'PT-163 its event is not in event listings, even for its owner'
);
select is((select count(*)::int from public.events where title = 'First outing'), 1, 'PT-163 the owner still sees their own event');
select tests.as_anon();
select is((select count(*)::int from public.events where title = 'First outing'), 0, 'PT-163 a visitor cannot see its event');
select is(
  (select coalesce(sum(group_count), 0)::int from public.subcategory_group_counts),
  (select count(*)::int from public.group_listings where status = 'active'),
  'PT-163 browse counts leave it out'
);

-- PT-164  nobody joins a group waiting for review -------------------------
select tests.as('member');
select throws_ok(
  format($$ insert into public.group_members (group_id, user_id)
            values ((select id from public.groups g where g.created_by = %L and g.slug = 'first-try'), %L) $$,
         tests.uid('outsider'), tests.uid('member')),
  '42501', null,
  'PT-164 joining a group waiting for review is refused'
);
select tests.as_admin();
select is(
  (select count(*)::int from public.group_members m join public.groups g on g.id = m.group_id
    where g.slug = 'first-try' and m.user_id = tests.uid('member')), 0,
  'PT-164 no membership was made'
);

-- PT-165  the limit of 3 counts groups waiting for review (FR-GR-7) -------
select tests.as('outsider');
select lives_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by)
            select 'try-' || i, 'Try ' || i, 'Another try.', s.id, r.id, 'Brevard', %L
            from (select id from public.subcategories limit 1) s, (select id from public.regions limit 1) r,
                 generate_series(2, 3) as i $$, tests.uid('outsider')),
  'PT-165 two more groups waiting for review'
);
select throws_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by)
            select 'try-4', 'Try 4', 'One too many.', s.id, r.id, 'Brevard', %L
            from public.subcategories s, public.regions r limit 1 $$, tests.uid('outsider')),
  'P0001', 'group_limit: You can own at most 3 groups.',
  'PT-165 a fourth is refused while three wait for review'
);

-- PT-166  only the site admin approves; then later groups list at once ----
select tests.as('outsider');
select throws_ok(
  $$ select public.approve_new_group((select id from public.groups where slug = 'first-try')) $$,
  'P0001', 'not_allowed: Only the site admin can approve new groups.',
  'PT-166 an owner cannot approve their own group'
);
select tests.as('member');
select lives_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by)
            select 'm-first', 'Member First', 'A member starts a group.', s.id, r.id, 'Brevard', %L
            from public.subcategories s, public.regions r limit 1 $$, tests.uid('member')),
  'PT-166 a member starts their first group'
);
select tests.as('siteadmin');
select lives_ok(
  $$ select public.approve_new_group((select id from public.groups where slug = 'm-first')) $$,
  'PT-166 the site admin approves it'
);
select throws_ok(
  $$ select public.approve_new_group((select id from public.groups where slug = 'm-first')) $$,
  'P0001', 'not_found: No group waiting for review with that id.',
  'PT-166 a group already approved cannot be approved again'
);
select is(
  (select count(*)::int from public.moderation_actions m join public.groups g on g.id = m.target_id
    where g.slug = 'm-first' and m.action = 'approve_group'), 1,
  'PT-166 approving is written to the moderation log'
);
select tests.as_anon();
select is((select count(*)::int from public.group_listings where slug = 'm-first'), 1, 'PT-166 an approved group is listed');
select tests.as('outsider');
select lives_ok(
  format($$ insert into public.group_members (group_id, user_id)
            values ((select id from public.groups where slug = 'm-first'), %L) $$, tests.uid('outsider')),
  'PT-166 an approved group can be joined'
);
select tests.as('member');
select lives_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by)
            select 'm-second', 'Member Second', 'A second group.', s.id, r.id, 'Brevard', %L
            from public.subcategories s, public.regions r limit 1 $$, tests.uid('member')),
  'PT-166 the same organizer starts a second group'
);
select is((select review_status::text from public.groups where slug = 'm-second'), 'approved', 'PT-166 their second group is listed at once');

-- PT-167  declining needs a reason; a declined group is read-only ---------
select tests.as('siteadmin');
select throws_ok(
  $$ select public.decline_new_group((select id from public.groups where slug = 'try-2'), '  ') $$,
  'P0001', 'invalid: Give a reason of at most 500 characters.',
  'PT-167 declining without a reason is refused'
);
select throws_ok(
  $$ select public.decline_new_group((select id from public.groups where slug = 'try-2'), repeat('x', 501)) $$,
  'P0001', 'invalid: Give a reason of at most 500 characters.',
  'PT-167 a reason over 500 characters is refused'
);
select tests.as('owner');
select throws_ok(
  $$ select public.decline_new_group((select id from public.groups where slug = 'first-try'), 'no') $$,
  'P0001', 'not_allowed: Only the site admin can decline new groups.',
  'PT-167 only the site admin can decline'
);
select tests.as('siteadmin');
select lives_ok(
  $$ select public.decline_new_group((select id from public.groups where slug = 'try-2'), 'Not an outdoor group.') $$,
  'PT-167 the site admin declines with a reason'
);
select is(
  (select count(*)::int from public.moderation_actions m join public.groups g on g.id = m.target_id
    where g.slug = 'try-2' and m.action = 'decline_group' and m.reason = 'Not an outdoor group.'), 1,
  'PT-167 declining is written to the moderation log with the reason'
);
select tests.as('outsider');
select is(
  (select review_status::text || '|' || review_reason from public.groups where slug = 'try-2'),
  'declined|Not an outdoor group.',
  'PT-167 the owner sees that it was declined, and why'
);
update public.groups set description = 'Changed after decline.' where slug = 'try-2';
select isnt(
  (select description from public.groups where slug = 'try-2'), 'Changed after decline.',
  'PT-167 a declined group cannot be edited'
);
select throws_ok(
  format($$ insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name, created_by)
            select id, 'After decline', now() + interval '3 days', now() + interval '3 days 2 hours',
                   'America/New_York', 'The lake', %L
            from public.groups where slug = 'try-2' $$, tests.uid('outsider')),
  '42501', null,
  'PT-167 a declined group cannot post events'
);

-- PT-168  the owner deletes a declined group and can start again ----------
select tests.as('member');
select throws_ok(
  $$ select public.delete_declined_group((select id from public.groups where slug = 'm-first')) $$,
  'P0001', 'not_found: Only a group that wasn''t approved can be deleted.',
  'PT-168 an approved group cannot be deleted this way'
);
select tests.as('admin');
select throws_ok(
  format($$ select public.delete_declined_group(%L) $$, (select id from public.groups where slug = 'try-2')),
  'P0001', 'not_allowed: Only the page admin can delete the group.',
  'PT-168 nobody else can delete it'
);
select tests.as('outsider');
select lives_ok(
  $$ select public.delete_declined_group((select id from public.groups where slug = 'try-2')) $$,
  'PT-168 the owner deletes their declined group'
);
select lives_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by)
            select 'try-again', 'Try Again', 'A fresh start.', s.id, r.id, 'Brevard', %L
            from public.subcategories s, public.regions r limit 1 $$, tests.uid('outsider')),
  'PT-168 with the declined group gone they start again under the limit'
);
select tests.as_admin();
select is((select review_status::text from public.groups where slug = 'try-again'), 'pending', 'PT-168 and it waits for review again');

-- PT-169  groups that were never listed go with their owner's account -----
select tests.as('outsider');
select lives_ok($$ select public.delete_my_account() $$, 'PT-169 an organizer with groups waiting deletes their account');
select tests.as_admin();
select is(
  (select count(*)::int from public.groups where slug in ('first-try', 'try-3', 'try-again')), 0,
  'PT-169 their groups waiting for review are deleted with it'
);
select is(
  (select count(*)::int from public.groups where slug = 'm-first' and review_status = 'approved' and status = 'active'), 1,
  'PT-169 other people''s groups are untouched'
);

select * from finish();
rollback;
