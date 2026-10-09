-- UC-32: suggestions to the site admin (FR-AD-4 to FR-AD-7). PT-110..PT-119.
begin;
select plan(28);
select tests.build_fixture();

-- PT-110  a member sends a suggestion (FR-AD-4) ---------------------------
select tests.as('member');
select lives_ok(
  format($$ insert into public.suggestions (user_id, kind, title, details, link)
            values (%L, 'group', 'Pisgah Paddlers', 'A paddling club near Brevard.', 'https://example.org/paddlers') $$,
         tests.uid('member')),
  'PT-110 a member sends a suggestion'
);
select tests.as_admin();
select is(
  (select status::text || '|' || coalesce(admin_note, '-') from public.suggestions where user_id = tests.uid('member')),
  'new|-',
  'PT-110 a new suggestion starts as new, with no note'
);

-- PT-111  visitors and non-writers cannot send one (FR-AD-4, TR-SEC-2) ------
select tests.as_anon();
select throws_ok(
  $$ insert into public.suggestions (user_id, kind, title) values (null, 'other', 'From a visitor') $$,
  '42501', null,
  'PT-111 an anonymous visitor cannot send a suggestion'
);
select tests.as('suspended');
select throws_ok(
  format($$ insert into public.suggestions (user_id, kind, title) values (%L, 'other', 'Suspended idea') $$, tests.uid('suspended')),
  '42501', null,
  'PT-111 a suspended account cannot send a suggestion'
);
select tests.as('noterms');
select throws_ok(
  format($$ insert into public.suggestions (user_id, kind, title) values (%L, 'other', 'No terms idea') $$, tests.uid('noterms')),
  '42501', null,
  'PT-111 an account that has not accepted the terms cannot send a suggestion'
);

-- PT-112  only for themselves, only the fields a member writes -------------
select tests.as('outsider');
select throws_ok(
  format($$ insert into public.suggestions (user_id, kind, title) values (%L, 'other', 'In someone else''s name') $$, tests.uid('member')),
  '42501', null,
  'PT-112 a member cannot send a suggestion in someone else''s name'
);
select throws_ok(
  format($$ insert into public.suggestions (user_id, kind, title, status) values (%L, 'other', 'Already planned', 'planned') $$, tests.uid('outsider')),
  '42501', null,
  'PT-112 a member cannot set the status of their own suggestion'
);
select throws_ok(
  format($$ insert into public.suggestions (user_id, kind, title, admin_note) values (%L, 'other', 'With a note', 'yes') $$, tests.uid('outsider')),
  '42501', null,
  'PT-112 a member cannot write the admin''s note'
);

-- PT-113  the database checks every field (FR-AD-4) -----------------------
select throws_ok(
  format($$ insert into public.suggestions (user_id, kind, title) values (%L, 'party', 'A bad kind') $$, tests.uid('outsider')),
  '22P02', null,
  'PT-113 the kind must be one of the five'
);
select throws_ok(
  format($$ insert into public.suggestions (user_id, kind, title) values (%L, 'other', '  a ') $$, tests.uid('outsider')),
  '23514', null,
  'PT-113 a title shorter than 3 characters is refused'
);
select throws_ok(
  format($$ insert into public.suggestions (user_id, kind, title) values (%L, 'other', repeat('x', 121)) $$, tests.uid('outsider')),
  '23514', null,
  'PT-113 a title longer than 120 characters is refused'
);
select throws_ok(
  format($$ insert into public.suggestions (user_id, kind, title, details) values (%L, 'other', 'Long', repeat('x', 2001)) $$, tests.uid('outsider')),
  '23514', null,
  'PT-113 details longer than 2,000 characters are refused'
);
select throws_ok(
  format($$ insert into public.suggestions (user_id, kind, title, link) values (%L, 'other', 'Script link', 'javascript:alert(1)') $$, tests.uid('outsider')),
  '23514', null,
  'PT-113 a link that is not http or https is refused'
);

-- PT-114  private to the sender and the site admin (FR-AD-5) ---------------
select tests.as('outsider');
select is((select count(*)::int from public.suggestions), 0, 'PT-114 another member cannot read someone''s suggestion');
select tests.as('owner');
select is((select count(*)::int from public.suggestions), 0, 'PT-114 a page admin cannot read members'' suggestions');
select tests.as_anon();
select throws_ok($$ select count(*) from public.suggestions $$, '42501', null, 'PT-114 an anonymous visitor cannot read suggestions');
select tests.as('member');
select is((select count(*)::int from public.suggestions), 1, 'PT-114 the sender reads their own suggestion');
select tests.as('siteadmin');
select is((select count(*)::int from public.suggestions), 1, 'PT-114 the site admin reads every suggestion');

-- PT-115  only the site admin changes a status (FR-AD-6) -------------------
select tests.as('member');
select throws_ok(
  format($$ update public.suggestions set status = 'done' where user_id = %L $$, tests.uid('member')),
  '42501', null,
  'PT-115 the sender cannot update their suggestion directly'
);
select throws_ok(
  format($$ select public.set_suggestion_status((select id from public.suggestions where user_id = %L), 'done', 'mine') $$, tests.uid('member')),
  'P0001', 'not_allowed: Only the site admin can update suggestions.',
  'PT-115 the sender cannot mark their own suggestion done'
);
select tests.as('owner');
select throws_ok(
  format($$ select public.set_suggestion_status(%L, 'planned') $$, gen_random_uuid()),
  'P0001', 'not_allowed: Only the site admin can update suggestions.',
  'PT-115 a page admin cannot change a suggestion''s status'
);

-- PT-116  the site admin marks it, with a note the sender reads ------------
select tests.as_admin();
select tests.remember('s1', (select id from public.suggestions where user_id = tests.uid('member')));
select tests.as('siteadmin');
select lives_ok(
  format($$ select public.set_suggestion_status(%L, 'planned', '  Inviting them next week.  ') $$, tests.id('s1')),
  'PT-116 the site admin marks a suggestion planned with a note'
);
select tests.as('member');
select is(
  (select status::text || '|' || admin_note from public.suggestions where id = tests.id('s1')),
  'planned|Inviting them next week.',
  'PT-116 the sender sees the status and the note'
);

-- PT-117  set_suggestion_status checks its arguments -----------------------
select tests.as('siteadmin');
select throws_ok(
  format($$ select public.set_suggestion_status(%L, 'new') $$, tests.id('s1')),
  'P0001', 'invalid: A suggestion can be marked planned, done or declined.',
  'PT-117 a suggestion cannot be set back to new'
);
select throws_ok(
  format($$ select public.set_suggestion_status(%L, 'done', repeat('x', 501)) $$, tests.id('s1')),
  'P0001', 'invalid: The note can be at most 500 characters.',
  'PT-117 a note longer than 500 characters is refused'
);

-- PT-118  5 a day (FR-AD-7) ------------------------------------------------
-- member has sent one already.
select tests.as('member');
select lives_ok(
  format($$ insert into public.suggestions (user_id, kind, title)
            select %L, 'feature', 'Idea ' || i from generate_series(2, 5) as i $$, tests.uid('member')),
  'PT-118 five suggestions in a day are allowed'
);
select throws_ok(
  format($$ insert into public.suggestions (user_id, kind, title) values (%L, 'feature', 'Idea 6') $$, tests.uid('member')),
  'P0001', 'rate_limited: You can send at most 5 suggestions a day.',
  'PT-118 the sixth suggestion in a day is refused'
);

-- PT-119  created_at is the server's clock ---------------------------------
-- An old created_at would slip a suggestion out of the day's count. The
-- column is not writable by members, and the limit guard sets it regardless.
select tests.as('outsider');
select throws_ok(
  format($$ insert into public.suggestions (user_id, kind, title, created_at) values (%L, 'other', 'Backdated', now() - interval '2 days') $$, tests.uid('outsider')),
  '42501', null,
  'PT-119 a member cannot backdate a suggestion'
);

select * from finish();
rollback;
