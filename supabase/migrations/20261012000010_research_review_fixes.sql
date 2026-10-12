-- Code review fixes, 12 October 2026 (end of the research day).
--
-- 1. Skip works for event companies (the queue showed them; Skip said
--    not_found).
-- 2. A research event with an unknown time zone is left out when a group is
--    listed, instead of failing the whole listing (as business events
--    already were).
-- 3. Event verification fails closed: an event sent without a
--    verification is unverified, never published.
-- 4. A start or end time sent without a UTC offset is read in the event's
--    own time zone, not the database's (UTC).
-- 5. An event whose end isn't after its start keeps its start and loses
--    the end; an event link that isn't a plain web address falls back to
--    the find's own link. One bad event no longer loses the whole find
--    (FR-RS-13).
-- 6. A listed guide, shop, venue or company takes new research events only
--    from its own website or a registration site (RunSignup, UltraSignup,
--    BikeReg, Eventbrite, Race Roster, Active, Meetup), not from regional
--    calendars or other organizers. Listing one by hand still publishes what
--    the site admin is looking at.
-- 7. A failed find can't be listed by id.
-- 8. event_listings gains subcategory_id (appended), so a subcategory page
--    can filter events directly instead of sending every host's slug.
--
-- Tests: supabase/tests/038-research-review-fixes.sql (PT-236 to PT-242).

-- 1 ----------------------------------------------------------------------------
create or replace function public.skip_business_candidate(p_candidate_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can skip candidates.');
  end if;
  update research.candidates
     set status = 'skipped', decided_at = now(), decided_by = auth.uid()
   where id = p_candidate_id and kind in ('guide', 'business', 'venue', 'company') and status = 'kept';
  if not found then
    perform public.raise_rule('not_found', 'No kept guide, shop, venue or event company with that id.');
  end if;
end
$$;

-- 2 ----------------------------------------------------------------------------
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
    and exists (select 1 from pg_catalog.pg_timezone_names z where z.name = e.timezone)
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

-- 3 ----------------------------------------------------------------------------
alter table research.candidate_events alter column verification set default 'unverified';

-- 4 ----------------------------------------------------------------------------
-- A time with a Z or +hh:mm offset is taken as given; one without is a
-- wall-clock time in p_tz (UTC if p_tz isn't a real zone).
create or replace function research.event_time(p text, p_tz text)
returns timestamptz
language sql stable set search_path = ''
as $$
  select case
    when nullif(btrim(p), '') is null then null
    when btrim(p) ~ '\d:\d\d(:\d\d(\.\d+)?)?\s*(Z|z|[+-]\d\d(:?\d\d)?)$' then btrim(p)::timestamptz
    when exists (select 1 from pg_catalog.pg_timezone_names z where z.name = p_tz)
      then btrim(p)::timestamp at time zone p_tz
    else btrim(p)::timestamp at time zone 'UTC'
  end
$$;

revoke execute on function research.event_time(text, text) from public, anon, authenticated;

-- 6 ----------------------------------------------------------------------------
create or replace function research.is_registration_site(p text)
returns boolean
language sql immutable set search_path = ''
as $$
  select coalesce(lower(substring(p from '^https?://([^/:?#]+)'))
    ~ '(^|\.)(runsignup\.com|ultrasignup\.com|bikereg\.com|eventbrite\.com|raceroster\.com|active\.com|meetup\.com)$', false)
$$;

revoke execute on function research.is_registration_site(text) from public, anon, authenticated;

drop function research.publish_business_events(uuid, uuid);

create function research.publish_business_events(p_candidate_id uuid, p_business_id uuid, p_own_site_only boolean default false)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
  v_host text := (select research.own_host(b.website) from public.businesses b where b.id = p_business_id);
begin
  insert into public.business_events (business_id, title, starts_at, ends_at, timezone, location_name, source_url)
  select p_business_id, e.title, e.starts_at, coalesce(e.ends_at, e.starts_at + interval '3 hours'),
         e.timezone, e.location_name, e.source_url
  from research.candidate_events e
  where e.candidate_id = p_candidate_id and e.starts_at > now()
    and e.verification = 'verified' and not e.date_only
    and exists (select 1 from pg_catalog.pg_timezone_names z where z.name = e.timezone)
    and (not p_own_site_only or research.is_registration_site(e.source_url)
         or (v_host is not null and research.own_host(e.source_url) = v_host))
  on conflict (business_id, title, starts_at) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

revoke execute on function research.publish_business_events(uuid, uuid, boolean) from public, anon, authenticated;

-- 3 to 6 ------------------------------------------------------------------------
-- As 20261012000005, with the event checks above: times read in the event's
-- zone, bad ends and links repaired, unknown zones and missing verification
-- kept as unverified, and a listed business's new events from its own site
-- or a registration site only.
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
  v_tz text;
  v_start timestamptz;
  v_end timestamptz;
  v_url text;
  v_title text;
  v_ev_verification text;
  v_note text;
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
    v_tz := coalesce(nullif(btrim(v_event ->> 'timezone'), ''), 'America/New_York');
    v_start := research.event_time(v_event ->> 'starts_at', v_tz);
    v_title := left(btrim(v_event ->> 'title'), 120);
    continue when v_start is null or v_start <= now() or char_length(coalesce(v_title, '')) < 3;
    v_end := research.event_time(v_event ->> 'ends_at', v_tz);
    if v_end <= v_start then
      v_end := null;
    end if;
    v_url := btrim(v_event ->> 'source_url');
    if v_url is null or v_url !~ '^https?://[^\s]+$' or char_length(v_url) > 500 then
      v_url := p ->> 'source_url';
    end if;
    v_ev_verification := coalesce(nullif(v_event ->> 'verification', ''), 'unverified');
    v_note := nullif(btrim(v_event ->> 'note'), '');
    if not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_tz) then
      v_ev_verification := case when v_ev_verification = 'failed' then 'failed' else 'unverified' end;
      v_note := left(concat_ws(' ', v_note, 'Unknown time zone: ' || left(v_tz, 60) || '.'), 500);
    end if;
    insert into research.candidate_events (candidate_id, title, starts_at, ends_at, timezone, location_name, source_url, verification, date_only, note)
    values (v_id, v_title, v_start, v_end, left(v_tz, 60),
            left(coalesce(nullif(btrim(v_event ->> 'location_name'), ''), nullif(btrim(p ->> 'area'), ''), 'See the event page'), 200),
            v_url, v_ev_verification,
            coalesce((v_event ->> 'date_only')::boolean, false), v_note)
    on conflict (candidate_id, title, starts_at) do nothing;
  end loop;

  if v_existing.business_id is not null
     and exists (select 1 from public.businesses b where b.id = v_existing.business_id and b.status = 'active') then
    v_events := research.publish_business_events(v_id, v_existing.business_id, true);
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

-- 7 ----------------------------------------------------------------------------
-- As 20261012000008, refusing a failed find.
create or replace function public.list_business_candidate(p_candidate_id uuid, p_region_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c research.candidates;
  v_base text;
  v_slug text;
  v_n integer := 1;
  v_id uuid;
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can list guides, shops, venues and event companies.');
  end if;
  if not exists (select 1 from public.regions r where r.id = p_region_id and r.status = 'live') then
    perform public.raise_rule('region_closed', 'Guides, shops, venues and event companies can only be listed in a live region.');
  end if;

  select * into v_c from research.candidates c
   where c.id = p_candidate_id and c.kind in ('guide', 'business', 'venue', 'company') and c.status = 'kept' and c.verification <> 'failed'
   for update;
  if not found then
    perform public.raise_rule('not_found', 'No kept guide, shop, venue or event company with that id.');
  end if;

  v_base := left(btrim(regexp_replace(lower(v_c.name), '[^a-z0-9]+', '-', 'g'), '-'), 70);
  v_slug := v_base;
  while exists (select 1 from public.businesses b where b.slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.businesses (slug, name, kind, description, subcategory_id, region_id, area, website, affinity_tags, listed_by)
  values (v_slug, v_c.name,
          case v_c.kind when 'guide' then 'guide' when 'venue' then 'venue' when 'company' then 'company' else 'shop' end,
          v_c.description, v_c.subcategory_id, p_region_id, v_c.area, v_c.source_url, v_c.affinity_tags, auth.uid())
  returning id into v_id;

  perform research.publish_business_events(v_c.id, v_id);

  update research.candidates
     set status = 'listed', business_id = v_id, decided_at = now(), decided_by = auth.uid()
   where id = v_c.id;
  return v_slug;
end
$$;

-- 8 ----------------------------------------------------------------------------
-- As 20261012000001, with subcategory_id appended to both halves.
create or replace view public.event_listings
with (security_invoker = true) as
select
  e.id,
  e.group_id,
  g.slug as group_slug,
  g.name as group_name,
  c.slug as category_slug,
  e.title,
  e.starts_at,
  e.ends_at,
  e.timezone,
  e.location_name,
  e.address_visibility,
  e.capacity,
  e.status,
  public.event_going_count(e.id) as going_count,
  e.search,
  g.is_unclaimed,
  e.source_url,
  e.is_paid,
  e.takes_rsvps,
  g.region_id,
  'group'::text as host_kind,
  null::text as business_slug,
  null::text as business_name,
  g.area as host_area,
  null::text as price_text,
  g.subcategory_id
from public.events e
join public.groups g on g.id = e.group_id
join public.subcategories s on s.id = g.subcategory_id
join public.categories c on c.id = s.category_id
where g.status = 'active' and g.review_status = 'approved'
union all
select
  be.id,
  null::uuid,
  null::text,
  null::text,
  c.slug,
  be.title,
  be.starts_at,
  be.ends_at,
  be.timezone,
  be.location_name,
  'public'::public.address_visibility,
  null::integer,
  be.status,
  0,
  be.search,
  b.is_unclaimed,
  be.source_url,
  be.is_paid,
  false,
  b.region_id,
  b.kind,
  b.slug,
  b.name,
  b.area,
  be.price_text,
  b.subcategory_id
from public.business_events be
join public.businesses b on b.id = be.business_id
join public.subcategories s on s.id = b.subcategory_id
join public.categories c on c.id = s.category_id
where b.status = 'active';
