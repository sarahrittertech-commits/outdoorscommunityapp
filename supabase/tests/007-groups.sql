-- Group lifecycle, account deletion and cover images: FR-GR-*, FR-AC-6.
begin;
select plan(20);
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
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-covers', %L) $$, tests.id('g1') || '/cover.webp'),
  'Admins upload their group''s cover image'
);
select tests.as('member');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-covers', %L) $$, tests.id('g1') || '/cover.webp'),
  '42501', null, 'Members cannot upload a cover image'
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
select tests.as('owner');
select throws_ok($$ select public.delete_my_account() $$, 'P0001', null, 'FR-AC-6 owners must transfer or archive first');
select tests.as('member');
select lives_ok($$ select public.delete_my_account() $$, 'FR-AC-6 members can delete their account');
select tests.as_admin();
select is(
  (select count(*)::int from public.group_members where user_id = tests.uid('member')), 0,
  'FR-AC-6 deleting an account removes its memberships'
);

select * from finish();
rollback;
