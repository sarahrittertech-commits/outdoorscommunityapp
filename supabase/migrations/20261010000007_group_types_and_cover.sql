-- UC-24, approved 9 October 2026: tell groups apart.
--
--   FR-GR-16  a group type: Club, Meetup, Volunteer group, Nonprofit or Chapter
--   FR-GR-17  Communities filters by type (app only; uses group_listings)
--   FR-GR-14  one cover photo per group, narrowed: uploaded by the page admin
--             or managers in group settings (no gallery yet, UC-21)

-- ---------------------------------------------------------------------------
-- 1. Group type (FR-GR-16). Nullable: groups that exist today have no type
-- until their organizers pick one; the page then shows none. A type outside
-- the list is refused by the enum.
-- ---------------------------------------------------------------------------

create type public.group_type as enum ('club', 'meetup', 'volunteer', 'nonprofit', 'chapter');

alter table public.groups add column group_type public.group_type;

create index groups_group_type_idx on public.groups (group_type) where group_type is not null;

-- ---------------------------------------------------------------------------
-- 2. Cover photo (FR-GR-14). groups.cover_image_path (unused since the old
-- group-covers bucket lost its policies) now holds the path in the new
-- group-covers-v2 bucket, always <group_id>/<random>.webp, and cover_alt the
-- required short description of the picture.
-- ---------------------------------------------------------------------------

-- Nothing should be set, but clear anything that doesn't fit the new rule
-- before the rule is added.
update public.groups
   set cover_image_path = null
 where cover_image_path is not null
   and cover_image_path !~ ('^' || id::text || '/[A-Za-z0-9_-]{8,64}\.webp$');

alter table public.groups
  add column cover_alt text check (char_length(btrim(cover_alt)) between 1 and 200),
  add constraint groups_cover_path_check check (
    cover_image_path is null
    or cover_image_path ~ ('^' || id::text || '/[A-Za-z0-9_-]{8,64}\.webp$')
  ),
  add constraint groups_cover_needs_alt check (cover_image_path is null or cover_alt is not null);

-- Owner and admins change both like any other group detail (cover_image_path
-- was already in the column grant).
grant update (group_type, cover_alt) on public.groups to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Listings carry the type and the cover. Columns are only appended, so the
-- view keeps its grants (select for anon and authenticated) and
-- security_invoker.
-- ---------------------------------------------------------------------------

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
  g.affinity_tags,
  g.group_type,
  g.cover_image_path,
  g.cover_alt
from public.groups g
join public.subcategories s on s.id = g.subcategory_id
join public.categories c on c.id = s.category_id;

-- ---------------------------------------------------------------------------
-- 4. The group-covers-v2 bucket (TR-SEC-9, TR-SEC-12). Public to read; only
-- the app's re-encoded WebP goes in, at <group_id>/<random>.webp. Writing
-- needs a writable account, the owner or an admin of the group, an active
-- group, and room in the group's folder (at most 5 files, so a cover can be
-- replaced before the old file is removed, and nobody can fill the bucket).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('group-covers-v2', 'group-covers-v2', true, 5242880, array['image/webp'])
on conflict (id) do nothing;

-- True when the signed-in user may write this cover path.
create or replace function public.can_write_group_cover(p_name text)
returns boolean
language sql stable set search_path = ''
as $$
  select p_name ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{8,64}\.webp$'
     and public.can_write()
     and public.is_group_admin(public.storage_group_id(p_name))
     and public.group_is_active(public.storage_group_id(p_name))
$$;

revoke execute on function public.can_write_group_cover(text) from public, anon;
grant execute on function public.can_write_group_cover(text) to authenticated;

-- How many cover files the group's folder holds. Runs as the caller, who can
-- see the folder only when they may write it.
create or replace function public.group_cover_file_count(p_name text)
returns integer
language sql stable set search_path = ''
as $$
  select count(*)::integer from storage.objects o
  where o.bucket_id = 'group-covers-v2'
    and (storage.foldername(o.name))[1] = (storage.foldername(p_name))[1]
$$;

revoke execute on function public.group_cover_file_count(text) from public, anon;
grant execute on function public.group_cover_file_count(text) to authenticated;

create policy "Group admins see their covers v2" on storage.objects
  for select to authenticated
  using (bucket_id = 'group-covers-v2' and public.can_write_group_cover(name));

create policy "Group admins upload covers v2" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'group-covers-v2'
    and public.can_write_group_cover(name)
    and public.group_cover_file_count(name) < 5
  );

create policy "Group admins replace covers v2" on storage.objects
  for update to authenticated
  using (bucket_id = 'group-covers-v2' and public.can_write_group_cover(name))
  with check (bucket_id = 'group-covers-v2' and public.can_write_group_cover(name));

create policy "Group admins delete covers v2" on storage.objects
  for delete to authenticated
  using (bucket_id = 'group-covers-v2' and public.can_write_group_cover(name));
