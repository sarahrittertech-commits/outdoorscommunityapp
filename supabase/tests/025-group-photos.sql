-- UC-21, share trip photos: FR-GR-12 (gallery), FR-GR-13 (removing and
-- reporting), TR-SEC-12 (the private group-photos bucket). PT-150 to PT-159.
begin;
select plan(53);
select tests.build_fixture();

-- <group>/<uploader>/<name>.webp, the layout the policies expect.
create function pg_temp.photo_path(p_group text, p_user text, p_name text) returns text
language sql stable as $$ select tests.id(p_group) || '/' || tests.uid(p_user) || '/' || p_name || '.webp' $$;

-- PT-150: members add photos, into their own folder ---------------------------
select tests.as('member');
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-photos', %L) $$, pg_temp.photo_path('g1', 'member', 'paddle01')),
  'PT-150 a member uploads a photo file into their own folder'
);
select lives_ok(
  format($$ insert into public.group_photos (group_id, uploader_id, path, alt) values (%L, %L, %L, 'Two kayaks at the put-in') $$,
         tests.id('g1'), tests.uid('member'), pg_temp.photo_path('g1', 'member', 'paddle01')),
  'PT-150 a member adds the photo to the gallery with alt text'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-photos', %L) $$, pg_temp.photo_path('g1', 'admin', 'notmine1')),
  '42501', null, 'PT-150 a member cannot upload into someone else''s folder'
);
select throws_ok(
  format($$ insert into public.group_photos (group_id, uploader_id, path, alt) values (%L, %L, %L, 'x') $$,
         tests.id('g1'), tests.uid('admin'), pg_temp.photo_path('g1', 'admin', 'notmine1')),
  '42501', null, 'PT-150 a member cannot add a photo as someone else'
);
select tests.as('outsider');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-photos', %L) $$, pg_temp.photo_path('g1', 'outsider', 'outside1')),
  '42501', null, 'PT-150 an outsider cannot upload a photo file'
);
select throws_ok(
  format($$ insert into public.group_photos (group_id, uploader_id, path, alt) values (%L, %L, %L, 'x') $$,
         tests.id('g1'), tests.uid('outsider'), pg_temp.photo_path('g1', 'outsider', 'outside1')),
  '42501', null, 'PT-150 an outsider cannot add a photo'
);
select tests.as('banned');
select throws_ok(
  format($$ insert into public.group_photos (group_id, uploader_id, path, alt) values (%L, %L, %L, 'x') $$,
         tests.id('g1'), tests.uid('banned'), pg_temp.photo_path('g1', 'banned', 'banned01')),
  '42501', null, 'PT-150 a banned member cannot add a photo'
);
select tests.as_anon();
select throws_ok(
  format($$ insert into public.group_photos (group_id, uploader_id, path, alt) values (%L, %L, %L, 'x') $$,
         tests.id('g1'), tests.uid('member'), pg_temp.photo_path('g1', 'member', 'anonymus')),
  '42501', null, 'PT-150 a visitor never writes'
);

-- The admin adds one too, for the report tests.
select tests.as('admin');
insert into storage.objects (bucket_id, name) values ('group-photos', pg_temp.photo_path('g1', 'admin', 'adminpic'));
insert into public.group_photos (group_id, uploader_id, path, alt)
values (tests.id('g1'), tests.uid('admin'), pg_temp.photo_path('g1', 'admin', 'adminpic'), 'The group at the summit');
select tests.as_admin();
select tests.remember(n, p.id) from public.group_photos p,
  (values ('paddle01', pg_temp.photo_path('g1', 'member', 'paddle01')), ('adminpic', pg_temp.photo_path('g1', 'admin', 'adminpic'))) v(n, path)
 where p.path = v.path;

-- PT-151: members only by default -----------------------------------------------
select tests.as('member');
select is((select count(*)::int from public.group_photos where group_id = tests.id('g1')), 2, 'PT-151 a member sees the gallery');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'group-photos' and name like tests.id('g1') || '/%'), 2,
  'PT-151 a member can read the files (so the server can sign URLs as them)'
);
select tests.as('outsider');
select is((select count(*)::int from public.group_photos), 0, 'PT-151 an outsider sees no photo rows');
select is((select count(*)::int from storage.objects where bucket_id = 'group-photos'), 0, 'PT-151 an outsider reads no photo files');
select tests.as_anon();
select is((select count(*)::int from public.group_photos), 0, 'PT-151 a visitor sees no photo rows');
select is((select count(*)::int from storage.objects where bucket_id = 'group-photos'), 0, 'PT-151 a visitor reads no photo files');
select tests.as('siteadmin');
select is((select count(*)::int from public.group_photos where group_id = tests.id('g1')), 2, 'PT-151 the site admin sees the gallery');
select tests.as_admin();
select is((select public from storage.buckets where id = 'group-photos'), false, 'PT-151 the bucket is private');

-- PT-152: alt text and the path are required and checked -----------------------
select tests.as('member');
select throws_ok(
  format($$ insert into public.group_photos (group_id, uploader_id, path, alt) values (%L, %L, %L, '  ') $$,
         tests.id('g1'), tests.uid('member'), pg_temp.photo_path('g1', 'member', 'noalttxt')),
  '23514', null, 'PT-152 a photo needs alt text'
);
select throws_ok(
  format($$ insert into public.group_photos (group_id, uploader_id, path, alt) values (%L, %L, %L, 'x') $$,
         tests.id('g1'), tests.uid('member'), pg_temp.photo_path('g3', 'member', 'wrongdir')),
  '23514', null, 'PT-152 a photo cannot point into another group''s folder'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-photos', %L) $$,
         tests.id('g1') || '/' || tests.uid('member') || '/photo.jpg'),
  '42501', null, 'PT-152 only .webp files with a random name go in'
);
select throws_ok(
  format($$ update public.group_photos set alt = 'changed' where uploader_id = %L $$, tests.uid('member')),
  '42501', null, 'PT-152 nobody updates a photo row directly'
);
select throws_ok(
  format($$ delete from public.group_photos where uploader_id = %L $$, tests.uid('member')),
  '42501', null, 'PT-152 nobody deletes a photo row directly'
);

-- PT-153: 20 uploads per member per group per day; 200 photos per gallery -------
select tests.as('member');
select lives_ok(
  format($$ insert into public.group_photos (group_id, uploader_id, path, alt)
            select %L, %L, %L || '/' || %L || '/daily' || lpad(i::text, 3, '0') || '.webp', 'Photo ' || i
            from generate_series(1, 19) as i $$,
         tests.id('g1'), tests.uid('member'), tests.id('g1'), tests.uid('member')),
  'PT-153 twenty photos in a day are allowed'
);
select throws_ok(
  format($$ insert into public.group_photos (group_id, uploader_id, path, alt) values (%L, %L, %L, 'One too many') $$,
         tests.id('g1'), tests.uid('member'), pg_temp.photo_path('g1', 'member', 'daily021')),
  'P0001', 'rate_limited: You can add at most 20 photos to a group a day.',
  'PT-153 the twenty-first photo in a day is refused'
);
-- Fill g3's gallery to 200 without the triggers (as the table owner).
select tests.as_admin();
set local session_replication_role = replica;
insert into public.group_photos (group_id, uploader_id, path, alt)
select tests.id('g3'), tests.uid('owner'), tests.id('g3') || '/' || tests.uid('owner') || '/fill' || lpad(i::text, 4, '0') || '.webp', 'Fill ' || i
from generate_series(1, 200) as i;
set local session_replication_role = origin;
select tests.as('member');
select throws_ok(
  format($$ insert into public.group_photos (group_id, uploader_id, path, alt) values (%L, %L, %L, 'Too many') $$,
         tests.id('g3'), tests.uid('member'), pg_temp.photo_path('g3', 'member', 'fullgall')),
  'P0001', 'gallery_full: A group''s gallery holds at most 200 photos.',
  'PT-153 a gallery holds at most 200 photos'
);
select tests.as_admin();
set local session_replication_role = replica;
delete from public.group_photos where group_id = tests.id('g3');
set local session_replication_role = origin;

-- PT-154: the uploader deletes their own photo ---------------------------------
select tests.as('outsider');
select throws_ok(
  format($$ select public.remove_group_photo(%L) $$, tests.id('paddle01')),
  'P0001', 'not_allowed: Only the person who added a photo or the group''s organizers can remove it.',
  'PT-154 an outsider cannot remove a photo'
);
select tests.as('member');
select is(
  public.remove_group_photo((select id from public.group_photos where path = pg_temp.photo_path('g1', 'member', 'daily001'))),
  pg_temp.photo_path('g1', 'member', 'daily001'),
  'PT-154 the uploader deletes their own photo and gets the file path back'
);
select is(
  (select count(*)::int from public.group_photos where path = pg_temp.photo_path('g1', 'member', 'daily001')), 0,
  'PT-154 a deleted photo leaves the gallery'
);
select throws_ok(
  format($$ insert into public.group_photos (group_id, uploader_id, path, alt) values (%L, %L, %L, 'After deleting') $$,
         tests.id('g1'), tests.uid('member'), pg_temp.photo_path('g1', 'member', 'daily022')),
  'P0001', 'rate_limited: You can add at most 20 photos to a group a day.',
  'PT-154 deleting a photo does not reset the daily limit'
);
select set_config('storage.allow_delete_query', 'true', true);
select lives_ok(
  format($$ delete from storage.objects where bucket_id = 'group-photos' and name = %L $$, pg_temp.photo_path('g1', 'member', 'paddle01')),
  'PT-154 the uploader removes their own file'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'group-photos' and name = pg_temp.photo_path('g1', 'member', 'paddle01')), 0,
  'PT-154 the file is gone'
);
select tests.as('member');
delete from storage.objects where bucket_id = 'group-photos' and name = pg_temp.photo_path('g1', 'admin', 'adminpic');
select tests.as_admin();
select is(
  (select count(*)::int from storage.objects where name = pg_temp.photo_path('g1', 'admin', 'adminpic')), 1,
  'PT-154 a member cannot delete someone else''s file'
);

-- PT-155: organizers remove any photo, logged as moderation ---------------------
select tests.as('admin');
select lives_ok(
  format($$ select public.remove_group_photo(%L, 'Breaks the group rules') $$,
         tests.id('paddle01')),
  'PT-155 an admin removes a member''s photo'
);
select tests.as_admin();
select is(
  (select status from public.group_photos where path = pg_temp.photo_path('g1', 'member', 'paddle01')), 'removed',
  'PT-155 the photo is marked removed'
);
select is(
  (select count(*)::int from public.moderation_actions
    where action = 'remove_content' and target_type = 'photo' and group_id = tests.id('g1')
      and content_snapshot->>'alt' = 'Two kayaks at the put-in'),
  1, 'PT-155 removing is logged with what was removed'
);
select tests.as('admin');
insert into storage.objects (bucket_id, name) values ('group-photos', pg_temp.photo_path('g1', 'admin', 'spare001'));
select tests.as('owner');
select lives_ok(
  format($$ delete from storage.objects where bucket_id = 'group-photos' and name = %L $$, pg_temp.photo_path('g1', 'admin', 'spare001')),
  'PT-155 the owner removes any file in the group''s folder'
);
select tests.as('member');
select throws_ok(
  format($$ select public.remove_group_photo(%L) $$, tests.id('paddle01')),
  'P0001', 'not_found: No such photo.',
  'PT-155 a removed photo cannot be removed again'
);

-- PT-156: photos can be reported; the report reaches the group's organizers ----
select tests.as('member');
select lives_ok(
  format($$ insert into public.reports (reporter_id, target_type, target_id, reason)
            values (%L, 'photo', %L, 'unsafe') $$,
         tests.uid('member'), (select id from public.group_photos where path = pg_temp.photo_path('g1', 'member', 'daily002'))),
  'PT-156 a member reports a photo'
);
select tests.as_admin();
select tests.remember('report1', id) from public.reports where target_type = 'photo' and reporter_id = tests.uid('member');
select is(
  (select group_id from public.reports where id = tests.id('report1')),
  tests.id('g1'), 'PT-156 the report is routed to the photo''s group'
);
select tests.as('outsider');
select throws_ok(
  format($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (%L, 'photo', %L, 'spam') $$,
         tests.uid('outsider'), tests.id('adminpic')),
  'P0001', 'not_found: The reported item does not exist.',
  'PT-156 a photo you cannot see cannot be reported'
);
select tests.as('owner');
select lives_ok(
  format($$ select public.resolve_report(%L, 'dismissed') $$,
         tests.id('report1')),
  'PT-156 the group''s owner handles a report about a member''s photo'
);
select tests.as('member');
insert into public.reports (reporter_id, target_type, target_id, reason)
values (tests.uid('member'), 'photo', tests.id('adminpic'), 'other');
select tests.as_admin();
select tests.remember('report2', id) from public.reports where target_type = 'photo' and status = 'open';
select tests.as('owner');
select throws_ok(
  format($$ select public.resolve_report(%L, 'dismissed') $$,
         tests.id('report2')),
  'P0001', 'own_content: A report about an organizer''s post goes to the site admin.',
  'PT-156 a report about an organizer''s photo goes to the site admin'
);

-- PT-157: only the page admin makes a gallery public ----------------------------
select tests.as('admin');
select throws_ok(
  format($$ select public.set_group_photos_public(%L, true) $$, tests.id('g1')),
  'P0001', 'not_allowed: Only the page admin can change who sees the photos.',
  'PT-157 a page manager cannot make the gallery public'
);
select throws_ok(
  format($$ update public.groups set photos_public = true where id = %L $$, tests.id('g1')),
  '42501', null, 'PT-157 nobody sets photos_public with a plain update'
);
select tests.as('owner');
select lives_ok(format($$ select public.set_group_photos_public(%L, true) $$, tests.id('g1')), 'PT-157 the page admin makes it public');
select tests.as_anon();
select is((select count(*)::int from public.group_photos where group_id = tests.id('g1')), 19, 'PT-157 a visitor sees a public gallery');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'group-photos' and name = pg_temp.photo_path('g1', 'admin', 'adminpic')), 1,
  'PT-157 a visitor can read a public gallery''s files'
);
select tests.as('owner');
select public.set_group_photos_public(tests.id('g1'), false);
select tests.as_anon();
select is((select count(*)::int from public.group_photos), 0, 'PT-157 members only again');

-- PT-158: an archived group is read-only ----------------------------------------
select tests.as('member');
insert into public.group_photos (group_id, uploader_id, path, alt)
values (tests.id('g3'), tests.uid('member'), pg_temp.photo_path('g3', 'member', 'beforarc'), 'Before the winter');
select tests.as('owner');
select public.archive_group(tests.id('g3'), 'Closing for winter');
select tests.as('member');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-photos', %L) $$, pg_temp.photo_path('g3', 'member', 'archived')),
  '42501', null, 'PT-158 an archived group takes no new photo files'
);
select throws_ok(
  format($$ insert into public.group_photos (group_id, uploader_id, path, alt) values (%L, %L, %L, 'x') $$,
         tests.id('g3'), tests.uid('member'), pg_temp.photo_path('g3', 'member', 'archived')),
  '42501', null, 'PT-158 an archived group takes no new photos'
);
select throws_ok(
  format($$ select public.remove_group_photo(%L) $$, (select id from public.group_photos where path = pg_temp.photo_path('g3', 'member', 'beforarc'))),
  'P0001', 'not_allowed: Only the person who added a photo or the group''s organizers can remove it.',
  'PT-158 the uploader cannot delete from an archived group'
);
select is((select count(*)::int from public.group_photos where group_id = tests.id('g3')), 1, 'PT-158 members still see an archived group''s photos');

-- PT-159: a suspended member can't add or remove ------------------------------
select tests.as_admin();
insert into public.group_members (group_id, user_id, role, status) values (tests.id('g1'), tests.uid('suspended'), 'member', 'active');
select tests.as('suspended');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-photos', %L) $$, pg_temp.photo_path('g1', 'suspended', 'suspend1')),
  '42501', null, 'PT-159 a suspended member cannot upload a photo file'
);
select throws_ok(
  format($$ insert into public.group_photos (group_id, uploader_id, path, alt) values (%L, %L, %L, 'x') $$,
         tests.id('g1'), tests.uid('suspended'), pg_temp.photo_path('g1', 'suspended', 'suspend1')),
  '42501', null, 'PT-159 a suspended member cannot add a photo'
);

select * from finish();
rollback;
