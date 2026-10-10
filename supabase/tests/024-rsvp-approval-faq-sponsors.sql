-- UC-17 and part of UC-10: RSVP approval (FR-EV-15), Manage RSVPs
-- (FR-EV-17), RSVPs open at (FR-EV-20) and the FAQ (FR-EV-19). PT-120 to PT-139.
begin;
select plan(45);
select tests.build_fixture();

select tests.as_admin();
select tests.make_user('member2');
insert into public.group_members (group_id, user_id, role, status)
values (tests.id('g1'), tests.uid('member2'), 'member', 'active');

-- PT-120: only organizers turn approval on ----------------------------------
select tests.as('member');
update public.events set approve_rsvps = true where id = tests.id('e1');
select tests.as_admin();
select is((select approve_rsvps from public.events where id = tests.id('e1')), false,
  'PT-120 a member cannot turn on Approve RSVPs');
select tests.as('admin');
select lives_ok(
  format($$ update public.events set approve_rsvps = true where id = %L $$, tests.id('e1')),
  'PT-120 an admin turns on Approve RSVPs'
);

-- PT-121: a member's RSVP is a request ----------------------------------------
select tests.as('member');
select throws_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$,
         tests.id('e1'), tests.uid('member')),
  'P0001', 'approval_needed: The organizers approve RSVPs to this event. Ask to go instead.',
  'PT-121 a member cannot RSVP going to an event that needs approval'
);
select lives_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'requested') $$,
         tests.id('e1'), tests.uid('member')),
  'PT-121 a member asks to go'
);
select is(public.event_going_count(tests.id('e1')), 0, 'PT-121 a request does not take a place');

-- PT-122: a member never approves or declines themselves --------------------
select throws_ok(
  format($$ update public.event_rsvps set status = 'going' where event_id = %L and user_id = %L $$,
         tests.id('e1'), tests.uid('member')),
  'P0001', 'approval_needed: The organizers approve RSVPs to this event. Ask to go instead.',
  'PT-122 the database refuses a member setting their own RSVP to approved'
);
select throws_ok(
  format($$ update public.event_rsvps set status = 'declined' where event_id = %L and user_id = %L $$,
         tests.id('e1'), tests.uid('member')),
  'P0001', 'not_allowed: Only the group''s organizers can decline an RSVP.',
  'PT-122 a member cannot set declined'
);
select throws_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'requested') $$,
         tests.id('e2'), tests.uid('member')),
  'P0001', 'no_approval: This event doesn''t need approval. RSVP instead.',
  'PT-122 a request to an event without approval is refused'
);

-- PT-123: requests are private to the person and the organizers ---------------
select tests.as('member2');
select is((select count(*)::int from public.event_rsvps where event_id = tests.id('e1') and user_id = tests.uid('member')), 0,
  'PT-123 another member does not see a request');
select tests.as('admin');
select is((select status::text from public.event_rsvps where event_id = tests.id('e1') and user_id = tests.uid('member')), 'requested',
  'PT-123 an organizer sees the request');

-- PT-124: only organizers manage RSVPs ----------------------------------------
select tests.as('member2');
select throws_ok(
  format($$ select public.manage_rsvp(%L, %L, 'approve') $$, tests.id('e1'), tests.uid('member')),
  'P0001', 'not_allowed: Only the group''s organizers can manage RSVPs.',
  'PT-124 a member cannot approve a request'
);
select tests.as('outsider');
select throws_ok(
  format($$ select public.manage_rsvp(%L, %L, 'remove') $$, tests.id('e1'), tests.uid('member')),
  'P0001', 'not_allowed: Only the group''s organizers can manage RSVPs.',
  'PT-124 an outsider cannot remove an RSVP'
);
select tests.as_anon();
select throws_ok(
  format($$ select public.manage_rsvp(%L, %L, 'approve') $$, tests.id('e1'), tests.uid('member')),
  '42501', null, 'PT-124 visitors cannot call manage_rsvp'
);
select tests.as('admin');
select throws_ok(
  format($$ select public.manage_rsvp(%L, %L, 'promote') $$, tests.id('e1'), tests.uid('member')),
  'P0001', 'invalid: Approve, decline, waitlist or remove.', 'PT-124 an unknown action is refused'
);

-- PT-125: approving takes a place; never beyond capacity ----------------------
select lives_ok(
  format($$ select public.manage_rsvp(%L, %L, 'approve') $$, tests.id('e1'), tests.uid('member')),
  'PT-125 an admin approves a request'
);
select is(public.event_going_count(tests.id('e1')), 1, 'PT-125 an approved RSVP counts against places');
-- Organizers RSVP going directly; that fills the 2 places.
select lives_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$,
         tests.id('e1'), tests.uid('admin')),
  'PT-125 an organizer RSVPs without a request'
);
select tests.as('member2');
select lives_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'requested') $$,
         tests.id('e1'), tests.uid('member2')),
  'PT-125 a request is still possible when full'
);
select tests.as('owner');
select throws_ok(
  format($$ select public.manage_rsvp(%L, %L, 'approve') $$, tests.id('e1'), tests.uid('member2')),
  'P0001', 'event_full: This event is full.', 'PT-125 approving into a full event is refused'
);

-- PT-126: with the waitlist ------------------------------------------------------
update public.events set waitlist_enabled = true where id = tests.id('e1');
select lives_ok(
  format($$ select public.manage_rsvp(%L, %L, 'waitlist') $$, tests.id('e1'), tests.uid('member2')),
  'PT-126 an organizer puts a request on the waitlist'
);
select isnt((select waitlisted_at from public.event_rsvps where event_id = tests.id('e1') and user_id = tests.uid('member2')), null,
  'PT-126 the waitlist place is set by the database');

-- PT-127: declining sticks ------------------------------------------------------
select lives_ok(
  format($$ select public.manage_rsvp(%L, %L, 'decline') $$, tests.id('e1'), tests.uid('member2')),
  'PT-127 an organizer declines'
);
select tests.as('member2');
select throws_ok(
  format($$ update public.event_rsvps set status = 'requested' where event_id = %L and user_id = %L $$,
         tests.id('e1'), tests.uid('member2')),
  'P0001', 'rsvp_declined: The organizers declined your RSVP.', 'PT-127 a declined member cannot ask again'
);
delete from public.event_rsvps where event_id = tests.id('e1') and user_id = tests.uid('member2');
select tests.as_admin();
select is((select status::text from public.event_rsvps where event_id = tests.id('e1') and user_id = tests.uid('member2')), 'declined',
  'PT-127 nor delete the decline to start over');

-- PT-128: removing is logged ----------------------------------------------------
select tests.as('admin');
select lives_ok(
  format($$ select public.manage_rsvp(%L, %L, 'remove', 'No-show twice') $$, tests.id('e1'), tests.uid('member')),
  'PT-128 an organizer removes an RSVP'
);
select tests.as_admin();
select ok(
  not exists (select 1 from public.event_rsvps where event_id = tests.id('e1') and user_id = tests.uid('member'))
  and exists (select 1 from public.moderation_actions
               where action = 'remove_rsvp' and target_id = tests.id('e1') and actor_id = tests.uid('admin')
                 and content_snapshot ->> 'user_id' = tests.uid('member')::text),
  'PT-128 the RSVP is gone and the removal is in the moderation log'
);

-- PT-129: RSVPs open at (FR-EV-20) ------------------------------------------------
select tests.as('admin');
select throws_ok(
  format($$ update public.events set rsvps_open_at = starts_at + interval '1 hour' where id = %L $$, tests.id('e2')),
  '23514', null, 'PT-129 RSVPs must open before the event starts'
);
update public.events set rsvps_open_at = now() + interval '1 day' where id = tests.id('e2');
select tests.as('member');
select throws_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$,
         tests.id('e2'), tests.uid('member')),
  'P0001', 'rsvps_not_open: RSVPs for this event aren''t open yet.',
  'PT-129 the database refuses an RSVP before the opening time'
);
select tests.as('admin');
update public.events set rsvps_open_at = now() - interval '1 minute' where id = tests.id('e2');
select tests.as('member');
select lives_ok(
  format($$ insert into public.event_rsvps (event_id, user_id, status) values (%L, %L, 'going') $$,
         tests.id('e2'), tests.uid('member')),
  'PT-129 RSVPs work once open'
);

-- PT-130: the FAQ (FR-EV-19) --------------------------------------------------------
select tests.as('admin');
select lives_ok(
  format($$ select public.set_event_faq(%L, array['Are dogs welcome?', 'Is there parking?'],
                                            array['On a leash, yes.', 'Yes, at the lot.']) $$, tests.id('e1')),
  'PT-130 an admin sets the FAQ'
);
select tests.as_anon();
select is(array(select question from public.event_faqs where event_id = tests.id('e1') order by position),
  array['Are dogs welcome?', 'Is there parking?'], 'PT-130 visitors read the FAQ in the organizer''s order');
select tests.as('member');
select throws_ok(
  format($$ select public.set_event_faq(%L, array['Mine?'], array['Yes']) $$, tests.id('e1')),
  'P0001', 'not_allowed: Only the group''s organizers can edit the FAQ.', 'PT-130 a member cannot edit the FAQ'
);
select throws_ok(
  format($$ insert into public.event_faqs (event_id, position, question, answer) values (%L, 3, 'Sneaky?', 'Yes') $$, tests.id('e1')),
  '42501', null, 'PT-130 nobody writes the FAQ table directly'
);
select tests.as('admin');
select throws_ok(
  format($$ select public.set_event_faq(%L, array_fill('Question?'::text, array[16]), array_fill('Answer'::text, array[16])) $$, tests.id('e1')),
  'P0001', 'faq_limit: An event can have at most 15 questions.', 'PT-130 at most 15 questions'
);

-- PT-131: sponsors (FR-EV-14) ---------------------------------------------------------
select tests.as('admin');
select lives_ok(
  format($$ insert into public.event_sponsors (event_id, group_id, name, website_url, logo_path)
            values (%L, %L, 'Trail Shop', 'https://trailshop.example', %L) $$,
         tests.id('e1'), tests.id('g1'), tests.id('g1') || '/' || tests.id('e1') || '/sponsors/abcdef123456.webp'),
  'PT-131 an admin adds a sponsor with a logo and link'
);
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('event-photos', %L) $$,
         tests.id('g1') || '/' || tests.id('e1') || '/sponsors/abcdef123456.webp'),
  'PT-131 an admin uploads the sponsor logo to the event''s folder'
);
select tests.as_anon();
select is((select name from public.event_sponsors where event_id = tests.id('e1')), 'Trail Shop',
  'PT-131 visitors see the sponsor on the event');

select tests.as('member');
select throws_ok(
  format($$ insert into public.event_sponsors (event_id, group_id, name) values (%L, %L, 'Sneaky Co') $$,
         tests.id('e1'), tests.id('g1')),
  '42501', null, 'PT-132 a member cannot add a sponsor'
);
delete from public.event_sponsors where event_id = tests.id('e1');
select tests.as_admin();
select is((select count(*)::int from public.event_sponsors where event_id = tests.id('e1')), 1,
  'PT-132 nor remove one');

select tests.as('admin');
select throws_ok(
  format($$ insert into public.event_sponsors (event_id, group_id, name, website_url) values (%L, %L, 'Bad Link', 'javascript:alert(1)') $$,
         tests.id('e1'), tests.id('g1')),
  '23514', null, 'PT-133 only http and https sponsor links are stored'
);
select throws_ok(
  format($$ insert into public.event_sponsors (event_id, group_id, name, logo_path) values (%L, %L, 'Elsewhere', %L) $$,
         tests.id('e1'), tests.id('g1'), tests.id('g3') || '/' || tests.id('e1') || '/sponsors/abcdef123456.webp'),
  '23514', null, 'PT-133 a logo lives in its own event''s folder'
);
select throws_ok(
  format($$ insert into public.event_sponsors (event_id, group_id, name) values (%L, %L, 'Wrong group') $$,
         tests.id('e1'), tests.id('g3')),
  '42501', null, 'PT-133 a sponsor''s group is its event''s group'
);

insert into public.event_sponsors (event_id, group_id, name)
select tests.id('e1'), tests.id('g1'), 'Sponsor ' || n from generate_series(2, 5) as n;
select throws_ok(
  format($$ insert into public.event_sponsors (event_id, group_id, name) values (%L, %L, 'Sixth') $$,
         tests.id('e1'), tests.id('g1')),
  'P0001', 'sponsor_limit: An event can have at most 5 sponsors.', 'PT-134 at most 5 sponsors per event'
);
select lives_ok(
  format($$ delete from public.event_sponsors where event_id = %L and name = 'Sponsor 5' $$, tests.id('e1')),
  'PT-134 an admin removes a sponsor'
);
select tests.as_anon();
select is((select count(*)::int from public.event_listings where id = tests.id('e1')), 1,
  'PT-135 a sponsored event lists like any other');

select * from finish();
rollback;
