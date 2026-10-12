-- UC-37, 12 October 2026: event companies (race organizers) became a fourth
-- kind of business in 20261012000002, but the listing step still accepted
-- only guides, shops and venues and filed anything else as a shop. Accept
-- 'company' candidates, list them as companies, and show them to the site
-- admin with the others.

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
   where c.id = p_candidate_id and c.kind in ('guide', 'business', 'venue', 'company') and c.status = 'kept'
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

create or replace function public.admin_business_candidates()
returns table(id uuid, name text, kind text, subcategory_name text, area text, description text, source_url text, affinity_tags text[], found_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only the site admin can see candidates.');
  end if;
  return query
    select c.id, c.name, c.kind, s.name, c.area, c.description, c.source_url, c.affinity_tags, c.found_at
    from research.candidates c
    join public.subcategories s on s.id = c.subcategory_id
    where c.kind in ('guide', 'business', 'venue', 'company') and c.status = 'kept' and c.verification <> 'failed'
    order by c.found_at, c.name;
end
$$;
