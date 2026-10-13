-- UC-40, 13 October 2026 (ADR-0012): big regions over the local areas.
-- Sarah approved the grouping the same day. Every area keeps its towns,
-- radius and listings; it gains the big region it belongs to. The app's
-- copy is src/config/regionGroups.ts and the `group` of each area in
-- src/config/regions.ts. Directory data: public read, changed only by
-- migration (FR-AD-1), like regions.

create table public.region_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 60),
  sort_order integer not null default 0
);

alter table public.region_groups enable row level security;
revoke insert, update, delete, truncate, references, trigger on public.region_groups from anon, authenticated;
grant select on public.region_groups to anon, authenticated;
create policy "Directory is public" on public.region_groups
  for select to anon, authenticated using (true);

insert into public.region_groups (slug, name, sort_order) values
  ('southeast', 'Southeast', 10),
  ('mid-atlantic', 'Mid-Atlantic', 20),
  ('northeast', 'Northeast', 30),
  ('midwest', 'Midwest and Great Lakes', 40),
  ('rockies', 'Rockies', 50),
  ('southwest', 'Southwest', 60),
  ('far-west', 'Far West and Sierra', 70),
  ('pacific-northwest', 'Pacific Northwest', 80);

alter table public.regions add column group_id uuid references public.region_groups (id);

update public.regions r set group_id = g.id
from public.region_groups g, (values
  ('western-nc', 'southeast'), ('charlotte', 'southeast'), ('triangle', 'southeast'), ('upstate-sc', 'southeast'), ('east-tennessee', 'southeast'),
  ('new-river-gorge', 'mid-atlantic'),
  ('northern-vermont', 'northeast'), ('greater-boston', 'northeast'),
  ('front-range', 'rockies'), ('durango-san-juans', 'rockies'), ('wasatch', 'rockies'),
  ('sedona-flagstaff', 'southwest'),
  ('reno-tahoe', 'far-west'),
  ('puget-sound', 'pacific-northwest')) m(region, grp)
where r.slug = m.region and g.slug = m.grp;
