-- Search terms (13 October 2026). PT-255, PT-256.
begin;
select plan(7);
select tests.build_fixture();

-- PT-255: anyone reads the terms; Western North Carolina still means the Western Carolinas.
select tests.as_anon();
select is((select r.slug from public.search_terms t join public.regions r on r.id = t.region_id where t.term = 'Western North Carolina'),
  'western-nc', 'PT-255 visitors read that Western North Carolina means the Western Carolinas');
select throws_ok($$ insert into public.search_terms (term, kind) values ('Hiking', 'keyword') $$, '42501', null,
  'PT-255 a visitor cannot add a term');

-- PT-256: only the site admin adds, changes or removes a term.
select tests.as('member');
select throws_ok($$ insert into public.search_terms (term, kind) values ('Hiking', 'keyword') $$, '42501', null,
  'PT-256 a signed-in member cannot add a term');
select lives_ok($$ delete from public.search_terms where term = 'WNC' $$, 'PT-256 a member''s delete runs');
select is((select count(*)::integer from public.search_terms where term = 'WNC'), 1, 'PT-256 but removes nothing');
select tests.as('siteadmin');
select lives_ok($$ insert into public.search_terms (term, kind) values ('Hiking', 'keyword') $$,
  'PT-256 the site admin adds a term');
select throws_ok($$ insert into public.search_terms (term, kind) values ('hiking ', 'keyword') $$, '23505', null,
  'PT-256 the same term twice is refused');

select * from finish();
rollback;
