-- UC-37, approved 12 October 2026 (Sarah): events from guides, shops and
-- venues. "Lets make sure we don't miss events just because they are not
-- hosted by a club." Replaces FR-BZ-5 (events through groups only).
--
-- 1. businesses.kind gains 'venue' (nature centers, gyms, city outdoor
--    programs, ski areas that run public programs); a kept research venue
--    becomes a venue listing.
-- 2. business_events: events a guide, shop or venue runs. Readable by
--    everyone while the host is listed; written only by the site admin's
--    functions (and the research path), like the listings themselves.
-- 3. event_listings takes them in, in date order with every other event,
--    with the host's kind, name and slug appended (columns added at the
--    end only). Nothing about them affects order.
-- 4. Research: a listed guide, shop or venue takes new events from the
--    research like an unclaimed group does (FR-RS-8), and listing one
--    publishes its waiting events.
--
-- Tests: supabase/tests/033-business-events.sql (PT-225 to PT-229).

-- ---------------------------------------------------------------------------
-- 1. Venues
-- ---------------------------------------------------------------------------

alter table public.businesses drop constraint businesses_kind_check;
alter table public.businesses add constraint businesses_kind_check check (kind in ('guide', 'shop', 'venue'));

-- ---------------------------------------------------------------------------
-- 2. Events run by a guide, shop or venue
-- ---------------------------------------------------------------------------

create table public.business_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null,
  location_name text not null check (char_length(btrim(location_name)) between 2 and 200),
  price_text text check (char_length(price_text) <= 60),
  is_paid boolean not null default false,
  source_url text not null check (source_url ~ '^https?://[^\s]+$' and char_length(source_url) <= 500),
  status public.event_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  search tsvector generated always as (to_tsvector('english', coalesce(title, ''))) stored,
  check (ends_at > starts_at),
  unique (business_id, title, starts_at)
);

create index business_events_start_idx on public.business_events (starts_at) where status = 'scheduled';
create index business_events_business_idx on public.business_events (business_id, starts_at);

alter table public.business_events enable row level security;

create policy "Events of listed businesses are public" on public.business_events
  for select to anon, authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.status = 'active'));

revoke all on public.business_events from anon, authenticated;
grant select on public.business_events to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. One list of events
-- ---------------------------------------------------------------------------

-- Same as 20261011000001 for group events, with host_kind, business_slug,
-- business_name, host_area and price_text appended; then the events of
-- listed guides, shops and venues. Group columns are null for those.
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
  null::text as price_text
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
  be.price_text
from public.business_events be
join public.businesses b on b.id = be.business_id
join public.subcategories s on s.id = b.subcategory_id
join public.categories c on c.id = s.category_id
where b.status = 'active';

-- ---------------------------------------------------------------------------
-- 4. Research
-- ---------------------------------------------------------------------------

-- Copies a candidate's future events onto a listed guide, shop or venue.
-- Events with no published end last three hours, like group events.
create function research.publish_business_events(p_candidate_id uuid, p_business_id uuid)
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
  on conflict (business_id, title, starts_at) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

revoke execute on function research.publish_business_events(uuid, uuid) from public, anon, authenticated;

-- add_candidate: as 20261011000002, plus: a find that matches a listed
-- guide, shop or venue hands it its new events instead of being dropped.
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
begin
  select s.id into v_subcategory from public.subcategories s where s.slug = p ->> 'subcategory';
  if v_subcategory is null then
    raise exception 'unknown subcategory: %', p ->> 'subcategory';
  end if;

  select * into v_existing from research.candidates c where lower(btrim(c.name)) = lower(v_name);
  select * into v_group from public.groups g
   where lower(g.name) = lower(v_name) or g.id = v_existing.group_id
   order by g.created_at limit 1;

  if v_existing.business_id is not null
     and exists (select 1 from public.businesses b where b.id = v_existing.business_id and b.status = 'active') then
    -- A listed guide, shop or venue: it takes the new events (UC-37).
    v_id := v_existing.id;
  elsif v_group.id is not null and v_group.is_unclaimed and v_group.status = 'active' then
    -- Already an unclaimed listing: it takes the new events (FR-RS-8).
    v_id := v_existing.id;
    if v_id is null then
      insert into research.candidates (kind, name, subcategory_id, area, description, source_url, affinity_tags, out_of_region, status, group_id, decided_at)
      values ('group', v_name, v_subcategory, btrim(p ->> 'area'), btrim(p ->> 'description'), p ->> 'source_url',
              coalesce(array(select jsonb_array_elements_text(p -> 'affinity_tags')), '{}'),
              coalesce((p ->> 'out_of_region')::boolean, false), 'listed', v_group.id, now())
      returning id into v_id;
    end if;
  elsif v_existing.status in ('new', 'kept') then
    -- Still waiting for review: keep its events up to date.
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
                                     possible_duplicate_of, possible_duplicate_url)
    values (p ->> 'kind', v_name, v_subcategory, btrim(p ->> 'area'), btrim(p ->> 'description'), p ->> 'source_url',
            coalesce(array(select jsonb_array_elements_text(p -> 'affinity_tags')), '{}'),
            coalesce((p ->> 'out_of_region')::boolean, false),
            case when p ->> 'kind' = 'group' then 'new' else 'kept' end,
            v_dup_name, v_dup_url)
    returning id into v_id;
  end if;

  for v_event in select * from jsonb_array_elements(coalesce(p -> 'events', '[]'::jsonb)) loop
    if (v_event ->> 'starts_at')::timestamptz > now() then
      insert into research.candidate_events (candidate_id, title, starts_at, ends_at, timezone, location_name, source_url)
      values (v_id, btrim(v_event ->> 'title'), (v_event ->> 'starts_at')::timestamptz,
              nullif(v_event ->> 'ends_at', '')::timestamptz,
              coalesce(nullif(v_event ->> 'timezone', ''), 'America/New_York'),
              btrim(v_event ->> 'location_name'), v_event ->> 'source_url')
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

-- Listing a guide, shop or venue: as 20261011000004, with venues, and its
-- waiting events published.
create or replace function public.list_business_candidate(p_candidate_id uuid, p_region_id uuid)
returns text
language plpgsql security definer set search_path = ''
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
    perform public.raise_rule('not_allowed', 'Only the site admin can list guides, shops and venues.');
  end if;
  if not exists (select 1 from public.regions r where r.id = p_region_id and r.status = 'live') then
    perform public.raise_rule('region_closed', 'Guides, shops and venues can only be listed in a live region.');
  end if;

  select * into v_c from research.candidates c
   where c.id = p_candidate_id and c.kind in ('guide', 'business', 'venue') and c.status = 'kept'
   for update;
  if not found then
    perform public.raise_rule('not_found', 'No kept guide, shop or venue with that id.');
  end if;

  v_base := left(btrim(regexp_replace(lower(v_c.name), '[^a-z0-9]+', '-', 'g'), '-'), 70);
  v_slug := v_base;
  while exists (select 1 from public.businesses b where b.slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.businesses (slug, name, kind, description, subcategory_id, region_id, area, website, affinity_tags, listed_by)
  values (v_slug, v_c.name,
          case v_c.kind when 'guide' then 'guide' when 'venue' then 'venue' else 'shop' end,
          v_c.description, v_c.subcategory_id, p_region_id, v_c.area, v_c.source_url, v_c.affinity_tags, auth.uid())
  returning id into v_id;

  perform research.publish_business_events(v_c.id, v_id);

  update research.candidates
     set status = 'listed', business_id = v_id, decided_at = now(), decided_by = auth.uid()
   where id = v_c.id;
  return v_slug;
end
$$;

-- The kept guides, shops and venues for the site admin, now with venues.
create or replace function public.admin_business_candidates()
returns table (
  id uuid,
  name text,
  kind text,
  subcategory_name text,
  area text,
  description text,
  source_url text,
  affinity_tags text[],
  found_at timestamptz
)
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
    where c.kind in ('guide', 'business', 'venue') and c.status = 'kept'
    order by c.found_at, c.name;
end
$$;

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
   where id = p_candidate_id and kind in ('guide', 'business', 'venue') and status = 'kept';
  if not found then
    perform public.raise_rule('not_found', 'No kept guide, shop or venue with that id.');
  end if;
end
$$;

-- Takes one of a listing's events off the board (cancelled at the source,
-- or wrong).
create function public.remove_business_event(p_event_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can remove these events.');
  end if;
  delete from public.business_events where id = p_event_id;
  if not found then
    perform public.raise_rule('not_found', 'No such event.');
  end if;
end
$$;

revoke execute on function public.remove_business_event(uuid) from public, anon;
grant execute on function public.remove_business_event(uuid) to authenticated;
