-- Regions, approved 11 October 2026: one board, many regions ("go national").
--
-- A region is a named area with one or more hub towns, a center, a radius,
-- a time zone, a status and a place in the list. Every group belongs to
-- exactly one region (groups.region_id, unchanged since the first schema);
-- visitors browse one region at a time. Which region a visitor is looking at
-- is decided in the app (link, then cookie, then their home town, then the
-- default) and never stored in the database.
--
-- 1. regions gains center, radius, state, status, sort order and hub towns;
--    western-nc is filled in and five regions are added.
-- 2. event_listings gains region_id (appended; every other column unchanged).
-- 3. subcategory_region_counts: group counts per region and subcategory.
-- 4. list_candidate(candidate, region): the site admin chooses the region.
-- 5. A group can only be put in a live region (region_closed).
--
-- Tests: supabase/tests/030-regions.sql (PT-210 to PT-219).

-- ---------------------------------------------------------------------------
-- 1. The regions
-- ---------------------------------------------------------------------------

alter table public.regions
  add column center_lat numeric,
  add column center_lng numeric,
  add column radius_miles integer not null default 100 check (radius_miles between 10 and 250),
  add column state text check (state ~ '^[A-Z]{2}$'),
  add column status text not null default 'live' check (status in ('live', 'coming_soon')),
  add column sort_order integer not null default 0,
  add column hub_towns text[] not null default '{}';

update public.regions
   set center_lat = 35.60, center_lng = -82.55, state = 'NC', sort_order = 10, hub_towns = '{Asheville}'
 where slug = 'western-nc';

-- Town names match src/config/towns.ts; a name used in two states carries
-- its state ("Fayetteville, WV").
insert into public.regions (slug, name, timezone, center_lat, center_lng, state, sort_order, hub_towns) values
  ('front-range',     'Colorado Front Range',         'America/Denver',      39.87, -105.13, 'CO', 20, '{Denver,Boulder}'),
  ('triangle',        'Raleigh and the Triangle',     'America/New_York',    35.85,  -78.80, 'NC', 30, '{Raleigh}'),
  ('puget-sound',     'Seattle and Bellingham',       'America/Los_Angeles', 48.18, -122.40, 'WA', 40, '{Seattle,Bellingham}'),
  ('new-river-gorge', 'New River Gorge',              'America/New_York',    38.05,  -81.10, 'WV', 50, '{"Fayetteville, WV"}'),
  ('east-tennessee',  'Knoxville and East Tennessee', 'America/New_York',    35.96,  -83.92, 'TN', 60, '{Knoxville}')
on conflict (slug) do nothing;

-- A clone's own seed may hold other regions; give any of them a center so
-- the columns can be required. 0,0 is obviously wrong and easy to spot.
update public.regions set center_lat = 0 where center_lat is null;
update public.regions set center_lng = 0 where center_lng is null;
alter table public.regions
  alter column center_lat set not null,
  alter column center_lng set not null,
  add constraint regions_center_lat_check check (center_lat between -90 and 90),
  add constraint regions_center_lng_check check (center_lng between -180 and 180);

-- RLS is unchanged: "Directory is public" (read) and no write grant for
-- anon or authenticated (20260925000003). Regions change by migration only.

-- ---------------------------------------------------------------------------
-- 2. event_listings: the event's region, from its group
-- ---------------------------------------------------------------------------

-- Same as 20261010000012 with region_id appended (create or replace view can
-- only add columns at the end).
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
  g.region_id
from public.events e
join public.groups g on g.id = e.group_id
join public.subcategories s on s.id = g.subcategory_id
join public.categories c on c.id = s.category_id
where g.status = 'active' and g.review_status = 'approved';

-- ---------------------------------------------------------------------------
-- 3. Group counts per region (the directory and the region list)
-- ---------------------------------------------------------------------------

-- One row per region and subcategory, zero included, so a page filtering on
-- one region still sees every subcategory. Counted like
-- subcategory_group_counts: active and approved groups only.
create view public.subcategory_region_counts
with (security_invoker = true) as
select
  r.id as region_id,
  r.slug as region_slug,
  c.id as category_id,
  c.slug as category_slug,
  c.name as category_name,
  c.sort_order as category_sort_order,
  s.id as subcategory_id,
  s.slug as subcategory_slug,
  s.name as subcategory_name,
  s.sort_order as subcategory_sort_order,
  (count(g.id) filter (where g.status = 'active' and g.review_status = 'approved'))::integer as group_count
from public.regions r
cross join public.categories c
join public.subcategories s on s.category_id = c.id
left join public.groups g on g.subcategory_id = s.id and g.region_id = r.id
group by r.id, c.id, s.id;

revoke all on public.subcategory_region_counts from anon, authenticated;
grant select on public.subcategory_region_counts to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Listing a candidate in a region the site admin chooses
-- ---------------------------------------------------------------------------

-- Replaces list_candidate(uuid) (20261008000001). With no region it uses
-- the first live region in the list (the default region), which is what
-- the old version did in effect.
drop function public.list_candidate(uuid);

create function public.list_candidate(p_candidate_id uuid, p_region_id uuid default null)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_c research.candidates;
  v_region uuid := p_region_id;
  v_base text;
  v_slug text;
  v_n integer := 1;
  v_group_id uuid;
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can list candidates.');
  end if;

  if v_region is null then
    select r.id into v_region from public.regions r
     where r.status = 'live' order by r.sort_order, r.slug limit 1;
  elsif not exists (select 1 from public.regions r where r.id = v_region and r.status = 'live') then
    perform public.raise_rule('region_closed', 'Groups can only be listed in a live region.');
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
  values (v_slug, v_c.name, v_c.description, v_c.subcategory_id, v_region, v_c.area,
          false, true, v_c.source_url, v_c.affinity_tags)
  returning id into v_group_id;

  perform research.publish_candidate_events(v_c.id, v_group_id);

  update research.candidates
     set status = 'listed', group_id = v_group_id, decided_at = now(), decided_by = auth.uid()
   where id = v_c.id;
  return v_slug;
end
$$;

revoke execute on function public.list_candidate(uuid, uuid) from public, anon;
grant execute on function public.list_candidate(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Groups go only in live regions
-- ---------------------------------------------------------------------------

-- Owners and page admins may already change region_id (the column grant and
-- the "Owner and admins edit active groups" policy). This stops anyone,
-- the site admin included, putting a group in a region that is coming soon
-- or doesn't take groups. A group already in a region that later closes
-- keeps it; only a change of region is checked.
--
-- Not SECURITY DEFINER: regions are public, and raise_rule() isn't callable
-- by authenticated, so it raises the same P0001 'code: message' directly.
create function public.groups_region_live()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.region_id is not distinct from old.region_id then
    return new;
  end if;
  if not exists (select 1 from public.regions r where r.id = new.region_id and r.status = 'live') then
    raise exception using errcode = 'P0001', message = 'region_closed: Groups can only be in a live region.';
  end if;
  return new;
end
$$;

revoke execute on function public.groups_region_live() from public, anon, authenticated;

create trigger groups_region_live before insert or update of region_id on public.groups
  for each row execute function public.groups_region_live();
