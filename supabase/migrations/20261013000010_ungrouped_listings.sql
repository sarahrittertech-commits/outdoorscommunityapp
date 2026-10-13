-- UC-41, approved and built 13 October 2026 (Sarah: "go and build it").
-- A verified community or guide whose town isn't in any open area is listed
-- anyway, with no area: people find it by zip code or town on Communities
-- (distance decides there, across every area), and under *every region*.
-- The site admin matches it to an area later from Admin › Ungrouped.
--
-- 1. groups.region_id and businesses.region_id may be empty. Only the site
--    admin and research listing leave them empty; an organizer's group
--    still picks a live area (FR-RG-14).
-- 2. business_listings keeps listings with no area (a left join).
-- 3. list_ungrouped_candidate lists a verified research find with no area.
-- 4. assign_area moves an ungrouped listing (or any listing) into a live
--    area. Both are the site admin's only.
-- The weekly source reader keeps reading only listings with an area, since
-- an area gives an event its time zone; a listing's events start once it
-- has one.

alter table public.groups alter column region_id drop not null;
alter table public.businesses alter column region_id drop not null;

create or replace function public.groups_region_live()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.region_id is not distinct from old.region_id then
    return new;
  end if;
  if new.region_id is null then
    if coalesce(current_setting('branch.operator_listing', true), '') = 'on' or public.is_site_admin() then
      return new;
    end if;
    raise exception using errcode = 'P0001', message = 'region_closed: Groups can only be in a live region.';
  end if;
  if not exists (select 1 from public.regions r where r.id = new.region_id and r.status = 'live') then
    raise exception using errcode = 'P0001', message = 'region_closed: Groups can only be in a live region.';
  end if;
  return new;
end
$$;
revoke execute on function public.groups_region_live() from public, anon, authenticated;

create or replace view public.business_listings with (security_invoker = true) as
select b.id, b.slug, b.name, b.kind, b.description, b.area, b.website, b.affinity_tags, b.is_unclaimed,
       b.region_id, r.slug as region_slug, r.name as region_name,
       c.slug as category_slug, c.name as category_name, s.slug as subcategory_slug, s.name as subcategory_name
from public.businesses b
left join public.regions r on r.id = b.region_id
join public.subcategories s on s.id = b.subcategory_id
join public.categories c on c.id = s.category_id
where b.status = 'active';

create function public.list_ungrouped_candidate(p_candidate_id uuid)
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
    perform public.raise_rule('not_allowed', 'Only the site admin can list research finds.');
  end if;

  select * into v_c from research.candidates c
   where c.id = p_candidate_id and c.verification = 'verified'
     and c.group_id is null and c.business_id is null
     and ((c.kind = 'group' and c.status = 'new') or (c.kind in ('guide', 'business', 'venue', 'company') and c.status = 'kept'))
   for update;
  if not found then
    perform public.raise_rule('not_found', 'No verified, unlisted find with that id.');
  end if;

  v_base := left(btrim(regexp_replace(lower(v_c.name), '[^a-z0-9]+', '-', 'g'), '-'), 70);
  v_slug := v_base;
  if v_c.kind = 'group' then
    while exists (select 1 from public.groups g where g.slug = v_slug) loop
      v_n := v_n + 1;
      v_slug := v_base || '-' || v_n;
    end loop;
    perform set_config('branch.operator_listing', 'on', true);
    insert into public.groups (slug, name, description, subcategory_id, region_id, area,
                               discussions_enabled, is_unclaimed, source_url, affinity_tags)
    values (v_slug, v_c.name, v_c.description, v_c.subcategory_id, null, v_c.area,
            false, true, v_c.source_url, v_c.affinity_tags)
    returning id into v_id;
    perform research.publish_candidate_events(v_c.id, v_id);
    update research.candidates
       set status = 'listed', group_id = v_id, decided_at = now(), decided_by = auth.uid()
     where id = v_c.id;
  else
    while exists (select 1 from public.businesses b where b.slug = v_slug) loop
      v_n := v_n + 1;
      v_slug := v_base || '-' || v_n;
    end loop;
    insert into public.businesses (slug, name, kind, description, subcategory_id, region_id, area, website, affinity_tags, listed_by)
    values (v_slug, v_c.name,
            case v_c.kind when 'guide' then 'guide' when 'venue' then 'venue' when 'company' then 'company' else 'shop' end,
            v_c.description, v_c.subcategory_id, null, v_c.area, v_c.source_url, v_c.affinity_tags, auth.uid())
    returning id into v_id;
    perform research.publish_business_events(v_c.id, v_id);
    update research.candidates
       set status = 'listed', business_id = v_id, decided_at = now(), decided_by = auth.uid()
     where id = v_c.id;
  end if;
  return v_slug;
end
$$;
revoke execute on function public.list_ungrouped_candidate(uuid) from public, anon;
grant execute on function public.list_ungrouped_candidate(uuid) to authenticated;

create function public.assign_area(p_kind text, p_slug text, p_region_slug text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_region uuid;
  v_done integer;
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can assign an area.');
  end if;
  select r.id into v_region from public.regions r where r.slug = p_region_slug and r.status = 'live';
  if v_region is null then
    perform public.raise_rule('region_closed', 'Listings can only move into a live area.');
  end if;
  if p_kind = 'group' then
    update public.groups set region_id = v_region where slug = p_slug;
  elsif p_kind = 'business' then
    update public.businesses set region_id = v_region where slug = p_slug;
  else
    perform public.raise_rule('not_found', 'Unknown kind of listing.');
  end if;
  get diagnostics v_done = row_count;
  if v_done = 0 then
    perform public.raise_rule('not_found', 'No listing with that address.');
  end if;
  return p_region_slug;
end
$$;
revoke execute on function public.assign_area(text, text, text) from public, anon;
grant execute on function public.assign_area(text, text, text) to authenticated;
