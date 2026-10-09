-- FR-GR-23: a group's website, set by its owner and admins.
begin;
select plan(5);
select tests.build_fixture();

select tests.as('owner');
select lives_ok(
  format($$ update public.groups set website = 'https://g1.example.org' where id = %L $$, tests.id('g1')),
  'FR-GR-23 the owner sets the website'
);
select tests.as('admin');
select lives_ok(
  format($$ update public.groups set website = 'https://g1-new.example.org' where id = %L $$, tests.id('g1')),
  'FR-GR-23 an admin sets the website'
);
select tests.as('member');
update public.groups set website = 'https://evil.example' where id = tests.id('g1');
select is((select website from public.groups where id = tests.id('g1')), 'https://g1-new.example.org',
  'FR-GR-23 a member cannot change it');
select tests.as('owner');
select throws_ok(
  format($$ update public.groups set website = 'javascript:alert(1)' where id = %L $$, tests.id('g1')),
  '23514', null, 'FR-GR-23 only http and https addresses are stored'
);
select tests.as_anon();
select is((select website from public.groups where id = tests.id('g1')), 'https://g1-new.example.org',
  'FR-GR-23 visitors see the website');

select * from finish();
rollback;
