-- UC-20: direct messages (FR-DM-1 to FR-DM-6, TR-SEC-13). PT-170..PT-189.
begin;
select plan(69);
select tests.build_fixture();

-- PT-170  a first message arrives as a request (FR-DM-1) -------------------
select tests.as('member');
select lives_ok(
  format($$ select public.send_message(%L, 'Hi, could I borrow your bike rack on Saturday?') $$, tests.uid('outsider')),
  'PT-170 a member sends a first message'
);
select tests.as_admin();
select tests.remember('c1', (select id from public.conversations where starter_id = tests.uid('member') and recipient_id = tests.uid('outsider')));
select is(
  (select status::text from public.conversations where id = tests.id('c1')),
  'requested',
  'PT-170 the first message makes a request'
);
select is((select count(*)::int from public.messages where conversation_id = tests.id('c1')), 1, 'PT-170 the message is stored once');

-- PT-171  nothing more until it is accepted (FR-DM-1) ---------------------
select tests.as('member');
select throws_ok(
  format($$ select public.send_message(%L, 'Hello again?') $$, tests.uid('outsider')),
  'P0001', 'dm_waiting: You can send another message once they accept your request.',
  'PT-171 a second message before acceptance is refused'
);
select tests.as('outsider');
select throws_ok(
  format($$ select public.send_message(%L, 'Sure!') $$, tests.uid('member')),
  'P0001', 'dm_accept_first: Accept the request before replying.',
  'PT-171 the recipient accepts before replying'
);

-- PT-172  only the recipient answers a request (FR-DM-2) -------------------
select tests.as('member');
select throws_ok(
  format($$ select public.answer_message_request(%L, true) $$, tests.id('c1')),
  'P0001', 'not_found: No such request.',
  'PT-172 the sender cannot accept their own request'
);
select tests.as('owner');
select throws_ok(
  format($$ select public.answer_message_request(%L, true) $$, tests.id('c1')),
  'P0001', 'not_found: No such request.',
  'PT-172 a third person cannot accept someone else''s request'
);
select tests.as('outsider');
select lives_ok(
  format($$ select public.answer_message_request(%L, true) $$, tests.id('c1')),
  'PT-172 the recipient accepts'
);
select lives_ok(
  format($$ select public.send_message(%L, 'Sure, it''s in the garage.') $$, tests.uid('member')),
  'PT-172 once accepted, the recipient replies'
);
select tests.as('member');
select lives_ok(
  format($$ select public.send_message(%L, 'Thanks!') $$, tests.uid('outsider')),
  'PT-172 and the sender writes back'
);
select is((select count(*)::int from public.messages where conversation_id = tests.id('c1')), 3, 'PT-172 the sender reads the whole conversation');

-- PT-173  only the two people read it (FR-DM-6, TR-SEC-13) -----------------
select tests.as('owner');
select is((select count(*)::int from public.conversations), 0, 'PT-173 a group''s page admin reads no member''s conversations');
select is((select count(*)::int from public.messages), 0, 'PT-173 a group''s page admin reads no member''s messages');
select tests.as('admin');
select is((select count(*)::int from public.messages), 0, 'PT-173 a page manager reads no member''s messages');
select tests.as('siteadmin');
select is((select count(*)::int from public.messages), 0, 'PT-173 the site admin reads no conversation that was not reported');
select tests.as_anon();
select throws_ok($$ select count(*) from public.messages $$, '42501', null, 'PT-173 an anonymous visitor cannot read messages');
select throws_ok($$ select count(*) from public.conversations $$, '42501', null, 'PT-173 an anonymous visitor cannot read conversations');

-- PT-174  writes only through send_message (TR-SEC-13) ---------------------
select tests.as('member');
select throws_ok(
  format($$ insert into public.messages (conversation_id, sender_id, body) values (%L, %L, 'sneaky') $$, tests.id('c1'), tests.uid('member')),
  '42501', null,
  'PT-174 a member cannot insert a message directly'
);
select throws_ok(
  format($$ insert into public.conversations (starter_id, recipient_id, status) values (%L, %L, 'accepted') $$, tests.uid('member'), tests.uid('owner2')),
  '42501', null,
  'PT-174 a member cannot open an accepted conversation directly'
);
select throws_ok(
  format($$ update public.conversations set status = 'accepted' where id = %L $$, tests.id('c1')),
  '42501', null,
  'PT-174 a member cannot change a conversation directly'
);
select throws_ok(
  format($$ delete from public.messages where conversation_id = %L $$, tests.id('c1')),
  '42501', null,
  'PT-174 a member cannot delete messages'
);
select tests.as_anon();
select throws_ok(
  format($$ select public.send_message(%L, 'From a visitor') $$, tests.uid('member')),
  '42501', null,
  'PT-174 an anonymous visitor cannot send a message'
);

-- PT-175  declining stops the sender, who sees only "waiting" (FR-DM-2) ----
select tests.as('member');
select lives_ok(
  format($$ select public.send_message(%L, 'Want to ride Sunday?') $$, tests.uid('owner2')),
  'PT-175 a member sends another request'
);
select tests.as('owner2');
select lives_ok(
  format($$ select public.answer_message_request((select id from public.conversations where starter_id = %L), false) $$, tests.uid('member')),
  'PT-175 the recipient declines'
);
select tests.as('member');
select throws_ok(
  format($$ select public.send_message(%L, 'Please?') $$, tests.uid('owner2')),
  'P0001', 'dm_waiting: You can send another message once they accept your request.',
  'PT-175 a declined sender cannot message again, and is told the same as a waiting one'
);
select is(
  (select status::text from public.conversations where recipient_id = tests.uid('owner2')),
  'declined',
  'PT-175 the conversation stays declined'
);

-- PT-176  blocking (FR-DM-2) -----------------------------------------------
select tests.as('admin');
select lives_ok(
  format($$ insert into public.message_blocks (blocker_id, blocked_id) values (%L, %L) $$, tests.uid('admin'), tests.uid('member')),
  'PT-176 a member blocks someone'
);
select tests.as('member');
select throws_ok(
  format($$ select public.send_message(%L, 'Hello') $$, tests.uid('admin')),
  'P0001', 'dm_waiting: You can send another message once they accept your request.',
  'PT-176 a blocked person''s message is refused, neutrally'
);
select is((select count(*)::int from public.message_blocks), 0, 'PT-176 the blocked person cannot see the block');
select tests.as('admin');
select throws_ok(
  format($$ select public.send_message(%L, 'Hello') $$, tests.uid('member')),
  'P0001', 'dm_you_blocked: You have blocked this member.',
  'PT-176 the blocker cannot message someone they blocked'
);
-- Either side can block at any time, including in an open conversation.
select tests.as('outsider');
insert into public.message_blocks (blocker_id, blocked_id) values (tests.uid('outsider'), tests.uid('member'));
select tests.as('member');
select throws_ok(
  format($$ select public.send_message(%L, 'Still there?') $$, tests.uid('outsider')),
  'P0001', 'dm_waiting: You can send another message once they accept your request.',
  'PT-176 blocking stops an accepted conversation too'
);
select tests.as('outsider');
select lives_ok(
  format($$ delete from public.message_blocks where blocked_id = %L $$, tests.uid('member')),
  'PT-176 the blocker unblocks'
);
select tests.as('member');
select lives_ok(
  format($$ select public.send_message(%L, 'Back again.') $$, tests.uid('outsider')),
  'PT-176 after unblocking, the conversation works again'
);

-- PT-177  blocks are one's own ---------------------------------------------
select tests.as('member');
select throws_ok(
  format($$ insert into public.message_blocks (blocker_id, blocked_id) values (%L, %L) $$, tests.uid('owner'), tests.uid('outsider')),
  '42501', null,
  'PT-177 a member cannot block in someone else''s name'
);
select tests.as('admin');
select is(
  (select count(*)::int from public.message_blocks where blocker_id = tests.uid('admin')), 1,
  'PT-177 the blocker sees their own block'
);
select tests.as_anon();
select throws_ok($$ select count(*) from public.message_blocks $$, '42501', null, 'PT-177 an anonymous visitor cannot read blocks');

-- PT-178  suspended accounts read but do not send (FR-DM-6) ----------------
select tests.as_admin();
insert into public.conversations (starter_id, recipient_id, status) values (tests.uid('suspended'), tests.uid('owner'), 'accepted');
select tests.remember('c_susp', (select id from public.conversations where starter_id = tests.uid('suspended')));
insert into public.messages (conversation_id, sender_id, body) values (tests.id('c_susp'), tests.uid('owner'), 'See you there.');
select tests.as('suspended');
select is((select count(*)::int from public.messages where conversation_id = tests.id('c_susp')), 1, 'PT-178 a suspended account still reads its conversations');
select throws_ok(
  format($$ select public.send_message(%L, 'Reply') $$, tests.uid('owner')),
  'P0001', 'not_allowed: Your account cannot make changes right now.',
  'PT-178 a suspended account cannot send'
);
select tests.as('noterms');
select throws_ok(
  format($$ select public.send_message(%L, 'Hi') $$, tests.uid('owner')),
  'P0001', 'not_allowed: Your account cannot make changes right now.',
  'PT-178 an account that has not accepted the terms cannot send'
);

-- PT-179  deleted accounts (FR-DM-6) -----------------------------------------
select tests.as_admin();
insert into public.messages (conversation_id, sender_id, body) values (tests.id('c1'), tests.uid('outsider'), 'Last one from me.');
update public.accounts set deleted_at = now() where id = tests.uid('outsider');
update public.profiles set display_name = null where id = tests.uid('outsider');
select tests.as('member');
select throws_ok(
  format($$ select public.send_message(%L, 'Are you there?') $$, tests.uid('outsider')),
  'P0001', 'not_found: That member could not be found.',
  'PT-179 nobody can message a deleted account'
);
select is(
  (select count(*)::int from public.messages where conversation_id = tests.id('c1') and sender_id = tests.uid('outsider')), 2,
  'PT-179 messages from a deleted account stay in the conversation'
);

-- PT-180  the database checks every message (FR-DM-6) ----------------------
select tests.as('pending');
select throws_ok(
  format($$ select public.send_message(%L, repeat('x', 2001)) $$, tests.uid('owner')),
  'P0001', 'invalid: A message is 1 to 2,000 characters.',
  'PT-180 a message longer than 2,000 characters is refused'
);
select throws_ok(
  format($$ select public.send_message(%L, '   ') $$, tests.uid('owner')),
  'P0001', 'invalid: A message is 1 to 2,000 characters.',
  'PT-180 an empty message is refused'
);
select throws_ok(
  format($$ select public.send_message(%L, 'Me') $$, tests.uid('pending')),
  'P0001', 'invalid: Choose someone else to message.',
  'PT-180 nobody messages themselves'
);
select throws_ok(
  format($$ select public.send_message(%L, 'Who?') $$, gen_random_uuid()),
  'P0001', 'not_found: That member could not be found.',
  'PT-180 a message to nobody is refused'
);
select lives_ok(
  format($$ select public.send_message(%L, repeat('x', 2000)) $$, tests.uid('owner')),
  'PT-180 a 2,000-character message is allowed'
);

-- PT-181  10 new requests a day (FR-DM-6) ----------------------------------
-- pending has sent one (to owner). Nine more to new members, then the 11th.
select tests.as_admin();
select tests.make_user('dm' || i) from generate_series(1, 10) as i;
select tests.as('pending');
select lives_ok(
  $$ select public.send_message(tests.uid('dm' || i), 'Hello') from generate_series(1, 9) as i $$,
  'PT-181 ten requests in a day are allowed'
);
select throws_ok(
  $$ select public.send_message(tests.uid('dm10'), 'Hello') $$,
  'P0001', 'rate_limited: You can send at most 10 message requests a day.',
  'PT-181 the 11th request in a day is refused'
);

-- PT-182  20 messages in 10 minutes (FR-DM-6) ------------------------------
select tests.as_admin();
insert into public.messages (conversation_id, sender_id, body)
select tests.id('c_susp'), tests.uid('owner'), 'Message ' || i from generate_series(1, 19) as i;
select tests.as('owner');
select throws_ok(
  format($$ select public.send_message(%L, 'One more') $$, tests.uid('suspended')),
  'P0001', 'rate_limited: You are sending messages too quickly. Try again in a few minutes.',
  'PT-182 a 21st message within 10 minutes is refused'
);

-- PT-183  the unread count (FR-DM-4) ---------------------------------------
-- owner has read the open conversation with suspended; the request from
-- pending is new.
select tests.as_admin();
insert into public.conversation_reads (conversation_id, user_id) values (tests.id('c_susp'), tests.uid('owner'));
select tests.as('owner');
select is(public.unread_conversation_count(), 1, 'PT-183 a new request counts as unread for its recipient');
select tests.as('pending');
select is(public.unread_conversation_count(), 0, 'PT-183 your own messages are never unread for you');
select tests.as('owner');
select lives_ok(
  format($$ insert into public.conversation_reads (conversation_id, user_id) values ((select id from public.conversations where starter_id = %L and recipient_id = %L), %L) $$,
         tests.uid('pending'), tests.uid('owner'), tests.uid('owner')),
  'PT-183 the recipient opens the request'
);
select is(public.unread_conversation_count(), 0, 'PT-183 once opened, it no longer counts');
select tests.as_anon();
select throws_ok($$ select public.unread_conversation_count() $$, '42501', null, 'PT-183 an anonymous visitor has no unread count');

-- PT-184  no read receipts (FR-DM-3) ---------------------------------------
select tests.as('pending');
select is(
  (select count(*)::int from public.conversation_reads where user_id = tests.uid('owner')), 0,
  'PT-184 nobody can see when the other person read the conversation'
);
select throws_ok(
  format($$ insert into public.conversation_reads (conversation_id, user_id) values (%L, %L) $$, tests.id('c1'), tests.uid('pending')),
  '42501', null,
  'PT-184 nobody marks someone else''s conversation read'
);

-- PT-185  reporting a message (FR-DM-5) ------------------------------------
select tests.as_admin();
select tests.remember('m_bad', (select id from public.messages where conversation_id = tests.id('c_susp') order by created_at limit 1));
select tests.as('admin');
select throws_ok(
  format($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (%L, 'message', %L, 'harassment') $$, tests.uid('admin'), tests.id('m_bad')),
  'P0001', 'not_found: The reported item does not exist.',
  'PT-185 only someone in the conversation can report a message'
);
select tests.as('siteadmin');
select is((select count(*)::int from public.messages where conversation_id = tests.id('c_susp')), 0, 'PT-185 before a report, the site admin reads nothing');
select tests.as('suspended');
select throws_ok(
  format($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (%L, 'message', %L, 'harassment') $$, tests.uid('suspended'), tests.id('m_bad')),
  '42501', null,
  'PT-185 a suspended account cannot report (FR-MD-1 rules apply)'
);
select tests.as_admin();
update public.accounts set suspended_at = null where id = tests.uid('suspended');
select tests.as('suspended');
select lives_ok(
  format($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (%L, 'message', %L, 'harassment') $$, tests.uid('suspended'), tests.id('m_bad')),
  'PT-185 a person in the conversation reports a message'
);

-- PT-186  a reported conversation reaches the site admin only (FR-DM-5) ----
select tests.as_admin();
select is(
  (select group_id from public.reports where target_type = 'message'), null::uuid,
  'PT-186 a message report belongs to no group'
);
select tests.as('siteadmin');
select is((select count(*)::int from public.reports where target_type = 'message'), 1, 'PT-186 the site admin sees the report');
select is((select count(*)::int from public.messages where conversation_id = tests.id('c_susp')), 20, 'PT-186 the site admin reads the reported conversation');
select is((select count(*)::int from public.messages where conversation_id = tests.id('c1')), 0, 'PT-186 but not any other conversation');
select tests.as('admin');
select is((select count(*)::int from public.reports where target_type = 'message'), 0, 'PT-186 group admins do not see message reports');

-- PT-187  the sender is not told they were reported -------------------------
select tests.as('owner');
select is((select count(*)::int from public.reports where target_type = 'message'), 0, 'PT-187 the reported person does not see the report');

-- PT-188  the request limit can't be dodged by backdating -------------------
-- Conversations and messages take their time from the server only.
select tests.as_admin();
select is(
  (select count(*)::int from public.conversations where starter_id = tests.uid('pending') and created_at > now() - interval '1 minute'), 10,
  'PT-188 every request carries the server''s time'
);

-- PT-189  a member can't read or change someone else's read times -----------
select tests.as('owner');
select is(
  (select count(*)::int from public.conversation_reads where user_id = tests.uid('owner')), 2,
  'PT-189 a member sees their own read times'
);
select tests.as_admin();
update public.conversation_reads set last_read_at = '2026-01-01' where user_id = tests.uid('owner');
select tests.as('pending');
update public.conversation_reads set last_read_at = now() where user_id = tests.uid('owner');
select tests.as_admin();
select is(
  (select count(*)::int from public.conversation_reads where user_id = tests.uid('owner') and last_read_at > '2026-01-02'), 0,
  'PT-189 a member cannot change someone else''s read time'
);

select * from finish();
rollback;
