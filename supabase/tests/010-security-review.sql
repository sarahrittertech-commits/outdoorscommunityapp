-- Fixes from the 8 October 2026 code review: removed groups stay hidden,
-- join answers are for organizers only, and limits can't be backdated.
begin;
select plan(21);
select tests.build_fixture();

select tests.as_admin();
insert into public.event_rsvps (event_id, user_id, status) values (tests.id('e1'), tests.uid('member'), 'going');
update public.group_members set join_answer = 'I hike most weekends.'
  where group_id = tests.id('g2') and user_id = tests.uid('pending');

-- Join answers (FR-MB-9) ---------------------------------------------------------
select tests.as_anon();
select throws_ok(
  'select join_answer from public.group_members',
  '42501', null, 'FR-MB-9 visitors cannot read join answers'
);
select tests.as('outsider');
select throws_ok(
  'select join_answer from public.group_members',
  '42501', null, 'FR-MB-9 signed-in users cannot read join answers directly'
);
select is(
  (select count(*)::int from public.join_answers(tests.id('g2'))), 0,
  'FR-MB-9 join_answers() returns nothing to a non-organizer'
);
select tests.as('owner2');
select is(
  (select join_answer from public.join_answers(tests.id('g2')) where user_id = tests.uid('pending')),
  'I hike most weekends.',
  'FR-MB-9 the owner reads the answer'
);
select tests.as('siteadmin');
select is(
  (select count(*)::int from public.join_answers(tests.id('g2'))), 1,
  'FR-MB-9 the site admin reads the answer'
);
select tests.as('member');
select lives_ok(
  'select group_id, user_id, role, status, created_at from public.group_members',
  'Every other membership column is still readable'
);

-- Removed groups -------------------------------------------------------------------
select tests.as_anon();
select ok(
  (select count(*) from public.group_members where group_id = tests.id('g1')) > 0,
  'Before removal, visitors see the organizers'
);

select tests.as_admin();
update public.groups set status = 'removed' where id = tests.id('g1');

select tests.as_anon();
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g1')), 0,
  'Visitors cannot read the organizers of a removed group'
);

select tests.as('member');
select is(
  (select count(*)::int from public.threads where group_id = tests.id('g1')), 0,
  'Members cannot read threads of a removed group'
);
select is(
  (select count(*)::int from public.replies where id = tests.id('r1')), 0,
  'Members cannot read replies in a removed group'
);
select is(
  (select array_agg(user_id) from public.group_members where group_id = tests.id('g1')),
  array[tests.uid('member')],
  'Members of a removed group see only their own membership'
);
select is(
  (select count(*)::int from public.event_rsvps where event_id = tests.id('e1') and user_id <> tests.uid('member')), 0,
  'Members cannot read other RSVPs in a removed group'
);
select is(
  (select count(*)::int from public.event_rsvps where user_id = tests.uid('member')), 1,
  'People still see their own RSVP'
);

select tests.as('admin');
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g1')), 1,
  'Admins of a removed group no longer see its member list'
);

select tests.as('siteadmin');
select ok(
  (select count(*) from public.threads where group_id = tests.id('g1')) > 0,
  'The site admin still sees a removed group''s threads'
);
select ok(
  (select count(*) from public.group_members where group_id = tests.id('g1')) > 1,
  'The site admin still sees a removed group''s members'
);

-- Archived groups are still readable by members.
select tests.as_admin();
update public.groups set status = 'archived' where id = tests.id('g3');
select tests.as('member');
select ok(
  (select count(*) from public.threads where group_id = tests.id('g3')) > 0,
  'Members still read threads of an archived group'
);

-- Limits can't be backdated (TR-SEC-8) ----------------------------------------------
select tests.as('outsider');
insert into public.groups (slug, name, description, subcategory_id, region_id, area, created_by, created_at)
select 'backdated', 'Backdated Group', 'Sent with an old date.', s.id, r.id, 'Brevard', tests.uid('outsider'), '2000-01-01'
from public.subcategories s, public.regions r limit 1;
select ok(
  (select created_at > now() - interval '1 minute' from public.groups where slug = 'backdated'),
  'A new group gets the server''s time, not the client''s'
);

insert into public.group_members (group_id, user_id, status, created_at)
values (tests.id('g2'), tests.uid('outsider'), 'pending', '2000-01-01');
select tests.as_admin();
select ok(
  (select created_at > now() - interval '1 minute' from public.group_members
   where group_id = tests.id('g2') and user_id = tests.uid('outsider')),
  'Joining gets the server''s time, not the client''s'
);

select tests.as('outsider');
insert into public.reports (reporter_id, target_type, target_id, reason, created_at)
values (tests.uid('outsider'), 'group', tests.id('g2'), 'spam', '2000-01-01');
select tests.as_admin();
select ok(
  (select created_at > now() - interval '1 minute' from public.reports
   where reporter_id = tests.uid('outsider') and target_id = tests.id('g2') order by created_at limit 1),
  'A report gets the server''s time, not the client''s'
);

-- Limits hold under concurrent requests: each limited table takes a per-person lock first.
select is(
  (select count(*)::int from pg_trigger
   where tgname = 'a_limit_guard'
     and tgrelid in ('public.groups'::regclass, 'public.group_members'::regclass, 'public.threads'::regclass,
                     'public.replies'::regclass, 'public.reports'::regclass)),
  5,
  'Every limited table takes the per-person lock before counting'
);

select * from finish();
rollback;
