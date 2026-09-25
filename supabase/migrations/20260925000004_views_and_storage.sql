-- Read-side views for the browse pages, and the cover-image storage bucket.
--
-- Views use security_invoker, so they run with the permissions of whoever is
-- reading and every RLS policy still applies. Counts come from the
-- security-definer count functions, which reveal numbers, not rows.

create view public.group_listings
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
  g.search
from public.groups g
join public.subcategories s on s.id = g.subcategory_id
join public.categories c on c.id = s.category_id;

-- Home page counts (FR-BR-1): active groups per subcategory, zero included.
create view public.subcategory_group_counts
with (security_invoker = true) as
select
  c.id as category_id,
  c.slug as category_slug,
  c.name as category_name,
  c.sort_order as category_sort_order,
  s.id as subcategory_id,
  s.slug as subcategory_slug,
  s.name as subcategory_name,
  s.sort_order as subcategory_sort_order,
  count(g.id) filter (where g.status = 'active')::integer as group_count
from public.categories c
join public.subcategories s on s.category_id = c.id
left join public.groups g on g.subcategory_id = s.id
group by c.id, s.id;

-- Upcoming events across the board (FR-BR-4) and on group pages.
create view public.event_listings
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
  e.search
from public.events e
join public.groups g on g.id = e.group_id
join public.subcategories s on s.id = g.subcategory_id
join public.categories c on c.id = s.category_id;

-- Views are read-only for everyone. Default privileges would otherwise make
-- them writable, and simple views pass writes through to their tables.
revoke all on public.group_listings, public.subcategory_group_counts, public.event_listings
  from anon, authenticated;
grant select on public.group_listings, public.subcategory_group_counts, public.event_listings
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cover images (FR-GR-1, TR-SEC-9). Public to read; group admins upload into
-- a folder named after their group's id: group-covers/<group_id>/<file>.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('group-covers', 'group-covers', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Returns null instead of failing when a path's folder isn't a group id.
create or replace function public.storage_group_id(p_name text)
returns uuid
language plpgsql immutable
as $$
begin
  return ((storage.foldername(p_name))[1])::uuid;
exception when others then
  return null;
end
$$;

grant execute on function public.storage_group_id(text) to authenticated;

create policy "Group admins upload covers" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'group-covers'
    and public.can_write()
    and public.is_group_admin(public.storage_group_id(name))
  );

create policy "Group admins replace covers" on storage.objects
  for update to authenticated
  using (bucket_id = 'group-covers' and public.is_group_admin(public.storage_group_id(name)))
  with check (bucket_id = 'group-covers' and public.is_group_admin(public.storage_group_id(name)));

create policy "Group admins delete covers" on storage.objects
  for delete to authenticated
  using (bucket_id = 'group-covers' and public.is_group_admin(public.storage_group_id(name)));
