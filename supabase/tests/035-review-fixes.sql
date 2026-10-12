-- Overnight review, 12 October 2026.
begin;
select plan(2);
select tests.build_fixture();

-- PT-230: a declined group's discussions are read-only, in the database too.
select tests.as_admin();
update public.groups set discussions_enabled = true where id = tests.id('g1');
select tests.as('owner');
select lives_ok(
  format($$ insert into public.threads (group_id, author_id, title, body) values (%L, %L, 'Open', 'Before review') $$,
         tests.id('g1'), tests.uid('owner')),
  'PT-230 the owner posts while the group is approved');
select tests.as_admin();
update public.groups set review_status = 'declined' where id = tests.id('g1');
select tests.as('owner');
select throws_ok(
  format($$ insert into public.threads (group_id, author_id, title, body) values (%L, %L, 'Late', 'After decline') $$,
         tests.id('g1'), tests.uid('owner')),
  '42501', null, 'PT-230 nobody posts in a declined group');

select * from finish();
rollback;
