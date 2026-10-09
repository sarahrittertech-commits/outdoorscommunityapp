-- UC-22 saved events (FR-EV-18) and UC-16 member list privacy (FR-MB-10),
-- 20261010000005. PT-80..PT-89.
begin;
select plan(42);
select tests.build_fixture();

-- PT-80  Save an event without RSVPing (FR-EV-18) ---------------------------
select tests.as('member');
select lives_ok(
  format($$ insert into public.saved_events (user_id, event_id) values (%L, %L) $$, tests.uid('member'), tests.id('e1')),
  'PT-80 a member saves an event'
);
select is(
  (select count(*)::int from public.saved_events where event_id = tests.id('e1')), 1,
  'PT-80 they read their own save'
);
select is(
  (select count(*)::int from public.event_rsvps where event_id = tests.id('e1') and user_id = tests.uid('member')), 0,
  'PT-80 saving makes no RSVP'
);
select tests.as('outsider');
select lives_ok(
  format($$ insert into public.saved_events (user_id, event_id) values (%L, %L) $$, tests.uid('outsider'), tests.id('e1')),
  'PT-80 a non-member saves an event they can see'
);

-- PT-81  Saves are private --------------------------------------------------
select tests.as('outsider');
select is(
  (select count(*)::int from public.saved_events), 1,
  'PT-81 a user reads only their own saves'
);
select tests.as('owner');
select is(
  (select count(*)::int from public.saved_events), 0,
  'PT-81 the event''s organizer reads nobody''s saves'
);
select tests.as('siteadmin');
select is(
  (select count(*)::int from public.saved_events), 0,
  'PT-81 the site admin reads nobody''s saves'
);
select tests.as_anon();
select throws_ok(
  $$ select count(*) from public.saved_events $$,
  '42501', null,
  'PT-81 visitors cannot read saved events at all'
);

-- PT-82  Nobody saves for someone else, and visitors never write ----------
select tests.as('member');
select throws_ok(
  format($$ insert into public.saved_events (user_id, event_id) values (%L, %L) $$, tests.uid('outsider'), tests.id('e2')),
  '42501', null,
  'PT-82 a user cannot save an event for someone else'
);
select tests.as_anon();
select throws_ok(
  format($$ insert into public.saved_events (user_id, event_id) values (%L, %L) $$, tests.uid('member'), tests.id('e2')),
  '42501', null,
  'PT-82 a visitor cannot save anything'
);

-- PT-83  Only an event you can see, and only with a working account ---------
select tests.as('suspended');
select throws_ok(
  format($$ insert into public.saved_events (user_id, event_id) values (%L, %L) $$, tests.uid('suspended'), tests.id('e1')),
  '42501', null,
  'PT-83 a suspended account cannot save (can_write)'
);
select tests.as('siteadmin');
select public.remove_group(tests.id('g3'), 'spam');
select tests.as_admin();
insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name, created_by)
values (tests.id('g3'), 'Hidden event', now() + interval '3 days', now() + interval '3 days 2 hours',
        'America/New_York', 'Somewhere', tests.uid('owner'));
select tests.remember('e_hidden', (select id from public.events where title = 'Hidden event'));
select tests.as('outsider');
select throws_ok(
  format($$ insert into public.saved_events (user_id, event_id) values (%L, %L) $$, tests.uid('outsider'), tests.id('e_hidden')),
  '42501', null,
  'PT-83 an event in a removed group cannot be saved'
);

-- PT-84  Unsave; saves are never edited ------------------------------------
select tests.as('owner');
delete from public.saved_events where user_id = tests.uid('member');
select tests.as('member');
select is(
  (select count(*)::int from public.saved_events), 1,
  'PT-84 nobody else can unsave a user''s event'
);
select throws_ok(
  format($$ update public.saved_events set event_id = %L $$, tests.id('e2')),
  '42501', null,
  'PT-84 a save cannot be changed, only removed'
);
delete from public.saved_events where event_id = tests.id('e1');
select is(
  (select count(*)::int from public.saved_events), 0,
  'PT-84 a user unsaves their own event'
);
select throws_ok(
  format($$ insert into public.saved_events (user_id, event_id) values (%L, %L);
            insert into public.saved_events (user_id, event_id) values (%L, %L) $$,
         tests.uid('member'), tests.id('e1'), tests.uid('member'), tests.id('e1')),
  '23505', null,
  'PT-84 the same event cannot be saved twice'
);

-- PT-85  A cap of 500 saves per user ---------------------------------------
select tests.as_admin();
insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name, created_by)
select tests.id('g1'), 'Bulk ' || i, now() + interval '30 days', now() + interval '30 days 2 hours',
       'America/New_York', 'Somewhere', tests.uid('owner')
from generate_series(1, 501) as i;
select tests.as('outsider');
select lives_ok(
  format($$ insert into public.saved_events (user_id, event_id)
            select %L, id from public.events where title like 'Bulk %%' and title not in ('Bulk 500', 'Bulk 501') $$, tests.uid('outsider')),
  'PT-85 saving 500 events is allowed (499 here plus e1)'
);
select throws_ok(
  format($$ insert into public.saved_events (user_id, event_id)
            select %L, id from public.events where title = 'Bulk 501' $$, tests.uid('outsider')),
  'P0001', 'save_limit: You can save at most 500 events.',
  'PT-85 the 501st save is refused'
);

-- Second member in g1 for the privacy tests: outsider joins.
select tests.as_admin();
insert into public.group_members (group_id, user_id, role, status)
values (tests.id('g1'), tests.uid('outsider'), 'member', 'active');
-- outsider is going to e1.
select tests.as('outsider');
insert into public.event_rsvps (event_id, user_id, status) values (tests.id('e1'), tests.uid('outsider'), 'going');

-- PT-86  Default: members see the list (FR-MB-10) -------------------------
select tests.as_admin();
select is(
  (select member_list_visibility::text from public.groups where id = tests.id('g1')), 'members',
  'PT-86 a group''s member list is for members by default'
);
select tests.as('member');
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g1') and user_id = tests.uid('outsider')), 1,
  'PT-86 a member sees another member'
);
select tests.as('owner2');
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g1')), 2,
  'PT-86 a non-member sees only the two organizers'
);

-- PT-87  Organizers only ----------------------------------------------------
select tests.as('member');
update public.groups set member_list_visibility = 'organizers' where id = tests.id('g1');
select tests.as_admin();
select is(
  (select member_list_visibility::text from public.groups where id = tests.id('g1')), 'members',
  'PT-87 a plain member cannot change the setting'
);
select tests.as('admin');
select lives_ok(
  format($$ update public.groups set member_list_visibility = 'organizers' where id = %L $$, tests.id('g1')),
  'PT-87 a page manager sets the list to organizers only'
);
select tests.as('member');
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g1') and user_id = tests.uid('outsider')), 0,
  'PT-87 a member no longer sees other members'
);
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g1') and role in ('owner', 'admin')), 2,
  'PT-87 a member still sees the organizers'
);
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g1') and user_id = tests.uid('member')), 1,
  'PT-87 a member still sees their own membership'
);
select is(public.group_member_count(tests.id('g1')), 4, 'PT-87 the member count is still shown');
select tests.as('admin');
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g1')), 5,
  'PT-87 organizers see everyone, banned included'
);
select tests.as('siteadmin');
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g1')), 5,
  'PT-87 the site admin sees everyone'
);

-- PT-88  Who's going follows the setting ------------------------------------
select tests.as('member');
select is(
  (select count(*)::int from public.event_rsvps where event_id = tests.id('e1') and user_id = tests.uid('outsider')), 0,
  'PT-88 with organizers only, a member sees no names on who''s going'
);
select is(public.event_going_count(tests.id('e1')), 1, 'PT-88 the going count is still shown');
select tests.as('admin');
select is(
  (select count(*)::int from public.event_rsvps where event_id = tests.id('e1')), 1,
  'PT-88 organizers see who is going'
);
select tests.as('outsider');
select is(
  (select count(*)::int from public.event_rsvps where event_id = tests.id('e1')), 1,
  'PT-88 everyone still sees their own RSVP'
);
-- The waitlist: a count and your own place, never names.
select tests.as_admin();
update public.events set waitlist_enabled = true where id = tests.id('e1');
update public.group_members set status = 'active' where group_id = tests.id('g2') and user_id = tests.uid('pending');
insert into public.group_members (group_id, user_id, role, status)
values (tests.id('g1'), tests.uid('pending'), 'member', 'active');
select tests.as('member');
insert into public.event_rsvps (event_id, user_id, status) values (tests.id('e1'), tests.uid('member'), 'going');
select tests.as('pending');
insert into public.event_rsvps (event_id, user_id, status) values (tests.id('e1'), tests.uid('pending'), 'waitlisted');
select tests.as('member');
select is(
  (select waiting || '|' || my_place from public.event_waitlist_place(tests.id('e1'))), '1|0',
  'PT-88 a member sees how many are waiting, not who'
);
select tests.as('pending');
select is(
  (select waiting || '|' || my_place from public.event_waitlist_place(tests.id('e1'))), '1|1',
  'PT-88 someone waiting sees their own place'
);
select tests.as_anon();
select throws_ok(
  format($$ select * from public.event_waitlist_place(%L) $$, tests.id('e1')),
  '42501', null,
  'PT-88 visitors cannot call the waitlist count'
);

-- PT-89  Anyone signed in; bad values; removed groups -------------------------
select tests.as('owner');
select lives_ok(
  format($$ update public.groups set member_list_visibility = 'signed_in' where id = %L $$, tests.id('g1')),
  'PT-89 the page admin opens the list to anyone signed in'
);
select tests.as('owner2');
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g1') and status = 'active'), 5,
  'PT-89 any signed-in user then sees the member list'
);
select is(
  (select count(*)::int from public.event_rsvps where event_id = tests.id('e1') and status = 'going'), 2,
  'PT-89 and the names on who''s going'
);
select tests.as_anon();
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g1')), 2,
  'PT-89 visitors still see only the organizers'
);
select tests.as('owner');
select throws_ok(
  format($$ update public.groups set member_list_visibility = 'everyone' where id = %L $$, tests.id('g1')),
  '22P02', null,
  'PT-89 a value outside the three choices is refused'
);
select tests.as('siteadmin');
select public.remove_group(tests.id('g1'), 'spam');
select tests.as('owner2');
select is(
  (select count(*)::int from public.group_members where group_id = tests.id('g1')), 0,
  'PT-89 a removed group''s list stays hidden whatever the setting'
);

select * from finish();
rollback;
