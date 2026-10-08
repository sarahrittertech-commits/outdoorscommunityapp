-- Research candidates and affinity tags (UC-9; FR-RS-1 to FR-RS-9, FR-GR-11).
--
-- A weekly research session finds groups, events, guides, businesses and
-- venues on the public web and saves them here as candidates, through one
-- validating function. The site admin lists or skips each group candidate
-- from the admin page; a listed one becomes an unclaimed listing
-- (FR-GR-9). Nothing reaches the board without that step, except new
-- events for a group that was already listed and is still unclaimed
-- (FR-RS-8).
--
-- There is deliberately no column for contact details anywhere here.

-- ---------------------------------------------------------------------------
-- 1. Affinity tags on groups (FR-GR-11)
-- ---------------------------------------------------------------------------

alter table public.groups
  add column affinity_tags text[] not null default '{}'
    check (affinity_tags <@ array['women', 'youth', 'bipoc', 'lgbtqia']::text[]);

-- Owners and admins change them like any other group detail.
grant update (affinity_tags) on public.groups to authenticated;

create or replace view public.group_listings
with (security_invoker = true) as
select
  g.id,
  g.slug,
  g.name,
  g.description,
  g.area,
  g.join_policy,
  g.status,
  g.region_id,
  g.created_at,
  s.id as subcategory_id,
  s.slug as subcategory_slug,
  s.name as subcategory_name,
  c.id as category_id,
  c.slug as category_slug,
  c.name as category_name,
  public.group_member_count(g.id) as member_count,
  (
    select min(e.starts_at) from public.events e
    where e.group_id = g.id and e.status = 'scheduled' and e.starts_at > now()
  ) as next_event_at,
  g.search,
  g.is_unclaimed,
  g.source_url,
  g.affinity_tags
from public.groups g
join public.subcategories s on s.id = g.subcategory_id
join public.categories c on c.id = s.category_id;

-- ---------------------------------------------------------------------------
-- 2. Listings made by the site admin
--
-- Listings could only come from operator SQL, because the triggers below
-- clear the listing flag and source links for any signed-in user. Listing
-- a candidate is the one exception: list_candidate() sets a setting for its
-- own transaction that the triggers honour. Settings like this can only be
-- set by running SQL, which the API does not allow, and no other function
-- sets it.
-- ---------------------------------------------------------------------------

create or replace function public.groups_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.status := 'active';
  new.cover_image_path := null;

  if auth.uid() is not null
     and coalesce(current_setting('branch.operator_listing', true), '') <> 'on' then
    new.is_unclaimed := false;
    new.source_url := null;
  end if;

  if auth.uid() is not null and not public.is_site_admin() then
    if (select count(*) from public.group_members m
          join public.groups g on g.id = m.group_id
        where m.user_id = auth.uid() and m.role = 'owner'
          and g.status in ('active', 'archived')) >= 3 then
      perform public.raise_rule('group_limit', 'You can own at most 3 groups.');
    end if;
    if (select count(*) from public.groups g
        where g.created_by = auth.uid() and g.created_at > now() - interval '7 days') >= 3 then
      perform public.raise_rule('rate_limited', 'You can create at most 3 groups a week.');
    end if;
  end if;
  return new;
end
$$;

create or replace function public.events_source_url_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('branch.operator_listing', true), '') <> 'on' then
    new.source_url := case when tg_op = 'UPDATE' then old.source_url end;
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Candidates (private, like the rest of the research schema)
-- ---------------------------------------------------------------------------

create table research.candidates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('group', 'guide', 'business', 'venue')),
  name text not null check (char_length(btrim(name)) between 3 and 80),
  subcategory_id uuid not null references public.subcategories (id),
  area text not null check (char_length(btrim(area)) between 2 and 80),
  description text not null check (char_length(btrim(description)) between 10 and 300),
  source_url text not null check (source_url ~ '^https?://[^\s]+$' and char_length(source_url) <= 500),
  affinity_tags text[] not null default '{}'
    check (affinity_tags <@ array['women', 'youth', 'bipoc', 'lgbtqia']::text[]),
  out_of_region boolean not null default false,
  status text not null default 'new' check (status in ('new', 'listed', 'skipped', 'kept')),
  group_id uuid references public.groups (id) on delete set null,
  found_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null
);

create unique index candidates_name_key on research.candidates (lower(btrim(name)));

create table research.candidate_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references research.candidates (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'America/New_York',
  location_name text not null check (char_length(btrim(location_name)) between 2 and 200),
  source_url text not null check (source_url ~ '^https?://[^\s]+$' and char_length(source_url) <= 500),
  found_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  unique (candidate_id, title, starts_at)
);

alter table research.candidates enable row level security;
alter table research.candidate_events enable row level security;
revoke all on research.candidates, research.candidate_events from public, anon, authenticated;

-- Copies a candidate's future events onto a board group (FR-RS-4, FR-RS-8).
-- Events with no published end last three hours and say so.
create or replace function research.publish_candidate_events(p_candidate_id uuid, p_group_id uuid)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
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
    and not exists (
      select 1 from public.events x
      where x.group_id = p_group_id and x.title = e.title and x.starts_at = e.starts_at
    );
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

-- The research agent's one way in (FR-RS-2, FR-RS-3, FR-RS-9). Takes one
-- find as JSON:
--   { "kind", "name", "subcategory" (slug), "area", "description",
--     "source_url", "affinity_tags": [], "out_of_region": bool,
--     "events": [ { "title", "starts_at", "ends_at", "timezone",
--                   "location_name", "source_url" } ] }
-- Returns what happened: added, updated (new events for a candidate still
-- waiting for review), events_added (to an unclaimed listing) or duplicate.
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
begin
  select s.id into v_subcategory from public.subcategories s where s.slug = p ->> 'subcategory';
  if v_subcategory is null then
    raise exception 'unknown subcategory: %', p ->> 'subcategory';
  end if;

  select * into v_existing from research.candidates c where lower(btrim(c.name)) = lower(v_name);
  select * into v_group from public.groups g
   where lower(g.name) = lower(v_name) or g.id = v_existing.group_id
   order by g.created_at limit 1;

  if v_group.id is not null and v_group.is_unclaimed and v_group.status = 'active' then
    -- Already an unclaimed listing: it takes the new events (FR-RS-8).
    v_id := v_existing.id;
    if v_id is null then
      -- An imported listing with no candidate row: record one, already listed.
      insert into research.candidates (kind, name, subcategory_id, area, description, source_url, affinity_tags, out_of_region, status, group_id, decided_at)
      values ('group', v_name, v_subcategory, btrim(p ->> 'area'), btrim(p ->> 'description'), p ->> 'source_url',
              coalesce(array(select jsonb_array_elements_text(p -> 'affinity_tags')), '{}'),
              coalesce((p ->> 'out_of_region')::boolean, false), 'listed', v_group.id, now())
      returning id into v_id;
    end if;
  elsif v_existing.status = 'new' then
    -- Still waiting for review: keep its events up to date.
    v_id := v_existing.id;
  elsif v_existing.id is not null or v_group.id is not null
     or exists (select 1 from research.organizations o where lower(btrim(o.name)) = lower(v_name)) then
    -- Skipped, kept, claimed, or already in the research: never suggested again.
    return jsonb_build_object('result', 'duplicate');
  else
    insert into research.candidates (kind, name, subcategory_id, area, description, source_url, affinity_tags, out_of_region, status)
    values (p ->> 'kind', v_name, v_subcategory, btrim(p ->> 'area'), btrim(p ->> 'description'), p ->> 'source_url',
            coalesce(array(select jsonb_array_elements_text(p -> 'affinity_tags')), '{}'),
            coalesce((p ->> 'out_of_region')::boolean, false),
            case when p ->> 'kind' = 'group' then 'new' else 'kept' end)
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

  if v_group.id is not null and v_group.is_unclaimed and v_group.status = 'active' then
    v_events := research.publish_candidate_events(v_id, v_group.id);
    return jsonb_build_object('result', 'events_added', 'events', v_events);
  end if;
  return jsonb_build_object('result', case when v_existing.id is not null then 'updated' else 'added' end, 'id', v_id);
end
$$;

revoke execute on function research.add_candidate(jsonb), research.publish_candidate_events(uuid, uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. The site admin's review (FR-RS-5, FR-RS-6)
-- ---------------------------------------------------------------------------

create or replace function public.admin_candidates()
returns table (
  id uuid,
  name text,
  subcategory_name text,
  area text,
  description text,
  source_url text,
  affinity_tags text[],
  out_of_region boolean,
  upcoming_events integer,
  found_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can see candidates.');
  end if;
  return query
    select c.id, c.name, s.name, c.area, c.description, c.source_url, c.affinity_tags, c.out_of_region,
           (select count(*)::integer from research.candidate_events e
             where e.candidate_id = c.id and e.starts_at > now()),
           c.found_at
    from research.candidates c
    join public.subcategories s on s.id = c.subcategory_id
    where c.kind = 'group' and c.status = 'new'
    order by c.found_at, c.name;
end
$$;

create or replace function public.admin_candidate_counts()
returns table (kind text, kept integer)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can see candidates.');
  end if;
  return query
    select c.kind, count(*)::integer from research.candidates c
    where c.status = 'kept' group by c.kind order by c.kind;
end
$$;

-- List it: the candidate becomes an unclaimed listing with its events.
create or replace function public.list_candidate(p_candidate_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_c research.candidates;
  v_base text;
  v_slug text;
  v_n integer := 1;
  v_group_id uuid;
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can list candidates.');
  end if;

  select * into v_c from research.candidates c
   where c.id = p_candidate_id and c.kind = 'group' and c.status = 'new'
   for update;
  if not found then
    perform public.raise_rule('not_found', 'No new group candidate with that id.');
  end if;

  v_base := left(btrim(regexp_replace(lower(v_c.name), '[^a-z0-9]+', '-', 'g'), '-'), 70);
  v_slug := v_base;
  while exists (select 1 from public.groups g where g.slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  perform set_config('branch.operator_listing', 'on', true);
  insert into public.groups (slug, name, description, subcategory_id, region_id, area,
                             discussions_enabled, is_unclaimed, source_url, affinity_tags)
  values (v_slug, v_c.name, v_c.description, v_c.subcategory_id,
          (select r.id from public.regions r order by r.slug limit 1), v_c.area,
          false, true, v_c.source_url, v_c.affinity_tags)
  returning id into v_group_id;

  perform research.publish_candidate_events(v_c.id, v_group_id);

  update research.candidates
     set status = 'listed', group_id = v_group_id, decided_at = now(), decided_by = auth.uid()
   where id = v_c.id;
  return v_slug;
end
$$;

create or replace function public.skip_candidate(p_candidate_id uuid)
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
   where id = p_candidate_id and status = 'new';
  if not found then
    perform public.raise_rule('not_found', 'No new candidate with that id.');
  end if;
end
$$;

revoke execute on function public.admin_candidates(), public.admin_candidate_counts(),
  public.list_candidate(uuid), public.skip_candidate(uuid) from public, anon;
grant execute on function public.admin_candidates(), public.admin_candidate_counts(),
  public.list_candidate(uuid), public.skip_candidate(uuid) to authenticated;
