-- UC-24, tell groups apart: FR-GR-14 (cover photo), FR-GR-16 (type). PT-100 to PT-109.
begin;
select plan(25);
select tests.build_fixture();

-- A suspended account that is an admin of g1, for PT-105.
select tests.as_admin();
insert into public.group_members (group_id, user_id, role, status)
values (tests.id('g1'), tests.uid('suspended'), 'admin', 'active');

-- PT-100: the owner and admins set the type ---------------------------------
select tests.as('owner');
select lives_ok(
  format($$ update public.groups set group_type = 'volunteer' where id = %L $$, tests.id('g1')),
  'PT-100 the owner sets the group type'
);
select tests.as('admin');
select lives_ok(
  format($$ update public.groups set group_type = 'club' where id = %L $$, tests.id('g1')),
  'PT-100 an admin changes the group type'
);
select is(
  (select group_type::text from public.groups where id = tests.id('g1')), 'club',
  'PT-100 the type is saved'
);

-- PT-101: a type outside the list is refused ----------------------------------
select throws_ok(
  format($$ update public.groups set group_type = 'cult' where id = %L $$, tests.id('g1')),
  '22P02', null, 'PT-101 a type outside the list is refused'
);

-- PT-102: members and outsiders can't change it -------------------------------
select tests.as('member');
update public.groups set group_type = 'meetup' where id = tests.id('g1');
select tests.as('outsider');
update public.groups set group_type = 'meetup' where id = tests.id('g1');
select tests.as_anon();
select throws_ok(
  format($$ update public.groups set group_type = 'meetup' where id = %L $$, tests.id('g1')),
  '42501', null, 'PT-102 a visitor cannot change the type'
);
select tests.as_admin();
select is(
  (select group_type::text from public.groups where id = tests.id('g1')), 'club',
  'PT-102 a member and an outsider changed nothing'
);

-- PT-103: listings show type and cover to everyone; the view stays read-only -
select tests.as_anon();
select is(
  (select group_type::text from public.group_listings where id = tests.id('g1')), 'club',
  'PT-103 a visitor sees the type in group_listings'
);
select ok(
  (select 'security_invoker=true' = any(c.reloptions) from pg_class c where c.oid = 'public.group_listings'::regclass),
  'PT-103 group_listings still runs as the caller'
);
select ok(
  not has_table_privilege('anon', 'public.group_listings', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.group_listings', 'UPDATE'),
  'PT-103 nobody writes through group_listings'
);

-- PT-104: only the group's owner and admins upload a cover --------------------
select tests.as('admin');
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-covers-v2', %L) $$,
         tests.id('g1') || '/coverone.webp'),
  'PT-104 an admin uploads a cover into their group''s folder'
);
select tests.as('owner');
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-covers-v2', %L) $$,
         tests.id('g1') || '/covertwo.webp'),
  'PT-104 the owner uploads a cover'
);
select tests.as('member');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-covers-v2', %L) $$,
         tests.id('g1') || '/membersx.webp'),
  '42501', null, 'PT-104 a member cannot upload a cover'
);
select tests.as('outsider');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-covers-v2', %L) $$,
         tests.id('g1') || '/outsider.webp'),
  '42501', null, 'PT-104 an outsider cannot upload a cover'
);
select tests.as('owner2');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-covers-v2', %L) $$,
         tests.id('g1') || '/othergrp.webp'),
  '42501', null, 'PT-104 another group''s owner cannot upload a cover'
);
select tests.as('member');
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'group-covers-v2' and name like tests.id('g1') || '/%'),
  0, 'PT-104 a member cannot remove or even list the folder'
);

-- PT-105: a suspended admin can't upload --------------------------------------
select tests.as('suspended');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-covers-v2', %L) $$,
         tests.id('g1') || '/suspends.webp'),
  '42501', null, 'PT-105 a suspended admin cannot upload a cover'
);

-- PT-106: the path is <group_id>/<random>.webp --------------------------------
select tests.as('admin');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-covers-v2', %L) $$,
         tests.id('g1') || '/cover.jpg'),
  '42501', null, 'PT-106 only .webp files with a random name go in'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-covers-v2', %L) $$,
         tests.id('g1') || '/nested/abcdefgh.webp'),
  '42501', null, 'PT-106 no folders inside a group''s folder'
);

-- PT-107: at most 5 files in a group's folder ---------------------------------
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values
           ('group-covers-v2', %L), ('group-covers-v2', %L), ('group-covers-v2', %L) $$,
         tests.id('g1') || '/coverthr.webp', tests.id('g1') || '/coverfou.webp', tests.id('g1') || '/coverfiv.webp'),
  'PT-107 a folder holds up to 5 files'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-covers-v2', %L) $$,
         tests.id('g1') || '/coversix.webp'),
  '42501', null, 'PT-107 a sixth file is refused'
);
-- Hosted Supabase blocks direct SQL deletes on storage tables (the app goes
-- through the Storage API, which applies these same policies); allow it for
-- this transaction so the policy itself is what's tested.
select set_config('storage.allow_delete_query', 'true', true);
select lives_ok(
  format($$ delete from storage.objects where bucket_id = 'group-covers-v2' and name = %L $$,
         tests.id('g1') || '/coverfiv.webp'),
  'PT-107 an admin removes an old cover file'
);

-- PT-108: an archived group takes no new cover ---------------------------------
select tests.as('owner');
select public.archive_group(tests.id('g3'), 'Closing for winter');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('group-covers-v2', %L) $$,
         tests.id('g3') || '/archived.webp'),
  '42501', null, 'PT-108 an archived group takes no new cover'
);

-- PT-109: the group row points only at its own folder, with alt text ----------
select tests.as('admin');
select lives_ok(
  format($$ update public.groups set cover_image_path = %L, cover_alt = 'Riders at the trailhead' where id = %L $$,
         tests.id('g1') || '/coverone.webp', tests.id('g1')),
  'PT-109 an admin sets the cover with alt text'
);
select throws_ok(
  format($$ update public.groups set cover_image_path = %L where id = %L $$,
         tests.id('g3') || '/abcdefgh.webp', tests.id('g1')),
  '23514', null, 'PT-109 a group cannot point at another group''s folder'
);
select throws_ok(
  format($$ update public.groups set cover_alt = null where id = %L $$, tests.id('g1')),
  '23514', null, 'PT-109 a cover needs alt text'
);

select * from finish();
rollback;
