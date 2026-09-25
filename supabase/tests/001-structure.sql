-- Structural guarantees: PT-1, PT-2, PT-13, PT-20.
begin;
select plan(7);

-- PT-1
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity $$,
  'PT-1 every table in public has row-level security enabled'
);

-- PT-2: no policy, and no privilege, lets the anonymous role write.
select is_empty(
  $$ select schemaname || '.' || tablename || ': ' || policyname from pg_policies
     where schemaname in ('public', 'storage') and cmd <> 'SELECT'
       and roles && array['anon', 'public']::name[] $$,
  'PT-2 no insert/update/delete policy applies to anon or PUBLIC'
);

select is_empty(
  $$ select table_name || ' ' || privilege_type from information_schema.role_table_grants
     where grantee = 'anon' and table_schema = 'public'
       and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE') $$,
  'PT-2 anon holds no table-level write privilege'
);

select is_empty(
  $$ select table_name || '.' || column_name || ' ' || privilege_type from information_schema.column_privileges
     where grantee = 'anon' and table_schema = 'public'
       and privilege_type in ('INSERT', 'UPDATE') $$,
  'PT-2 anon holds no column-level write privilege'
);

-- PT-20: nothing other users can read holds an email address.
select is_empty(
  $$ select table_name || '.' || column_name from information_schema.columns
     where table_schema = 'public' and column_name ilike '%email%' and column_name <> 'email_type' $$,
  'PT-20 no column in public is an email address'
);

select tests.build_fixture();
select tests.as('member');
select throws_ok(
  $$ select email from auth.users $$,
  '42501', null,
  'PT-20 signed-in users cannot read auth.users'
);

-- PT-13
select tests.as_admin();
select throws_ok(
  format($$ insert into public.group_members (group_id, user_id, role) values (%L, %L, 'owner') $$,
         tests.id('g1'), tests.uid('admin')),
  '23505', null,
  'PT-13 a second owner for a group is refused'
);

select * from finish();
rollback;
