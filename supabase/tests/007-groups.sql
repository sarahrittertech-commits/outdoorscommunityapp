-- Group lifecycle, account deletion and cover images: FR-GR-*, FR-AC-6.
begin;
select plan(34);
select tests.build_fixture();

-- Creating --------------------------------------------------------------------
select tests.as('outsider');
select lives_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by, status)
            select 'new-group', 'New Group', 'A brand new group.', s.id, r.id, 'Brevard', %L, 'archived'
            from public.subcategories s, public.regions r limit 1 $$, tests.uid('outsider')),
  'FR-GR-1 signed-in users create groups'
);
select is(
  (select status::text from public.groups where slug = 'new-group'), 'active',
  'A new group is always active, whatever the client sends'
);
select is(public.is_group_owner((select id from public.groups where slug = 'new-group')), true, 'FR-GR-1 the creator becomes the owner');
select lives_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by, needs_owner)
            select 'orphan', 'Orphan Group', 'Pretending to need an owner.', s.id, r.id, 'Brevard', %L, true
            from public.subcategories s, public.regions r limit 1 $$, tests.uid('outsider')),
  'A group can be created with needs_owner sent'
);
select is(
  (select needs_owner from public.groups where slug = 'orphan'), false,
  'A new group never starts without an owner, whatever the client sends'
);
select throws_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by)
            select 'framed', 'Framed Group', 'Made in someone else''s name.', s.id, r.id, 'Brevard', %L
            from public.subcategories s, public.regions r limit 1 $$, tests.uid('member')),
  '42501', null, 'You cannot create a group in someone else''s name'
);

-- FR-GR-7 / PT-21: owner already owns g1 and g3.
select tests.as('owner');
select lives_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by)
            select 'third', 'Third Group', 'The third one.', s.id, r.id, 'Brevard', %L
            from public.subcategories s, public.regions r limit 1 $$, tests.uid('owner')),
  'FR-GR-7 a third group is allowed'
);
select throws_ok(
  format($$ insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by)
            select 'fourth', 'Fourth Group', 'One too many.', s.id, r.id, 'Brevard', %L
            from public.subcategories s, public.regions r limit 1 $$, tests.uid('owner')),
  'P0001', 'group_limit: You can own at most 3 groups.', 'FR-GR-7 a fourth owned group is refused'
);

-- Editing ---------------------------------------------------------------------
select tests.as('member');
update public.groups set name = 'Taken Over' where id = tests.id('g1');
select is((select name from public.groups where id = tests.id('g1')), 'Group One', 'FR-GR-3 members cannot edit the group');

select tests.as('admin');
update public.groups set name = 'Group One Renamed' where id = tests.id('g1');
select is((select name from public.groups where id = tests.id('g1')), 'Group One Renamed', 'FR-GR-3 admins edit the group');
select throws_ok(
  format($$ update public.groups set status = 'removed' where id = %L $$, tests.id('g1')),
  '42501', null, 'Status cannot be changed by direct update'
);

-- Cover images (TR-SEC-9) -----------------------------------------------------
-- The unused group-covers bucket has no write policy since 20261010000004
-- (PT-77): nobody uploads into it until UC-24 adds a reviewed version.
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-covers', %L) $$, tests.id('g1') || '/cover.webp'),
  null, null, 'PT-77 admins cannot upload a cover image into the unused bucket'
);
select tests.as('member');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-covers', %L) $$, tests.id('g1') || '/cover.webp'),
  null, null, 'Members cannot upload a cover image'
);
select tests.as('admin');

-- Archiving -------------------------------------------------------------------
select throws_ok(
  format($$ select public.archive_group(%L) $$, tests.id('g1')),
  'P0001', null, 'FR-GR-6 admins cannot archive'
);
select tests.as('owner');
select lives_ok(format($$ select public.archive_group(%L) $$, tests.id('g1')), 'FR-GR-6 the owner archives');
select tests.as('member');
select throws_ok(
  format($$ insert into public.threads (group_id, author_id, title, body) values (%L, %L, 'Hi', 'Hello') $$, tests.id('g1'), tests.uid('member')),
  '42501', null, 'An archived group is read-only'
);
select tests.as_anon();
select is((select status::text from public.groups where id = tests.id('g1')), 'archived', 'FR-GR-6 an archived group is still viewable');

-- Removing --------------------------------------------------------------------
select tests.as('siteadmin');
select lives_ok(format($$ select public.remove_group(%L, 'spam') $$, tests.id('g2')), 'FR-MD-3 the site admin removes a group');
select tests.as_anon();
select is((select count(*)::int from public.groups where id = tests.id('g2')), 0, 'A removed group disappears for visitors');

-- Account deletion (FR-AC-6) --------------------------------------------------
select tests.as('member');
select lives_ok($$ select public.delete_my_account() $$, 'FR-AC-6 members can delete their account');
select tests.as_admin();
select is(
  (select count(*)::int from public.group_members where user_id = tests.uid('member')), 0,
  'FR-AC-6 deleting an account removes its memberships'
);

-- An owner who deletes their account without transferring: owner owns g1
-- (archived above), g3 and 'third'.
select tests.as('owner');
select lives_ok($$ select public.delete_my_account() $$, 'FR-AC-6 owners can delete their account without transferring');
select tests.as_admin();
select is(
  (select count(*)::int from public.groups where id in (tests.id('g1'), tests.id('g3'))
     and status = 'archived' and needs_owner), 2,
  'FR-AC-6 their groups go inactive and need an owner'
);
select is(
  (select count(*)::int from public.events where group_id = tests.id('g1') and starts_at > now() and status = 'scheduled'), 0,
  'FR-AC-6 their groups'' upcoming events are cancelled'
);
select is(
  (select count(*)::int from public.events where group_id = tests.id('g1') and starts_at < now() and status = 'scheduled'), 1,
  'FR-AC-6 past events are left as they were'
);

select tests.as('admin');
select lives_ok(
  format($$ insert into public.group_claims (group_id, user_id, note) values (%L, %L, 'I was an admin of this group.') $$,
         tests.id('g1'), tests.uid('admin')),
  'FR-GR-10 anyone signed in can ask to take over a group that needs an owner'
);
select throws_ok(
  format($$ insert into public.group_claims (group_id, user_id, note)
            select id, %L, 'This group is fine as it is.' from public.groups where slug = 'new-group' $$, tests.uid('admin')),
  '42501', null, 'Ordinary groups cannot be claimed'
);
select tests.as('siteadmin');
select throws_ok(
  format($$ select public.restore_group(%L) $$, tests.id('g1')),
  'P0001', null, 'A group that needs an owner comes back only through a claim'
);
select lives_ok(
  format($$ select public.approve_claim((select id from public.group_claims where group_id = %L and status = 'pending')) $$, tests.id('g1')),
  'FR-GR-10 the site admin approves the claim'
);
select tests.as_admin();
select is(
  (select status::text || ' ' || needs_owner::text from public.groups where id = tests.id('g1')), 'active false',
  'FR-GR-10 the group is active again'
);
select is(
  (select role::text from public.group_members where group_id = tests.id('g1') and user_id = tests.uid('admin')), 'owner',
  'FR-GR-10 the claimant owns the group'
);

-- The moderation log keeps its rows when the person in it is deleted (PT-19).
select lives_ok(
  format($$ delete from auth.users where id = %L $$, tests.uid('owner')),
  'An organizer who appears in the moderation log can be deleted'
);
select is(
  (select count(*)::int from public.moderation_actions where action = 'archive_group' and target_id = tests.id('g1') and actor_id is null), 1,
  'Their moderation log rows stay, without the actor'
);
select throws_ok(
  $$ update public.moderation_actions set actor_id = null $$,
  'P0001', null, 'The moderation log still cannot be edited directly'
);

select * from finish();
rollback;
