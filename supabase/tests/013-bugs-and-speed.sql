-- Bugs and speed from the 8 October 2026 review: leaving clears future
-- RSVPs (FR-MB-3), and policies evaluate auth.uid() once per query.
begin;
select plan(5);
select tests.build_fixture();

select tests.as_admin();
insert into public.event_rsvps (event_id, user_id, status) values
  (tests.id('e1'), tests.uid('member'), 'going');

-- A past RSVP is history and stays.
alter table public.event_rsvps disable trigger event_rsvps_before_write;
insert into public.event_rsvps (event_id, user_id, status) values
  (tests.id('e_past'), tests.uid('member'), 'going');
alter table public.event_rsvps enable trigger event_rsvps_before_write;

select tests.as('member');
select lives_ok(
  format($$ delete from public.group_members where group_id = %L and user_id = %L $$, tests.id('g1'), tests.uid('member')),
  'FR-MB-3 a member leaves'
);

select tests.as_admin();
select is(
  (select count(*)::int from public.event_rsvps where event_id = tests.id('e1') and user_id = tests.uid('member')), 0,
  'FR-MB-3 leaving clears RSVPs to the group''s future events'
);
select is(
  (select count(*)::int from public.event_rsvps where event_id = tests.id('e_past') and user_id = tests.uid('member')), 1,
  'Leaving keeps RSVPs to past events'
);

-- auth_rls_initplan: every policy wraps auth.uid() and is_site_admin() in a subquery.
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public'
     and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~* '(?<!select )auth\.uid\(\)'),
  0,
  'No policy calls auth.uid() once per row'
);
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public'
     and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~* '(?<!select )(public\.)?is_site_admin\(\)'),
  0,
  'No policy calls is_site_admin() once per row'
);

select * from finish();
rollback;
