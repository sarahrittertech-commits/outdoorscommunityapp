-- Keep every find (Sarah, 12 October 2026): "if we already expended the
-- resources scraping it we should store it". Research finds that aren't
-- ready for the board are kept in the private research tables, with how far
-- they were verified and why they're waiting, instead of being dropped.
-- Failures are kept too, so later runs don't pay to rediscover them.
-- Nothing unverified ever reaches the board, and contact details are still
-- never stored (FR-RS-2).
--
-- 1. candidates: more kinds (company, brand, camp, place, youth_program),
--    verification (verified / unverified / failed), evidence (why it's kept,
--    what's missing), other_urls (Instagram, Facebook, Meetup…), checked_at.
-- 2. candidate_events: verification, date_only (a date with no published
--    start time), note. Only verified, timed events are ever published.
-- 3. add_candidate takes the new fields; a failed find is kept out of the
--    admin queues.
--
-- Tests: supabase/tests/036-keep-every-find.sql (PT-231 to PT-234).

-- 1. Candidates ---------------------------------------------------------------

alter table research.candidates drop constraint if exists candidates_kind_check;
alter table research.candidates add constraint candidates_kind_check
  check (kind in ('group', 'guide', 'business', 'venue', 'company', 'brand', 'camp', 'place', 'youth_program'));

alter table research.candidates
  add column verification text not null default 'unverified' check (verification in ('verified', 'unverified', 'failed')),
  add column evidence text check (char_length(evidence) <= 1000),
  add column other_urls text[] not null default '{}' check (cardinality(other_urls) <= 10),
  add column checked_at timestamptz;

-- 2. Candidate events -----------------------------------------------------------

alter table research.candidate_events
  add column verification text not null default 'verified' check (verification in ('verified', 'unverified', 'failed')),
  add column date_only boolean not null default false,
  add column note text check (char_length(note) <= 500);

-- Publishing takes only verified events with a start time.
create or replace function research.publish_candidate_events(p_candidate_id uuid, p_group_id uuid, p_own_site_only boolean default false)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
  v_host text := (select research.own_host(g.source_url) from public.groups g where g.id = p_group_id);
begin
  perform set_config('branch.operator_listing', 'on', true);
  insert into public.events (group_id, title, description, starts_at, ends_at, timezone, location_name, address_visibility, source_url)
  select p_group_id, e.title,
         'Listed from the organizer''s public event page. Check there for details and how to sign up.'
           || case when e.ends_at is null then ' End time not listed.' else '' end,
         e.starts_at, coalesce(e.ends_at, e.starts_at + interval '3 hours'), e.timezone,
         e.location_name, 'public', e.source_url
  from research.candidate_events e
  where e.candidate_id = p_candidate_id
    and e.starts_at > now()
    and e.verification = 'verified' and not e.date_only
    and (not p_own_site_only or (v_host is not null and research.own_host(e.source_url) = v_host))
    and not exists (
      select 1 from public.events x
      where x.group_id = p_group_id and x.title = e.title and x.starts_at = e.starts_at
    );
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

revoke execute on function research.publish_candidate_events(uuid, uuid, boolean) from public, anon, authenticated;

create or replace function research.publish_business_events(p_candidate_id uuid, p_business_id uuid)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.business_events (business_id, title, starts_at, ends_at, timezone, location_name, source_url)
  select p_business_id, e.title, e.starts_at, coalesce(e.ends_at, e.starts_at + interval '3 hours'),
         e.timezone, e.location_name, e.source_url
  from research.candidate_events e
  where e.candidate_id = p_candidate_id and e.starts_at > now()
    and e.verification = 'verified' and not e.date_only
    and exists (select 1 from pg_catalog.pg_timezone_names z where z.name = e.timezone)
  on conflict (business_id, title, starts_at) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

revoke execute on function research.publish_business_events(uuid, uuid) from public, anon, authenticated;

-- The admin's guides, shops and venues queue leaves out failed finds.
create or replace function public.admin_business_candidates()
returns table (id uuid, name text, kind text, subcategory_name text, area text, description text, source_url text, affinity_tags text[], found_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (select public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only the site admin can see candidates.');
  end if;
  return query
    select c.id, c.name, c.kind, s.name, c.area, c.description, c.source_url, c.affinity_tags, c.found_at
    from research.candidates c
    join public.subcategories s on s.id = c.subcategory_id
    where c.kind in ('guide', 'business', 'venue') and c.status = 'kept' and c.verification <> 'failed'
    order by c.found_at, c.name;
end
$$;

-- 3. add_candidate ---------------------------------------------------------------
-- As 20261012000001, plus: verification, evidence, other_urls, checked_at on
-- the find; verification, date_only, note on each event. A group find that
-- failed verification is kept ('kept'), not queued for review ('new').
-- A find for a known candidate updates its evidence and verification.

create or replace function research.add_candidate(p jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := btrim(p ->> 'name');
  v_subcategory uuid;
  v_existing research.candidates;
  v_group public.groups;
  v_id uuid;
  v_events integer := 0;
  v_event jsonb;
  v_dup_name text;
  v_dup_url text;
  v_verification text := coalesce(nullif(p ->> 'verification', ''), 'unverified');
  v_urls text[] := coalesce(array(select jsonb_array_elements_text(p -> 'other_urls')), '{}');
begin
  select s.id into v_subcategory from public.subcategories s where s.slug = p ->> 'subcategory';
  if v_subcategory is null then
    raise exception 'unknown subcategory: %', p ->> 'subcategory';
  end if;

  select * into v_existing from research.candidates c where lower(btrim(c.name)) = lower(v_name);
  select * into v_group from public.groups g
   where lower(g.name) = lower(v_name) or g.id = v_existing.group_id
   order by g.created_at limit 1;

  if v_existing.id is not null and (p ? 'evidence' or p ? 'verification' or p ? 'other_urls') then
    update research.candidates c
       set evidence = coalesce(nullif(btrim(p ->> 'evidence'), ''), c.evidence),
           verification = case when p ? 'verification' then v_verification else c.verification end,
           other_urls = case when cardinality(v_urls) > 0 then v_urls else c.other_urls end,
           checked_at = coalesce(nullif(p ->> 'checked_at', '')::timestamptz, now())
     where c.id = v_existing.id;
  end if;

  if v_existing.business_id is not null
     and exists (select 1 from public.businesses b where b.id = v_existing.business_id and b.status = 'active') then
    v_id := v_existing.id;
  elsif v_group.id is not null and v_group.is_unclaimed and v_group.status = 'active' then
    v_id := v_existing.id;
    if v_id is null then
      insert into research.candidates (kind, name, subcategory_id, area, description, source_url, affinity_tags, out_of_region, status, group_id, decided_at, verification)
      values ('group', v_name, v_subcategory, btrim(p ->> 'area'), btrim(p ->> 'description'), p ->> 'source_url',
              coalesce(array(select jsonb_array_elements_text(p -> 'affinity_tags')), '{}'),
              coalesce((p ->> 'out_of_region')::boolean, false), 'listed', v_group.id, now(), 'verified')
      returning id into v_id;
    end if;
  elsif v_existing.status in ('new', 'kept') then
    v_id := v_existing.id;
  elsif v_existing.id is not null or v_group.id is not null then
    return jsonb_build_object('result', 'duplicate');
  else
    select o.name, o.website into v_dup_name, v_dup_url
      from research.organizations o where lower(btrim(o.name)) = lower(v_name)
     order by o.org_id limit 1;
    if v_dup_name is null then
      select d.name, d.url into v_dup_name, v_dup_url from research.possible_duplicate(v_name, p ->> 'source_url') d;
    end if;
    insert into research.candidates (kind, name, subcategory_id, area, description, source_url, affinity_tags, out_of_region, status,
                                     possible_duplicate_of, possible_duplicate_url, verification, evidence, other_urls, checked_at)
    values (p ->> 'kind', v_name, v_subcategory, btrim(p ->> 'area'), btrim(p ->> 'description'), p ->> 'source_url',
            coalesce(array(select jsonb_array_elements_text(p -> 'affinity_tags')), '{}'),
            coalesce((p ->> 'out_of_region')::boolean, false),
            case when p ->> 'kind' = 'group' and v_verification <> 'failed' then 'new' else 'kept' end,
            v_dup_name, v_dup_url, v_verification, nullif(btrim(p ->> 'evidence'), ''), v_urls,
            coalesce(nullif(p ->> 'checked_at', '')::timestamptz, now()))
    returning id into v_id;
  end if;

  for v_event in select * from jsonb_array_elements(coalesce(p -> 'events', '[]'::jsonb)) loop
    if (v_event ->> 'starts_at')::timestamptz > now() then
      insert into research.candidate_events (candidate_id, title, starts_at, ends_at, timezone, location_name, source_url, verification, date_only, note)
      values (v_id, btrim(v_event ->> 'title'), (v_event ->> 'starts_at')::timestamptz,
              nullif(v_event ->> 'ends_at', '')::timestamptz,
              coalesce(nullif(v_event ->> 'timezone', ''), 'America/New_York'),
              btrim(v_event ->> 'location_name'), v_event ->> 'source_url',
              coalesce(nullif(v_event ->> 'verification', ''), 'verified'),
              coalesce((v_event ->> 'date_only')::boolean, false),
              nullif(btrim(v_event ->> 'note'), ''))
      on conflict (candidate_id, title, starts_at) do nothing;
    end if;
  end loop;

  if v_existing.business_id is not null
     and exists (select 1 from public.businesses b where b.id = v_existing.business_id and b.status = 'active') then
    v_events := research.publish_business_events(v_id, v_existing.business_id);
    return jsonb_build_object('result', 'events_added', 'events', v_events);
  end if;
  if v_group.id is not null and v_group.is_unclaimed and v_group.status = 'active' then
    v_events := case when p ->> 'kind' = 'group' then research.publish_candidate_events(v_id, v_group.id, true) else 0 end;
    return jsonb_build_object('result', 'events_added', 'events', v_events);
  end if;
  return jsonb_build_object(
    'result', case when v_existing.id is not null then 'updated' else 'added' end,
    'id', v_id,
    'possible_duplicate', v_dup_name is not null);
end
$$;

revoke execute on function research.add_candidate(jsonb) from public, anon, authenticated;
