-- UC-39, event sources and the weekly reader (approved 12 October 2026;
-- built the same evening at Sarah's go). FR-ES-1, FR-ES-2, FR-ES-3, FR-ES-4,
-- FR-ES-5, FR-ES-9, FR-ES-10.
--
-- Until now research found each event once and forgot where it came from,
-- so every refresh meant searching the web again. A source is a public page
-- where a listed host posts dates; the weekly reader
-- (scripts/research/sources/) reads each one, and this file decides what
-- reaches the board, by the same rules as the rest of the research:
--
-- 1. research.event_sources: one row per host and page. Private to the site
--    admin (FR-ES-1). Seeded with every listed host's website and the
--    events pages research already recorded.
-- 2. research.source_events: everything a read found, published or not,
--    with the reason (FR-RS-13, keep every find).
-- 3. research.event_changes: every change the reader made to an event on
--    the board, with old and new values (FR-ES-5).
-- 4. research.sources_to_read() and research.record_source_read(): the two
--    calls the reader makes through the research intake. A read publishes
--    new events, moves an event whose date, time or place changed, and
--    marks one the page calls cancelled; it never touches events an
--    organizer posted, or any event of a claimed group (FR-ES-10). Sources
--    with nothing for twelve weeks become quiet; three failed reads in a row
--    make one broken (FR-ES-9).
-- 5. Site admin: coverage per region (FR-ES-2), the sources, the change
--    log, adding a source and retiring one.
--
-- Tests: supabase/tests/039-event-sources.sql (PT-243 to PT-252).

-- ---------------------------------------------------------------------------
-- 1. Sources
-- ---------------------------------------------------------------------------

create table research.event_sources (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  url text not null check (url ~ '^https?://[^\s]+$' and char_length(url) <= 500),
  kind text not null check (kind in ('own_page', 'calendar_feed', 'signup_page', 'meetup', 'program_calendar')),
  status text not null default 'active' check (status in ('active', 'quiet', 'broken', 'retired')),
  added_by text not null default 'research' check (added_by in ('research', 'reader', 'admin')),
  last_read_at timestamptz,
  last_result text check (char_length(last_result) <= 300),
  last_event_at timestamptz,
  events_given integer not null default 0,
  failures integer not null default 0,
  created_at timestamptz not null default now(),
  check ((group_id is null) <> (business_id is null)),
  unique nulls not distinct (group_id, business_id, url)
);

create index event_sources_group_idx on research.event_sources (group_id);
create index event_sources_business_idx on research.event_sources (business_id);

-- ---------------------------------------------------------------------------
-- 2. What each read found
-- ---------------------------------------------------------------------------

create table research.source_events (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references research.event_sources (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null,
  location_name text not null check (char_length(location_name) <= 200),
  source_url text not null,
  status text not null check (status in ('published', 'updated', 'cancelled', 'on_board', 'kept')),
  reason text check (char_length(reason) <= 300),
  read_at timestamptz not null default now(),
  unique (source_id, title, starts_at)
);

-- ---------------------------------------------------------------------------
-- 3. Change log
-- ---------------------------------------------------------------------------

create table research.event_changes (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references research.event_sources (id) on delete set null,
  event_id uuid references public.events (id) on delete cascade,
  business_event_id uuid references public.business_events (id) on delete cascade,
  title text not null,
  what text not null check (what in ('time', 'place', 'cancelled')),
  old_value text,
  new_value text,
  changed_at timestamptz not null default now(),
  check ((event_id is null) <> (business_event_id is null))
);

create index event_changes_changed_idx on research.event_changes (changed_at desc);

alter table research.event_sources enable row level security;
alter table research.source_events enable row level security;
alter table research.event_changes enable row level security;
revoke all on research.event_sources, research.source_events, research.event_changes from public, anon, authenticated;

-- Seed: every listed host's website, and the events pages research recorded
-- ("events page https://…" in a find's evidence). A Meetup group's page is
-- read at its events list.
insert into research.event_sources (group_id, url, kind)
select g.id,
       case when g.source_url ~* '^https?://(www\.)?meetup\.com/[^/]+/?$' then rtrim(g.source_url, '/') || '/events/' else g.source_url end,
       case when g.source_url ~* 'meetup\.com' then 'meetup' else 'own_page' end
from public.groups g
where g.status = 'active' and g.review_status = 'approved' and g.source_url ~ '^https?://[^\s]+$' and char_length(g.source_url) <= 480
on conflict do nothing;

insert into research.event_sources (business_id, url, kind)
select b.id, b.website, 'own_page'
from public.businesses b
where b.status = 'active' and b.website ~ '^https?://[^\s]+$'
on conflict do nothing;

insert into research.event_sources (group_id, business_id, url, kind)
select c.group_id, case when c.group_id is null then c.business_id end, p.url,
       case when p.url ~* 'meetup\.com' then 'meetup' else 'own_page' end
from research.candidates c
cross join lateral (select substring(c.evidence from 'events page (https?://[^\s;,]+)') as url) p
where c.status = 'listed' and (c.group_id is not null or c.business_id is not null)
  and p.url is not null and char_length(p.url) <= 500
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4. The reader's two calls
-- ---------------------------------------------------------------------------

-- Sources to read this week: active and quiet ones whose host is listed and,
-- for a group, still unclaimed (FR-ES-10). Broken and retired ones wait for
-- the site admin.
create or replace function research.sources_to_read(p_only_unstructured boolean default false)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'url', s.url, 'kind', s.kind, 'status', s.status, 'last_result', s.last_result,
           'host', coalesce(g.name, b.name), 'host_kind', case when g.id is not null then 'group' else 'business' end,
           'host_site', coalesce(g.source_url, b.website),
           'region', r.slug, 'timezone', r.timezone)
         order by s.last_read_at nulls first, s.created_at), '[]'::jsonb)
  from research.event_sources s
  left join public.groups g on g.id = s.group_id
  left join public.businesses b on b.id = s.business_id
  join public.regions r on r.id = coalesce(g.region_id, b.region_id)
  where s.status in ('active', 'quiet')
    and (g.id is null or (g.status = 'active' and g.review_status = 'approved' and g.is_unclaimed))
    and (b.id is null or b.status = 'active')
    and (not p_only_unstructured or s.last_result like 'no structured dates%')
$$;

revoke execute on function research.sources_to_read(boolean) from public, anon, authenticated;

-- Whether an event's link belongs to its host: on the host's own website,
-- on the page the source is (a Meetup group, a program calendar the site
-- admin added), or on a sign-up site.
create or replace function research.from_host(p_event_url text, p_source_url text, p_host_site text)
returns boolean
language sql immutable set search_path = ''
as $$
  select coalesce(
    (research.own_host(p_event_url) is not null and research.own_host(p_event_url) in (research.own_host(p_host_site), research.own_host(p_source_url)))
    or research.is_registration_site(p_event_url)
    or lower(p_event_url) like lower(regexp_replace(p_source_url, '/?(events/?)?([?#].*)?$', '')) || '%',
    false)
$$;

revoke execute on function research.from_host(text, text, text) from public, anon, authenticated;

-- One read of one source. p: {source_id, ok, result, events: [...],
-- discovered: [{url, kind}]}. Each event: title, starts_at (with offset),
-- ends_at, timezone, location_name, source_url, verification, date_only,
-- cancelled, far (the reader's reason for an event outside the region).
create or replace function research.record_source_read(p jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_source research.event_sources;
  v_group public.groups;
  v_business public.businesses;
  v_site text;
  v_region_tz text;
  v_event jsonb;
  v_tz text;
  v_start timestamptz;
  v_end timestamptz;
  v_title text;
  v_url text;
  v_place text;
  v_reason text;
  v_status text;
  v_match uuid;
  v_matches integer;
  v_same_in_read integer;
  v_old_start timestamptz;
  v_old_place text;
  v_timed integer := 0;
  v_counts jsonb := jsonb_build_object('published', 0, 'updated', 0, 'cancelled', 0, 'on_board', 0, 'kept', 0);
  v_new_ids uuid[] := '{}';
  v_d jsonb;
  v_id uuid;
begin
  select * into v_source from research.event_sources s where s.id = (p ->> 'source_id')::uuid for update;
  if v_source.id is null or v_source.status = 'retired' then
    return jsonb_build_object('result', 'unknown_source');
  end if;

  update research.event_sources
     set last_read_at = now(), last_result = left(nullif(btrim(p ->> 'result'), ''), 300)
   where id = v_source.id;

  if not coalesce((p ->> 'ok')::boolean, false) then
    update research.event_sources
       set failures = failures + 1,
           status = case when failures + 1 >= 3 then 'broken' else status end
     where id = v_source.id;
    return jsonb_build_object('result', 'failed_read');
  end if;

  select * into v_group from public.groups g where g.id = v_source.group_id;
  select * into v_business from public.businesses b where b.id = v_source.business_id;
  v_site := coalesce(v_group.source_url, v_business.website);
  select r.timezone into v_region_tz from public.regions r where r.id = coalesce(v_group.region_id, v_business.region_id);

  perform set_config('branch.operator_listing', 'on', true);

  for v_event in select * from jsonb_array_elements(coalesce(p -> 'events', '[]'::jsonb)) limit 50 loop
    v_tz := coalesce(nullif(btrim(v_event ->> 'timezone'), ''), v_region_tz, 'America/New_York');
    v_start := research.event_time(v_event ->> 'starts_at', v_tz);
    v_title := left(btrim(v_event ->> 'title'), 120);
    continue when v_start is null or v_start <= now() or char_length(coalesce(v_title, '')) < 3;
    v_end := research.event_time(v_event ->> 'ends_at', v_tz);
    if v_end <= v_start then
      v_end := null;
    end if;
    v_url := btrim(v_event ->> 'source_url');
    if v_url is null or v_url !~ '^https?://[^\s]+$' or char_length(v_url) > 500 then
      v_url := v_source.url;
    end if;
    v_place := left(coalesce(nullif(btrim(v_event ->> 'location_name'), ''), 'See the event page'), 200);
    if char_length(v_place) < 2 then
      v_place := 'See the event page';
    end if;

    -- FR-ES-4: the same conditions as every other research event.
    v_reason := case
      when coalesce((v_event ->> 'date_only')::boolean, false) then 'No start time posted'
      when coalesce(v_event ->> 'verification', 'unverified') <> 'verified' then 'Not verified'
      when not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_tz) then 'Unknown time zone'
      when nullif(btrim(v_event ->> 'far'), '') is not null then left(btrim(v_event ->> 'far'), 200)
      when not research.from_host(v_url, v_source.url, v_site) then 'Not on the host''s own pages or a sign-up site'
      when v_group.id is not null and not (v_group.status = 'active' and v_group.review_status = 'approved') then 'Group not listed'
      when v_group.id is not null and not v_group.is_unclaimed then 'Claimed group: its organizers post its events'
      when v_business.id is not null and v_business.status <> 'active' then 'Listing removed'
    end;
    if v_reason is null then
      v_timed := v_timed + 1;
    end if;

    v_status := 'kept';
    if v_reason is null then
      -- The same event already on the board, or one whose date, time or
      -- place moved: same host, same title and same link, exactly once on
      -- each side (weekly runs share a title and a page, so those are never
      -- treated as moves). Organizer-posted events are never touched.
      select count(*) into v_same_in_read
        from jsonb_array_elements(p -> 'events') x
       where lower(btrim(x ->> 'title')) = lower(v_title)
         and coalesce(nullif(btrim(x ->> 'source_url'), ''), v_source.url) = v_url;
      if v_group.id is not null then
        select count(*), min(e.id::text)::uuid into v_matches, v_match
          from public.events e
         where e.group_id = v_group.id and e.created_by is null and e.status = 'scheduled' and e.starts_at > now()
           and lower(e.title) = lower(v_title) and e.source_url = v_url;
        if exists (select 1 from public.events e where e.group_id = v_group.id and lower(e.title) = lower(v_title) and e.starts_at = v_start) then
          v_status := 'on_board';
          select e.id, e.location_name into v_match, v_old_place from public.events e
           where e.group_id = v_group.id and e.created_by is null and lower(e.title) = lower(v_title) and e.starts_at = v_start and e.status = 'scheduled'
           limit 1;
          if v_match is not null and coalesce((v_event ->> 'cancelled')::boolean, false) then
            update public.events set status = 'cancelled' where id = v_match;
            insert into research.event_changes (source_id, event_id, title, what, old_value, new_value)
            values (v_source.id, v_match, v_title, 'cancelled', 'scheduled', 'cancelled');
            v_status := 'cancelled';
          elsif v_match is not null and v_place <> 'See the event page' and v_old_place <> v_place then
            update public.events set location_name = v_place where id = v_match;
            insert into research.event_changes (source_id, event_id, title, what, old_value, new_value)
            values (v_source.id, v_match, v_title, 'place', v_old_place, v_place);
            v_status := 'updated';
          end if;
        elsif coalesce((v_event ->> 'cancelled')::boolean, false) then
          v_reason := 'Cancelled on the page';
        elsif v_matches = 1 and v_same_in_read = 1 then
          select e.starts_at into v_old_start from public.events e where e.id = v_match;
          update public.events
             set starts_at = v_start, ends_at = coalesce(v_end, v_start + interval '3 hours'), timezone = v_tz
           where id = v_match;
          insert into research.event_changes (source_id, event_id, title, what, old_value, new_value)
          values (v_source.id, v_match, v_title, 'time', v_old_start::text, v_start::text);
          v_status := 'updated';
        else
          insert into public.events (group_id, title, description, starts_at, ends_at, timezone, location_name, address_visibility, source_url)
          values (v_group.id, v_title,
                  'Listed from the organizer''s public event page. Check there for details and how to sign up.'
                    || case when v_end is null then ' End time not listed.' else '' end,
                  v_start, coalesce(v_end, v_start + interval '3 hours'), v_tz, v_place, 'public', v_url);
          v_status := 'published';
        end if;
      else
        select count(*), min(e.id::text)::uuid into v_matches, v_match
          from public.business_events e
         where e.business_id = v_business.id and e.status = 'scheduled' and e.starts_at > now()
           and lower(e.title) = lower(v_title) and e.source_url = v_url;
        if exists (select 1 from public.business_events e where e.business_id = v_business.id and lower(e.title) = lower(v_title) and e.starts_at = v_start) then
          v_status := 'on_board';
          select e.id, e.location_name into v_match, v_old_place from public.business_events e
           where e.business_id = v_business.id and lower(e.title) = lower(v_title) and e.starts_at = v_start and e.status = 'scheduled'
           limit 1;
          if v_match is not null and coalesce((v_event ->> 'cancelled')::boolean, false) then
            update public.business_events set status = 'cancelled' where id = v_match;
            insert into research.event_changes (source_id, business_event_id, title, what, old_value, new_value)
            values (v_source.id, v_match, v_title, 'cancelled', 'scheduled', 'cancelled');
            v_status := 'cancelled';
          elsif v_match is not null and v_place <> 'See the event page' and v_old_place <> v_place then
            update public.business_events set location_name = v_place where id = v_match;
            insert into research.event_changes (source_id, business_event_id, title, what, old_value, new_value)
            values (v_source.id, v_match, v_title, 'place', v_old_place, v_place);
            v_status := 'updated';
          end if;
        elsif coalesce((v_event ->> 'cancelled')::boolean, false) then
          v_reason := 'Cancelled on the page';
        elsif v_matches = 1 and v_same_in_read = 1 then
          select e.starts_at into v_old_start from public.business_events e where e.id = v_match;
          update public.business_events
             set starts_at = v_start, ends_at = coalesce(v_end, v_start + interval '3 hours'), timezone = v_tz
           where id = v_match;
          insert into research.event_changes (source_id, business_event_id, title, what, old_value, new_value)
          values (v_source.id, v_match, v_title, 'time', v_old_start::text, v_start::text);
          v_status := 'updated';
        else
          insert into public.business_events (business_id, title, starts_at, ends_at, timezone, location_name, source_url)
          values (v_business.id, v_title, v_start, coalesce(v_end, v_start + interval '3 hours'), v_tz, v_place, v_url)
          on conflict (business_id, title, starts_at) do nothing;
          v_status := 'published';
        end if;
      end if;
    end if;

    v_counts := jsonb_set(v_counts, array[v_status], to_jsonb((v_counts ->> v_status)::integer + 1));
    insert into research.source_events (source_id, title, starts_at, ends_at, timezone, location_name, source_url, status, reason)
    values (v_source.id, v_title, v_start, v_end, left(v_tz, 60), v_place, v_url, v_status, v_reason)
    on conflict (source_id, title, starts_at) do update
      set status = excluded.status, reason = excluded.reason, ends_at = excluded.ends_at,
          location_name = excluded.location_name, read_at = now();
  end loop;

  -- Pages the reader noticed on this source (an events page linked from a
  -- homepage, the host's Meetup group): new sources, read next.
  for v_d in select * from jsonb_array_elements(coalesce(p -> 'discovered', '[]'::jsonb)) limit 5 loop
    continue when coalesce(v_d ->> 'url', '') !~ '^https?://[^\s]+$' or char_length(v_d ->> 'url') > 500
      or coalesce(v_d ->> 'kind', '') not in ('own_page', 'calendar_feed', 'signup_page', 'meetup', 'program_calendar');
    insert into research.event_sources (group_id, business_id, url, kind, added_by)
    values (v_source.group_id, v_source.business_id, v_d ->> 'url', v_d ->> 'kind', 'reader')
    on conflict do nothing
    returning id into v_id;
    if v_id is not null then
      v_new_ids := v_new_ids || v_id;
    end if;
  end loop;

  update research.event_sources s
     set failures = 0,
         events_given = s.events_given + (v_counts ->> 'published')::integer,
         last_event_at = case when v_timed > 0 then now() else s.last_event_at end,
         status = case
           when v_timed > 0 then 'active'
           when coalesce(s.last_event_at, s.created_at) < now() - interval '12 weeks' then 'quiet'
           else s.status end
   where s.id = v_source.id;

  return v_counts || jsonb_build_object('result', 'read', 'new_sources', to_jsonb(v_new_ids));
end
$$;

revoke execute on function research.record_source_read(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Site admin
-- ---------------------------------------------------------------------------

-- FR-ES-2: coverage per live region, counted by the database.
create or replace function public.admin_source_coverage()
returns table (region_id uuid, region_slug text, region_name text, hosts integer, hosts_with_source integer,
               sources_read_this_week integer, needs_attention integer, events_by_organizers integer, events_by_research integer)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (select public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only the site admin can see event sources.');
  end if;
  return query
    with hosts as (
      select g.id, g.region_id, 'group'::text as k from public.groups g where g.status = 'active' and g.review_status = 'approved'
      union all
      select b.id, b.region_id, 'business' from public.businesses b where b.status = 'active'
    ), src as (
      select s.*, coalesce(g.region_id, b.region_id) as region_id
      from research.event_sources s
      left join public.groups g on g.id = s.group_id
      left join public.businesses b on b.id = s.business_id
    )
    select r.id, r.slug, r.name,
      (select count(*)::integer from hosts h where h.region_id = r.id),
      (select count(distinct coalesce(s.group_id, s.business_id))::integer from src s where s.region_id = r.id and s.status = 'active'),
      (select count(*)::integer from src s where s.region_id = r.id and s.last_read_at > now() - interval '7 days'),
      (select count(*)::integer from src s where s.region_id = r.id and s.status in ('quiet', 'broken')),
      (select count(*)::integer from public.events e join public.groups g on g.id = e.group_id
        where g.region_id = r.id and e.status = 'scheduled' and e.starts_at > now() and e.created_by is not null),
      (select count(*)::integer from public.events e join public.groups g on g.id = e.group_id
        where g.region_id = r.id and e.status = 'scheduled' and e.starts_at > now() and e.created_by is null)
      + (select count(*)::integer from public.business_events e join public.businesses b on b.id = e.business_id
        where b.region_id = r.id and e.status = 'scheduled' and e.starts_at > now())
    from public.regions r
    where r.status = 'live'
    order by r.sort_order, r.name;
end
$$;

-- The sources of one region, or every source that needs the admin
-- (quiet or broken) when p_region_id is null.
create or replace function public.admin_event_sources(p_region_id uuid)
returns table (id uuid, host_name text, host_kind text, host_slug text, url text, kind text, status text, added_by text,
               last_read_at timestamptz, last_result text, events_given integer, last_event_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (select public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only the site admin can see event sources.');
  end if;
  return query
    select s.id, coalesce(g.name, b.name), case when g.id is not null then 'group' else 'business' end,
           coalesce(g.slug, b.slug), s.url, s.kind, s.status, s.added_by, s.last_read_at, s.last_result, s.events_given, s.last_event_at
    from research.event_sources s
    left join public.groups g on g.id = s.group_id
    left join public.businesses b on b.id = s.business_id
    where (p_region_id is null and s.status in ('quiet', 'broken'))
       or (p_region_id is not null and coalesce(g.region_id, b.region_id) = p_region_id and s.status <> 'retired')
    order by coalesce(g.name, b.name), s.url;
end
$$;

-- FR-ES-5: what the reader changed, newest first.
create or replace function public.admin_event_changes(p_limit integer default 50)
returns table (changed_at timestamptz, title text, what text, old_value text, new_value text, host_name text, source_url text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (select public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only the site admin can see the change log.');
  end if;
  return query
    select c.changed_at, c.title, c.what, c.old_value, c.new_value, coalesce(g.name, b.name), s.url
    from research.event_changes c
    left join research.event_sources s on s.id = c.source_id
    left join public.groups g on g.id = s.group_id
    left join public.businesses b on b.id = s.business_id
    order by c.changed_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200);
end
$$;

-- UC-39 step 4: the site admin adds a page where a host posts dates.
create or replace function public.add_event_source(p_host_kind text, p_host_slug text, p_url text, p_kind text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_group uuid;
  v_business uuid;
  v_id uuid;
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can add event sources.');
  end if;
  if p_url !~ '^https?://[^\s]+$' or char_length(p_url) > 500 then
    perform public.raise_rule('invalid_url', 'A source is a web address starting with http:// or https://.');
  end if;
  if p_kind not in ('own_page', 'calendar_feed', 'signup_page', 'meetup', 'program_calendar') then
    perform public.raise_rule('invalid_kind', 'Unknown kind of source.');
  end if;
  if p_host_kind = 'group' then
    select g.id into v_group from public.groups g where g.slug = p_host_slug and g.status = 'active';
  elsif p_host_kind = 'business' then
    select b.id into v_business from public.businesses b where b.slug = p_host_slug and b.status = 'active';
  end if;
  if v_group is null and v_business is null then
    perform public.raise_rule('not_found', 'No listed group or business with that address.');
  end if;
  insert into research.event_sources (group_id, business_id, url, kind, added_by)
  values (v_group, v_business, p_url, p_kind, 'admin')
  on conflict (group_id, business_id, url) do update set status = 'active', failures = 0, kind = excluded.kind
  returning id into v_id;
  return v_id;
end
$$;

-- FR-ES-9: the site admin retires a source, or puts a quiet or broken one
-- back to active after fixing nothing more than the page itself.
create or replace function public.set_event_source_status(p_source_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can change event sources.');
  end if;
  if p_status not in ('active', 'retired') then
    perform public.raise_rule('invalid_status', 'A source can be made active or retired.');
  end if;
  update research.event_sources set status = p_status, failures = 0 where id = p_source_id;
  if not found then
    perform public.raise_rule('not_found', 'No source with that id.');
  end if;
end
$$;

revoke execute on function public.admin_source_coverage(), public.admin_event_sources(uuid), public.admin_event_changes(integer),
  public.add_event_source(text, text, text, text), public.set_event_source_status(uuid, text) from public, anon;
grant execute on function public.admin_source_coverage(), public.admin_event_sources(uuid), public.admin_event_changes(integer),
  public.add_event_source(text, text, text, text), public.set_event_source_status(uuid, text) to authenticated;
