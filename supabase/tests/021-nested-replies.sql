-- Reply to a reply, one level only (UC-19, FR-DS-9, 20261010000006). PT-90..PT-99.
begin;
select plan(20);
select tests.build_fixture();

-- Fixtures: a second thread in g1 with a reply, and a reply in the locked
-- thread and in the discussions-off thread (written by the superuser).
select tests.as_admin();
insert into public.threads (group_id, author_id, title, body)
values (tests.id('g1'), tests.uid('admin'), 'Other thread', 'Something else.');
select tests.remember('t2', (select id from public.threads where title = 'Other thread'));
insert into public.replies (thread_id, author_id, body) values (tests.id('t2'), tests.uid('admin'), 'Elsewhere.');
select tests.remember('r_t2', (select id from public.replies where body = 'Elsewhere.'));
insert into public.replies (thread_id, author_id, body) values (tests.id('t_locked'), tests.uid('admin'), 'Before the lock.');
select tests.remember('r_locked', (select id from public.replies where body = 'Before the lock.'));
insert into public.replies (thread_id, author_id, body) values (tests.id('t3'), tests.uid('member'), 'Before switch-off.');
select tests.remember('r_t3', (select id from public.replies where body = 'Before switch-off.'));

-- PT-90  A member answers a top-level reply ---------------------------------
select tests.as('admin');
select lives_ok(
  format($$ insert into public.replies (thread_id, author_id, parent_id, body) values (%L, %L, %L, 'I can take two.') $$,
         tests.id('t1'), tests.uid('admin'), tests.id('r1')),
  'PT-90 a member answers a reply'
);
select is((select parent_id from public.replies where body = 'I can take two.'), tests.id('r1'), 'PT-90 the answer sits under the reply it answers');
select is((select answers_id from public.replies where body = 'I can take two.'), null, 'PT-90 a direct answer names no one else');

-- PT-91  Answering an answer stays at the same level ------------------------
select tests.as('member');
select lives_ok(
  format($$ insert into public.replies (thread_id, author_id, parent_id, body) values (%L, %L, (select id from public.replies where body = 'I can take two.'), 'Thanks!') $$,
         tests.id('t1'), tests.uid('member')),
  'PT-91 a member answers a nested reply'
);
select is((select parent_id from public.replies where body = 'Thanks!'), tests.id('r1'), 'PT-91 it joins the same parent: one level only');
select is((select answers_id from public.replies where body = 'Thanks!'),
          (select id from public.replies where body = 'I can take two.'), 'PT-91 it records the reply it answers');
select is((select count(*)::int from public.replies p join public.replies c on c.parent_id = p.id where p.parent_id is not null), 0,
          'PT-91 no reply has a nested parent');

-- PT-92  The parent must be in the same thread ------------------------------
select throws_ok(
  format($$ insert into public.replies (thread_id, author_id, parent_id, body) values (%L, %L, %L, 'Wrong thread') $$,
         tests.id('t1'), tests.uid('member'), tests.id('r_t2')),
  'P0001', 'invalid: You can only answer a reply in the same thread.',
  'PT-92 a reply cannot answer a reply in another thread'
);
select throws_ok(
  format($$ insert into public.replies (thread_id, author_id, parent_id, body) values (%L, %L, %L, 'Made up') $$,
         tests.id('t1'), tests.uid('member'), gen_random_uuid()),
  'P0001', 'invalid: You can only answer a reply in the same thread.',
  'PT-92 a reply cannot answer a reply that does not exist'
);

-- PT-93  Members only -------------------------------------------------------
select tests.as('outsider');
select throws_ok(
  format($$ insert into public.replies (thread_id, author_id, parent_id, body) values (%L, %L, %L, 'Hi') $$,
         tests.id('t1'), tests.uid('outsider'), tests.id('r1')),
  '42501', null, 'PT-93 non-members cannot answer a reply'
);
select tests.as('banned');
select throws_ok(
  format($$ insert into public.replies (thread_id, author_id, parent_id, body) values (%L, %L, %L, 'Hi') $$,
         tests.id('t1'), tests.uid('banned'), tests.id('r1')),
  '42501', null, 'PT-93 banned members cannot answer a reply'
);
select tests.as_anon();
select throws_ok(
  format($$ insert into public.replies (thread_id, author_id, parent_id, body) values (%L, %L, %L, 'Hi') $$,
         tests.id('t1'), tests.uid('member'), tests.id('r1')),
  '42501', null, 'PT-93 signed-out visitors cannot answer a reply'
);

-- PT-94  Locked threads and discussions off ---------------------------------
select tests.as('member');
select throws_ok(
  format($$ insert into public.replies (thread_id, author_id, parent_id, body) values (%L, %L, %L, 'Hi') $$,
         tests.id('t_locked'), tests.uid('member'), tests.id('r_locked')),
  '42501', null, 'PT-94 nobody answers a reply in a locked thread'
);
select throws_ok(
  format($$ insert into public.replies (thread_id, author_id, parent_id, body) values (%L, %L, %L, 'Hi') $$,
         tests.id('t3'), tests.uid('member'), tests.id('r_t3')),
  '42501', null, 'PT-94 nobody answers a reply while discussions are off'
);

-- PT-95  Removing a parent keeps its answers readable -----------------------
select tests.as('admin');
select lives_ok(format($$ select public.remove_post('reply', %L) $$, tests.id('r1')), 'PT-95 an admin removes the parent reply');
select tests.as('member');
select is((select body from public.replies where body = 'Thanks!' and parent_id = tests.id('r1')), 'Thanks!',
          'PT-95 answers under a removed reply stay readable');

-- PT-96  A removed reply cannot be answered ---------------------------------
select throws_ok(
  format($$ insert into public.replies (thread_id, author_id, parent_id, body) values (%L, %L, %L, 'Late') $$,
         tests.id('t1'), tests.uid('member'), tests.id('r1')),
  'P0001', 'invalid: That reply has been removed.',
  'PT-96 a removed reply cannot be answered'
);

-- PT-97  The parent cannot be changed after posting -------------------------
select throws_ok(
  format($$ update public.replies set parent_id = null where body = 'Thanks!' $$),
  '42501', null, 'PT-97 authors cannot move a reply to another parent'
);

-- PT-98  The posting rate limit covers answers ------------------------------
select tests.as('admin');
do $$
begin
  while (select count(*) from public.threads where author_id = auth.uid() and created_at > now() - interval '10 minutes')
      + (select count(*) from public.replies where author_id = auth.uid() and created_at > now() - interval '10 minutes') < 10 loop
    insert into public.replies (thread_id, author_id, body) values (tests.id('t2'), auth.uid(), 'Filler');
  end loop;
end
$$;
select throws_ok(
  format($$ insert into public.replies (thread_id, author_id, parent_id, body) values (%L, %L, %L, 'One too many') $$,
         tests.id('t2'), tests.uid('admin'), tests.id('r_t2')),
  'P0001', 'rate_limited: You are posting too quickly. Try again in a few minutes.',
  'PT-98 answers count toward the posting rate limit'
);

-- PT-99  answers_id is set by the database only ------------------------------
select tests.as('member');
insert into public.replies (thread_id, author_id, parent_id, answers_id, body)
values (tests.id('t2'), tests.uid('member'), tests.id('r_t2'), tests.id('r_t2'), 'Direct answer');
select is((select answers_id from public.replies where body = 'Direct answer'), null,
          'PT-99 a client cannot set who a reply answers');

select * from finish();
rollback;
