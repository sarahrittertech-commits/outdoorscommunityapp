-- Events and RSVPs: PT-7, PT-15, FR-EV-*.
begin;
select plan(15);
select tests.build_fixture();

-- PT-7: members don't manage events -------------------------------------------
select tests.as('member');
select throws_ok(
  format($$ insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name, created_by)
            values (%L, 'Mine', now() + interval '1 day', now() + interval '2 days', 'America/New_York', 'Here', %L) $$,
         tests.id('g1'), tests.uid('member')),
  '42501', null, 'PT-7 members cannot create events'
);
update public.events set title = 'Hijacked' where id = tests.id('e1');
select is((select title from public.events where id = tests.id('e1')), 'Public event', 'PT-7 members cannot edit events');

-- Admins do -------------------------------------------------------------------
select tests.as('admin');
select lives_ok(
  format($$ insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name, created_by)
            values (%L, 'Saturday paddle', now() + interval '1 day', now() + interval '1 day 2 hours', 'America/New_York', 'Put-in', %L) $$,
         tests.id('g1'), tests.uid('admin')),
  'FR-EV-1 admins create events'
);
select throws_ok(
  format($$ insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name, created_by)
            values (%L, 'Nowhere', now() + interval '1 day', now() + interval '1 day 2 hours', 'Mars/Olympus', 'Put-in', %L) $$,
         tests.id('g1'), tests.uid('admin')),
  'P0001', null, 'TR-DATA-3 an unknown time zone is refused'
);
select throws_ok(
  format($$ update public.events set group_id = %L where id = %L $$, tests.id('g2'), tests.id('e1')),
  '42501', null, 'An event cannot be moved to another group'
);

-- RSVPs -----------------------------------------------------------------------
select tests.as('outsider');
select throws_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$, tests.id('e1'), tests.uid('outsider')),
  '42501', null, 'FR-EV-4 non-members cannot RSVP'
);

select tests.as('member');
select lives_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$, tests.id('e1'), tests.uid('member')),
  'FR-EV-3 members RSVP'
);
select tests.as('admin');
select lives_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$, tests.id('e1'), tests.uid('admin')),
  'A second RSVP fills the event'
);
select tests.as('owner');
select throws_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$, tests.id('e1'), tests.uid('owner')),
  'P0001', 'event_full: This event is full.', 'PT-15 an RSVP beyond capacity is refused'
);

select tests.as('member');
select lives_ok(
  format($$ update public.event_rsvps set status = 'not_going' where event_id = %L and user_id = %L $$, tests.id('e1'), tests.uid('member')),
  'FR-EV-3 members change their RSVP'
);
select tests.as('owner');
select lives_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$, tests.id('e1'), tests.uid('owner')),
  'A freed place can be taken'
);

select tests.as('member');
select throws_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$, tests.id('e_past'), tests.uid('member')),
  'P0001', 'event_started: RSVPs close when the event starts.', 'PT-15 an RSVP after the start is refused'
);

select tests.as('admin');
update public.events set status = 'cancelled' where id = tests.id('e2');
select tests.as('member');
select throws_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$, tests.id('e2'), tests.uid('member')),
  'P0001', 'event_cancelled: This event has been cancelled.', 'PT-15 an RSVP to a cancelled event is refused'
);

select tests.as_anon();
select is((select going_count from public.event_listings where id = tests.id('e1')), 2, 'FR-BR-7 visitors see how many are going');
select is((select count(*)::int from public.event_rsvps), 0, 'Visitors do not see who is going');

select * from finish();
rollback;
