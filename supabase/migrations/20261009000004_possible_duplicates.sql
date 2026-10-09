-- FR-RS-10: finds that look like something the board already knows are
-- flagged for the site admin, not dropped and not listed blind.
--
-- An exact name match is still dropped silently (FR-RS-3): it is certain.
-- A near match is kept and marked "possible duplicate of <name>" so the site
-- admin decides: a similar name ("Pisgah SORBA" against "Pisgah Area
-- SORBA"), or the same website as a group, candidate or research
-- organization the board already has. Shared sites (Facebook, Meetup,
-- Instagram and the like) never count as the same website.

create extension if not exists pg_trgm with schema extensions;

alter table research.candidates
  add column possible_duplicate_of text,
  add column possible_duplicate_url text;

comment on column research.candidates.possible_duplicate_of is
  'FR-RS-10: the name of the group, candidate or organization this find may duplicate.';

-- "The Pisgah Area SORBA, Inc." -> "pisgah area sorba"
create or replace function research.normalize_name(p text)
returns text
language sql immutable set search_path = ''
as $$
  select btrim(regexp_replace(
    regexp_replace(
      regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]+', ' ', 'g'),
      '\m(the|inc|llc|co|org|club|group|of|and)\M', ' ', 'g'),
    '\s+', ' ', 'g'))
$$;

-- "https://www.Example.org/path" -> "example.org"; null for shared sites.
create or replace function research.own_host(p text)
returns text
language sql immutable set search_path = ''
as $$
  select case
    when h is null or h = '' then null
    when h ~ '(^|\.)(facebook|fb|meetup|instagram|eventbrite|linktr|twitter|x|google|youtube|strava|allevents|wordpress|wixsite|squarespace|blogspot|groups\.io)\.(com|ee|io|org|net|me)$' then null
    else h
  end
  from (select regexp_replace(lower(substring(p from '^https?://([^/:?#]+)')), '^www\.', '') as h) s
$$;

-- The closest thing the board already has, if any looks like this find.
create or replace function research.possible_duplicate(p_name text, p_url text)
returns table (name text, url text)
language sql stable security definer set search_path = ''
as $$
  with known as (
    select g.name, coalesce(g.source_url, '') as url from public.groups g where g.status <> 'removed'
    union all
    select c.name, c.source_url from research.candidates c
    union all
    select o.name, coalesce(o.website, '') from research.organizations o
  ),
  scored as (
    select k.name, nullif(k.url, '') as url,
           extensions.similarity(research.normalize_name(k.name), research.normalize_name(p_name)) as name_score,
           research.own_host(p_url) is not null and research.own_host(k.url) = research.own_host(p_url) as same_site
    from known k
    where lower(btrim(k.name)) <> lower(btrim(p_name))
  )
  select s.name, s.url
  from scored s
  where s.same_site or s.name_score >= 0.6
  order by s.same_site desc, s.name_score desc, s.name
  limit 1
$$;

revoke execute on function research.normalize_name(text), research.own_host(text),
  research.possible_duplicate(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Events found for an existing unclaimed listing (FR-RS-8), tightened.
--
-- The agent reads untrusted pages. Before this, any find whose name matched
-- an unclaimed listing published its events straight to the board, with any
-- link. Now they publish without review only when the find is a group and
-- each event's link is on the listing's own website (not a shared site).
-- Anything else waits with the candidate; the site admin's List it still
-- publishes everything, because that is a reviewed decision.
-- ---------------------------------------------------------------------------

drop function research.publish_candidate_events(uuid, uuid);

create function research.publish_candidate_events(p_candidate_id uuid, p_group_id uuid, p_own_site_only boolean default false)
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

-- add_candidate: a new candidate records its closest possible duplicate,
-- and events for a listing go through the tightened publish above. Exact matches still return 'duplicate' before this.
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
  elsif v_existing.id is not null or v_group.id is not null
     or exists (select 1 from research.organizations o where lower(btrim(o.name)) = lower(v_name)) then
    -- Exact match: skipped, kept, claimed, or already in the research. Dropped silently (FR-RS-3).
    return jsonb_build_object('result', 'duplicate');
  else
    -- FR-RS-10: a near match is kept for the site admin to decide.
    select d.name, d.url into v_dup_name, v_dup_url from research.possible_duplicate(v_name, p ->> 'source_url') d;
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

-- The admin list carries the flag (FR-RS-5, FR-RS-10). The return type
-- changes, so the function is replaced rather than altered.
drop function public.admin_candidates();

create function public.admin_candidates()
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
  found_at timestamptz,
  possible_duplicate_of text,
  possible_duplicate_url text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (select public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only the site admin can see candidates.');
  end if;
  return query
    select c.id, c.name, s.name, c.area, c.description, c.source_url, c.affinity_tags, c.out_of_region,
           (select count(*)::integer from research.candidate_events e
             where e.candidate_id = c.id and e.starts_at > now()),
           c.found_at, c.possible_duplicate_of, c.possible_duplicate_url
    from research.candidates c
    join public.subcategories s on s.id = c.subcategory_id
    where c.kind = 'group' and c.status = 'new'
    order by c.found_at, c.name;
end
$$;

revoke execute on function public.admin_candidates() from public, anon;
grant execute on function public.admin_candidates() to authenticated;
