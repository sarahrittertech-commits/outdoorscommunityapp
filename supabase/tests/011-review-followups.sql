-- Follow-ups from the 9 October 2026 code review: a member always has a
-- name, who reported something stays private, a group whose owner left comes
-- back only through a claim, claim requests are limited, and an archived
-- group is read-only for changing an RSVP too.
-- PT-28 to PT-32.
begin;
select plan(20);
select tests.build_fixture();

-- PT-28  FR-AC-3: a member always has a name -------------------------------
select tests.as('member');
select throws_ok(
  $$update public.profiles set display_name = '' where id = tests.uid('member')$$,
  'P0001', null, 'PT-28 a member cannot blank their own display name'
);
select throws_ok(
  $$update public.profiles set display_name = null where id = tests.uid('member')$$,
  'P0001', null, 'PT-28 nor clear it to null'
);
select throws_ok(
  $$select public.complete_onboarding(' ', null, null, true, true)$$,
  'P0001', null, 'PT-28 onboarding refuses a blank name'
);
select lives_ok(
  $$update public.profiles set display_name = 'Still Named' where id = tests.uid('member')$$,
  'PT-28 a real name is still accepted'
);

-- An account that already has no name cannot write. The fixture's names are
-- set, so take one away as the admin to reach that state.
select tests.as_admin();
update public.profiles set display_name = null where id = tests.uid('outsider');
select tests.as('outsider');
select is(
  public.can_write(), false,
  'PT-28 an account with no display name cannot write'
);
select tests.as_admin();
update public.profiles set display_name = 'Outsider' where id = tests.uid('outsider');
select tests.as('outsider');
select is(public.can_write(), true, 'PT-28 and can write again once named');

-- PT-29  FR-MD-8: who reported something is not shown to the group ---------
select tests.as('admin');
select throws_ok(
  'select reporter_id from public.reports',
  '42501', null, 'PT-29 a group admin cannot read reporter_id'
);
select lives_ok(
  'select id, target_type, reason, note, status from public.reports',
  'PT-29 a group admin still reads the report itself'
);
select tests.as_anon();
select is_empty(
  'select reporter_id from public.reports',
  'PT-29 visitors see no reports at all, so no reporter either'
);
select tests.as('admin');
select is(
  (select count(*)::int from public.report_reporters(tests.id('rep_thread'))), 0,
  'PT-29 report_reporters() tells a group admin nothing'
);
select tests.as('siteadmin');
select is(
  (select reporter_id from public.report_reporters(tests.id('rep_thread'))),
  tests.uid('member'),
  'PT-29 the site admin can see who reported it'
);

-- PT-31  TR-SEC-8: claim requests are rate limited -------------------------
-- Five unclaimed listings, then a sixth claim on the same day.
select tests.as_admin();
insert into public.groups (slug, name, description, subcategory_id, region_id, area, join_policy, is_unclaimed, source_url, created_by)
select 'listing-' || i, 'Listing ' || i, 'An unclaimed listing for the limit test.',
       (select id from public.subcategories order by sort_order limit 1),
       (select id from public.regions limit 1), 'Brevard', 'open', true,
       'https://example.org/listing-' || i, null
from generate_series(1, 6) as i;

select tests.as('outsider');
select lives_ok(
  $$insert into public.group_claims (group_id, user_id, note)
    select g.id, tests.uid('outsider'), 'I run this group, honestly I do.'
    from public.groups g where g.slug like 'listing-%' order by g.slug limit 5$$,
  'PT-31 five claim requests in a day are allowed'
);
select throws_ok(
  $$insert into public.group_claims (group_id, user_id, note)
    values ((select id from public.groups where slug = 'listing-6'),
            tests.uid('outsider'), 'I run this one too, honestly I do.')$$,
  'P0001', null, 'PT-31 the sixth in the same day is refused'
);

-- PT-32  FR-GR-6: an archived group is read-only for changing an RSVP ------
select tests.as_admin();
insert into public.event_rsvps (event_id, user_id, status)
values (tests.id('e1'), tests.uid('member'), 'going');
update public.groups set status = 'archived' where id = tests.id('g1');

select tests.as('member');
select is(
  (select count(*)::int from public.event_rsvps
   where event_id = tests.id('e1') and user_id = tests.uid('member')), 1,
  'PT-32 the RSVP made before archiving is still there'
);
-- The row passes the USING clause, so Postgres refuses it on the WITH CHECK
-- rather than quietly matching nothing.
select throws_ok(
  $$update public.event_rsvps set status = 'not_going'
    where event_id = tests.id('e1') and user_id = tests.uid('member')$$,
  '42501', null, 'PT-32 changing an RSVP in an archived group is refused'
);
select tests.as_admin();
select is(
  (select status::text from public.event_rsvps
   where event_id = tests.id('e1') and user_id = tests.uid('member')), 'going',
  'PT-32 the stored RSVP is unchanged'
);

-- PT-30 last: deleting the owner cancels g1's upcoming events, which would
-- change what the tests above are measuring.
-- PT-30  FR-GR-10: a group whose owner left comes back through a claim -----
-- g3 is owned by 'owner'. Remove it as the site admin, then have the owner
-- delete their account: the group must still be marked as needing an owner.
select tests.as('siteadmin');
select public.remove_group(tests.id('g3'), 'test');
select tests.as('owner');
select public.delete_my_account();
select tests.as_admin();
select is(
  (select needs_owner from public.groups where id = tests.id('g3')), true,
  'PT-30 a removed group whose owner left is marked as needing an owner'
);
select is(
  (select count(*)::int from public.group_members
   where group_id = tests.id('g3') and role = 'owner'), 0,
  'PT-30 and has no owner row'
);
select tests.as('siteadmin');
select throws_ok(
  $$select public.restore_group(tests.id('g3'))$$,
  'P0001', null, 'PT-30 restoring it is refused until a claim gives it an owner'
);
select tests.as_admin();
select is(
  (select status::text from public.groups where id = tests.id('g3')), 'removed',
  'PT-30 so it never comes back active with nobody able to run it'
);

select * from finish();
rollback;
