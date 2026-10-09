-- UC-30, the event form: FR-EV-23 to FR-EV-28. PT-50 to PT-59.
begin;
select plan(34);
select tests.build_fixture();

-- A second member of g1 for the waitlist, and an event in g3 for photo paths.
select tests.as_admin();
select tests.make_user('member2');
insert into public.group_members (group_id, user_id, role, status)
values (tests.id('g1'), tests.uid('member2'), 'member', 'active');
with e as (
  insert into public.events (group_id, title, starts_at, ends_at, timezone, location_name, created_by)
  values (tests.id('g3'), 'Quiet ride', now() + interval '3 days', now() + interval '3 days 2 hours',
          'America/New_York', 'Bridge', tests.uid('owner'))
  returning id
)
select tests.remember('e_g3', id) from e;

-- PT-50: organizers set the new fields; members can't --------------------------
select tests.as('admin');
select lives_ok(
  format($$ insert into public.events (group_id, title, description, details, starts_at, ends_at, timezone, location_name,
              created_by, is_paid, registration_fee, total_cost, takes_rsvps, signup_url)
            values (%L, 'Gravel century', 'A long gravel day for strong riders.', 'Bring two bottles.',
              now() + interval '5 days', now() + interval '5 days 8 hours', 'America/New_York', 'Park lot',
              %L, true, '$25 registration', 'about $60 with bike rental', false, 'https://club.example.org/signup') $$,
         tests.id('g1'), tests.uid('admin')),
  'PT-50 an admin posts a paid event with details, no RSVPs and a sign-up link'
);
select tests.as_admin();
select tests.remember('e_paid', (select id from public.events where title = 'Gravel century'));

select tests.as('owner');
select lives_ok(
  format($$ update public.events set is_paid = true, registration_fee = '$10', takes_rsvps = true,
              waitlist_enabled = true, details = 'Lights required.' where id = %L $$, tests.id('e1')),
  'PT-50 the owner edits the new fields'
);
select tests.as('member');
update public.events set is_paid = false, takes_rsvps = false, signup_url = 'https://evil.example'
 where id = tests.id('e1');
select tests.as_admin();
select ok(
  (select is_paid and takes_rsvps and signup_url is null from public.events where id = tests.id('e1')),
  'PT-50 a member cannot change them'
);
select tests.as_anon();
select is((select is_paid from public.event_listings where id = tests.id('e1')), true,
  'PT-50 event lists show Paid to visitors');

-- PT-51: a paid event needs a fee; links are http(s) ---------------------------
select tests.as('admin');
select throws_ok(
  format($$ update public.events set registration_fee = null where id = %L $$, tests.id('e1')),
  '23514', null, 'PT-51 a paid event cannot drop its registration fee'
);
select throws_ok(
  format($$ update public.events set signup_url = 'javascript:alert(1)' where id = %L $$, tests.id('e_paid')),
  '23514', null, 'PT-51 only http and https sign-up links are stored'
);
select throws_ok(
  format($$ update public.events set description = repeat('x', 2001) where id = %L $$, tests.id('e1')),
  '23514', null, 'PT-51 a description is at most 2,000 characters'
);

-- PT-52: an event without RSVPs takes none ------------------------------------
select tests.as('member');
select throws_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$,
         tests.id('e_paid'), tests.uid('member')),
  'P0001', 'rsvps_off: This event takes no RSVPs here.', 'PT-52 an RSVP to an event without RSVPs is refused'
);
select tests.as('admin');
select lives_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$,
         tests.id('e2'), tests.uid('admin')),
  'An RSVP while the event takes them'
);
update public.events set takes_rsvps = false where id = tests.id('e2');
select throws_ok(
  format($$ update public.event_rsvps set status = 'not_going' where event_id = %L and user_id = %L $$,
         tests.id('e2'), tests.uid('admin')),
  'P0001', 'rsvps_off: This event takes no RSVPs here.', 'PT-52 an RSVP cannot change once RSVPs are off'
);

-- PT-53: the waitlist, in order -----------------------------------------------
-- e1 has 2 places and the waitlist on.
select tests.as('owner');
select throws_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'waitlisted') $$,
         tests.id('e1'), tests.uid('owner')),
  'P0001', 'not_full: There are places left. RSVP instead.', 'PT-53 nobody joins the waitlist while places are left'
);
select lives_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$,
         tests.id('e1'), tests.uid('owner')),
  'First place taken'
);
select tests.as('admin');
select lives_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$,
         tests.id('e1'), tests.uid('admin')),
  'Second place taken: full'
);
select tests.as('member');
select throws_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$,
         tests.id('e1'), tests.uid('member')),
  'P0001', 'event_full: This event is full.', 'PT-53 going is closed when full'
);
select lives_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'waitlisted') $$,
         tests.id('e1'), tests.uid('member')),
  'PT-53 a member joins the waitlist'
);
select tests.as('member2');
select lives_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status, waitlisted_at)
            values (%L, %L, 'waitlisted', now() - interval '1 year') $$,
         tests.id('e1'), tests.uid('member2')),
  'PT-53 a second member joins the waitlist'
);
select is(
  array(select user_id from public.event_rsvps where event_id = tests.id('e1') and status = 'waitlisted'
        order by waitlisted_at),
  array[tests.uid('member'), tests.uid('member2')],
  'PT-53 the waitlist keeps join order, set by the database'
);
select is(public.event_going_count(tests.id('e1')), 2, 'PT-53 waitlisted people do not count as going');

-- PT-54: only organizers move people, only into a free place ------------------
select tests.as('admin');
select throws_ok(
  format($$ select public.move_from_waitlist(%L, %L) $$, tests.id('e1'), tests.uid('member')),
  'P0001', 'event_full: This event is full.', 'PT-54 nobody moves to going while the event is full'
);
select lives_ok(
  format($$ delete from public.event_rsvps where event_id = %L and user_id = %L $$, tests.id('e1'), tests.uid('admin')),
  'A place frees up'
);
select tests.as('member');
select throws_ok(
  format($$ update public.event_rsvps set status = 'going' where event_id = %L and user_id = %L $$,
         tests.id('e1'), tests.uid('member')),
  'P0001', 'waitlist_first: Places go to the waitlist first.', 'PT-54 a waitlisted member cannot move themselves to going'
);
select throws_ok(
  format($$ select public.move_from_waitlist(%L, %L) $$, tests.id('e1'), tests.uid('member')),
  'P0001', null, 'PT-54 a member cannot move people from the waitlist'
);
select tests.as('outsider');
select throws_ok(
  format($$ select public.move_from_waitlist(%L, %L) $$, tests.id('e1'), tests.uid('member')),
  'P0001', null, 'PT-54 an outsider cannot either'
);
select tests.as('admin');
select lives_ok(
  format($$ select public.move_from_waitlist(%L, %L) $$, tests.id('e1'), tests.uid('member')),
  'PT-54 an admin moves the first person on the waitlist to going'
);
select throws_ok(
  format($$ select public.move_from_waitlist(%L, %L) $$, tests.id('e1'), tests.uid('member2')),
  'P0001', 'event_full: This event is full.', 'PT-54 going never exceeds the places'
);
select is(public.event_going_count(tests.id('e1')), 2, 'PT-54 going equals the places');

-- PT-55: leaving the waitlist is always allowed --------------------------------
select tests.as('member2');
select lives_ok(
  format($$ delete from public.event_rsvps where event_id = %L and user_id = %L $$, tests.id('e1'), tests.uid('member2')),
  'PT-55 a member leaves the waitlist'
);

-- PT-56..PT-58: event photos in storage ---------------------------------------
select tests.as('admin');
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('event-photos', %L) $$,
         tests.id('g1') || '/' || tests.id('e1') || '/abcdefgh.webp'),
  'PT-56 an admin uploads a photo into their own event''s folder'
);
select tests.as('member');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('event-photos', %L) $$,
         tests.id('g1') || '/' || tests.id('e1') || '/membersx.webp'),
  '42501', null, 'PT-56 a member cannot upload an event photo'
);
select tests.as('outsider');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('event-photos', %L) $$,
         tests.id('g1') || '/' || tests.id('e1') || '/outsider.webp'),
  '42501', null, 'PT-56 an outsider cannot upload an event photo'
);
select tests.as('admin');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('event-photos', %L) $$,
         tests.id('g1') || '/' || tests.id('e_g3') || '/mismatch.webp'),
  '42501', null, 'PT-57 a photo path must name an event of the same group'
);

select tests.as('owner');
select public.archive_group(tests.id('g3'), 'Closing for winter');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('event-photos', %L) $$,
         tests.id('g3') || '/' || tests.id('e_g3') || '/archived.webp'),
  '42501', null, 'PT-58 an archived group takes no new event photos'
);

-- PT-59: the event row points only at its own folder, with alt text ------------
select tests.as('admin');
select throws_ok(
  format($$ update public.events set photo_path = %L, photo_alt = 'A ride' where id = %L $$,
         tests.id('g3') || '/' || tests.id('e_g3') || '/abcdefgh.webp', tests.id('e1')),
  '23514', null, 'PT-59 an event cannot point at another event''s photo'
);
select throws_ok(
  format($$ update public.events set photo_path = %L, photo_alt = null where id = %L $$,
         tests.id('g1') || '/' || tests.id('e1') || '/abcdefgh.webp', tests.id('e1')),
  '23514', null, 'PT-59 a photo needs alt text'
);

select * from finish();
rollback;
