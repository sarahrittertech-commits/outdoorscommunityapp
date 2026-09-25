-- Discussions: PT-8, PT-9, PT-10, PT-11, FR-DS-*.
begin;
select plan(20);
select tests.build_fixture();

-- PT-8: posting outside your groups -------------------------------------------
select tests.as('outsider');
select throws_ok(
  format($$ insert into public.threads (group_id, author_id, title, body) values (%L, %L, 'Hi', 'Hello') $$, tests.id('g1'), tests.uid('outsider')),
  '42501', null, 'PT-8 non-members cannot start threads'
);
select tests.as('member');
select throws_ok(
  format($$ insert into public.threads (group_id, author_id, title, body) values (%L, %L, 'Hi', 'Hello') $$, tests.id('g2'), tests.uid('member')),
  '42501', null, 'PT-8 members cannot post in a group they do not belong to'
);

-- Normal posting --------------------------------------------------------------
select lives_ok(
  format($$ insert into public.threads (group_id, author_id, title, body) values (%L, %L, 'Gear swap', 'Anyone?') $$, tests.id('g1'), tests.uid('member')),
  'FR-DS-1 members start threads'
);
select lives_ok(
  format($$ insert into public.replies (thread_id, author_id, body) values (%L, %L, 'Me too') $$, tests.id('t1'), tests.uid('member')),
  'FR-DS-2 members reply'
);
select is((select reply_count from public.threads where id = tests.id('t1')), 2, 'FR-DS-3 replies are counted on the thread');

-- PT-9: discussions off -------------------------------------------------------
select throws_ok(
  format($$ insert into public.threads (group_id, author_id, title, body) values (%L, %L, 'Hi', 'Hello') $$, tests.id('g3'), tests.uid('member')),
  '42501', null, 'PT-9 members cannot post while discussions are off'
);
select throws_ok(
  format($$ insert into public.replies (thread_id, author_id, body) values (%L, %L, 'Hi') $$, tests.id('t3'), tests.uid('member')),
  '42501', null, 'PT-9 members cannot reply while discussions are off'
);
select is((select count(*)::int from public.threads where id = tests.id('t3')), 1, 'FR-GR-4 old threads stay readable while discussions are off');
select tests.as('owner');
select throws_ok(
  format($$ insert into public.threads (group_id, author_id, title, body) values (%L, %L, 'Hi', 'Hello') $$, tests.id('g3'), tests.uid('owner')),
  '42501', null, 'PT-9 not even the owner can post while discussions are off'
);

-- PT-10: locked threads -------------------------------------------------------
select tests.as('member');
select throws_ok(
  format($$ insert into public.replies (thread_id, author_id, body) values (%L, %L, 'Hi') $$, tests.id('t_locked'), tests.uid('member')),
  '42501', null, 'PT-10 nobody can reply to a locked thread'
);

-- PT-11: editing --------------------------------------------------------------
select tests.as('admin');
update public.threads set body = 'Edited by someone else' where id = tests.id('t1');
select is((select body from public.threads where id = tests.id('t1')), 'Anyone driving from Brevard?', 'PT-11 you cannot edit someone else''s post');

select tests.as('member');
update public.threads set body = 'Anyone driving from Pisgah Forest?' where id = tests.id('t1');
select isnt((select edited_at from public.threads where id = tests.id('t1')), null, 'FR-DS-4 authors edit their posts, which are marked edited');
select throws_ok(
  format($$ update public.threads set is_pinned = true where id = %L $$, tests.id('t1')),
  '42501', null, 'Authors cannot pin their own thread'
);

-- Moderation ------------------------------------------------------------------
select tests.as('admin');
select lives_ok(
  format($$ select public.set_thread_flags(%L, p_locked => true) $$, tests.id('t1')),
  'Admins lock a thread without touching the pin'
);
select tests.as('member');
select throws_ok(
  format($$ insert into public.replies (thread_id, author_id, body) values (%L, %L, 'Late') $$, tests.id('t1'), tests.uid('member')),
  '42501', null, 'PT-10 locking takes effect'
);
select tests.as('admin');
select lives_ok(format($$ select public.set_thread_flags(%L, p_locked => false) $$, tests.id('t1')), 'unlock');
select tests.as('member');
select throws_ok(
  format($$ select public.remove_post('reply', %L) $$, tests.id('r1')),
  'P0001', null, 'Members cannot remove posts'
);
select tests.as('admin');
select lives_ok(
  format($$ select public.remove_post('reply', %L, 'rude') $$, tests.id('r1')),
  'FR-DS-5 admins remove posts'
);
select tests.as('member');
select is((select body from public.replies where id = tests.id('r1')), '', 'FR-DS-5 removed content is no longer readable by members');
select tests.as('siteadmin');
select is(
  (select content_snapshot ->> 'body' from public.moderation_actions where target_id = tests.id('r1')), 'I can drive.',
  'FR-MD-6 the site admin can still see what was removed'
);

select * from finish();
rollback;
