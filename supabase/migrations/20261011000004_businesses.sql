-- Guides and shops, first part of UC-12 (Sarah's go, 11 October 2026:
-- "go ahead and add guide services and gear stores now").
--
-- The site admin lists guide services and gear shops from the research
-- candidates the agent kept, as unclaimed listings, like groups (FR-GR-9).
-- They have their own directory and never appear among groups (FR-BZ-7).
-- Claiming, business admins, linked groups and sponsor links (FR-BZ-2 to
-- FR-BZ-6) come later; until then nobody but the site admin writes here,
-- and only through the functions below.
--
-- 1. businesses: the listings, readable by everyone while active.
-- 2. research.candidates.business_id: which listing a candidate became.
-- 3. admin_business_candidates(): the kept guides and shops to review.
-- 4. list_business_candidate(candidate, region), skip_business_candidate,
--    remove_business: the site admin's only ways to write.
--
-- Tests: supabase/tests/032-businesses.sql (PT-220 to PT-226).

-- ---------------------------------------------------------------------------
-- 1. The listings
-- ---------------------------------------------------------------------------

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(btrim(name)) between 3 and 80),
  kind text not null check (kind in ('guide', 'shop')),
  description text not null check (char_length(btrim(description)) between 10 and 300),
  subcategory_id uuid not null references public.subcategories (id),
  region_id uuid not null references public.regions (id),
  area text not null check (char_length(btrim(area)) between 2 and 80),
  website text not null check (website ~ '^https?://[^\s]+$' and char_length(website) <= 500),
  affinity_tags text[] not null default '{}'
    check (affinity_tags <@ array['women', 'youth', 'bipoc', 'lgbtqia']::text[]),
  is_unclaimed boolean not null default true,
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  listed_by uuid references public.profiles (id) on delete set null
);

create index businesses_region_idx on public.businesses (region_id, name);
create index businesses_subcategory_idx on public.businesses (subcategory_id);

alter table public.businesses enable row level security;

-- Readable by everyone while active; no insert, update or delete policy
-- for anyone, so the only writes are the site admin's functions below.
create policy "Active businesses are public" on public.businesses
  for select to anon, authenticated using (status = 'active');

revoke all on public.businesses from anon, authenticated;
grant select on public.businesses to anon, authenticated;

-- The directory and the business page read this: activity and region by
-- name and slug. Same visibility as the table (security invoker).
create view public.business_listings
with (security_invoker = true) as
select
  b.id,
  b.slug,
  b.name,
  b.kind,
  b.description,
  b.area,
  b.website,
  b.affinity_tags,
  b.is_unclaimed,
  b.region_id,
  r.slug as region_slug,
  r.name as region_name,
  c.slug as category_slug,
  c.name as category_name,
  s.slug as subcategory_slug,
  s.name as subcategory_name
from public.businesses b
join public.regions r on r.id = b.region_id
join public.subcategories s on s.id = b.subcategory_id
join public.categories c on c.id = s.category_id
where b.status = 'active';

revoke all on public.business_listings from anon, authenticated;
grant select on public.business_listings to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Which listing a candidate became
-- ---------------------------------------------------------------------------

alter table research.candidates
  add column business_id uuid references public.businesses (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3. The kept guides and shops, for the site admin
-- ---------------------------------------------------------------------------

create function public.admin_business_candidates()
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
    where c.kind in ('guide', 'business') and c.status = 'kept'
    order by c.found_at, c.name;
end
$$;

-- ---------------------------------------------------------------------------
-- 4. The site admin's ways to write
-- ---------------------------------------------------------------------------

-- A kept guide becomes a guide listing; a kept business, a shop.
create function public.list_business_candidate(p_candidate_id uuid, p_region_id uuid)
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
    perform public.raise_rule('not_allowed', 'Only the site admin can list guides and shops.');
  end if;
  if not exists (select 1 from public.regions r where r.id = p_region_id and r.status = 'live') then
    perform public.raise_rule('region_closed', 'Guides and shops can only be listed in a live region.');
  end if;

  select * into v_c from research.candidates c
   where c.id = p_candidate_id and c.kind in ('guide', 'business') and c.status = 'kept'
   for update;
  if not found then
    perform public.raise_rule('not_found', 'No kept guide or shop with that id.');
  end if;

  v_base := left(btrim(regexp_replace(lower(v_c.name), '[^a-z0-9]+', '-', 'g'), '-'), 70);
  v_slug := v_base;
  while exists (select 1 from public.businesses b where b.slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.businesses (slug, name, kind, description, subcategory_id, region_id, area, website, affinity_tags, listed_by)
  values (v_slug, v_c.name, case when v_c.kind = 'guide' then 'guide' else 'shop' end, v_c.description,
          v_c.subcategory_id, p_region_id, v_c.area, v_c.source_url, v_c.affinity_tags, auth.uid())
  returning id into v_id;

  update research.candidates
     set status = 'listed', business_id = v_id, decided_at = now(), decided_by = auth.uid()
   where id = v_c.id;
  return v_slug;
end
$$;

create function public.skip_business_candidate(p_candidate_id uuid)
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
   where id = p_candidate_id and kind in ('guide', 'business') and status = 'kept';
  if not found then
    perform public.raise_rule('not_found', 'No kept guide or shop with that id.');
  end if;
end
$$;

-- Takes a listing off the board (closed, wrong, or asked to be removed).
create function public.remove_business(p_business_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can remove a listing.');
  end if;
  update public.businesses set status = 'removed' where id = p_business_id and status = 'active';
  if not found then
    perform public.raise_rule('not_found', 'No listing with that id.');
  end if;
end
$$;

revoke execute on function public.admin_business_candidates(), public.list_business_candidate(uuid, uuid),
  public.skip_business_candidate(uuid), public.remove_business(uuid) from public, anon;
grant execute on function public.admin_business_candidates(), public.list_business_candidate(uuid, uuid),
  public.skip_business_candidate(uuid), public.remove_business(uuid) to authenticated;
