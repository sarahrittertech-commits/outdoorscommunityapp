-- 11 October 2026: an exact name match with the research tables no longer
-- drops a find. research.organizations holds Sarah's research notes, not
-- decisions; dropping exact matches with it hid groups nobody had reviewed
-- (Old Fort Women's Mountain Bike Club, Upstate SORBA, Boulder Cycling Club,
-- Overland Mountain Bike Association). Such a find now comes in as a new
-- candidate flagged as a possible duplicate of the research row (FR-RS-10).
-- Exact matches with a candidate already decided, or with a group on the
-- board, are still dropped silently (FR-RS-3).
--
-- Otherwise the same as 20261009000004_possible_duplicates.sql.

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
  elsif v_existing.id is not null or v_group.id is not null then
    -- Exact match with a decision already made (skipped, kept, listed or
    -- claimed) or a group on the board: dropped silently (FR-RS-3).
    return jsonb_build_object('result', 'duplicate');
  else
    -- An exact match with the research tables is NOT dropped: they are
    -- notes, not decisions, and dropping them hid groups nobody had
    -- reviewed (11 October 2026: Old Fort Women's Mountain Bike Club). It
    -- comes in flagged as a possible duplicate of that research row.
    select o.name, o.website into v_dup_name, v_dup_url
      from research.organizations o where lower(btrim(o.name)) = lower(v_name)
     order by o.org_id limit 1;
    if v_dup_name is null then
      -- FR-RS-10: a near match is kept for the site admin to decide.
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

  if v_group.id is not null and v_group.is_unclaimed and v_group.status = 'active' then
    -- Without review only for a group find, and only links on the listing's own site.
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
