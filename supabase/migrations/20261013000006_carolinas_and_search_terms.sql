-- 13 October 2026, at Sarah's request:
--
-- 1. Western North Carolina becomes the Western Carolinas and takes in
--    Greenville and the Upstate (upstate-sc). The slug stays western-nc so
--    saved links, cookies and the default region keep working.
-- 2. Charleston and the Lowcountry and Wilmington and the Cape Fear Coast,
--    both opened earlier today, become one area, the Coastal Carolinas, and
--    take the Outer Banks and Albemarle towns (North Carolina) from Hampton
--    Roads, which stays in the Mid-Atlantic as Hampton Roads and the Eastern
--    Shore. The Coastal Carolinas run from Corolla to Savannah, so the area
--    has the widest radius the board allows, 250 miles.
-- 3. search_terms: a list of keywords and names for an area or the board
--    (former names, abbreviations, nicknames), kept for tagging, search and
--    SEO later. "Western North Carolina" and "WNC" stay attached to the
--    Western Carolinas this way.
--
-- Listings move with their area; events follow their host, so nothing else
-- moves.

-- 1. Western Carolinas
update public.regions
   set name = 'Western Carolinas', center_lat = 35.2, center_lng = -82.45,
       hub_towns = '{Asheville,Greenville}', radius_miles = 130
 where slug = 'western-nc';
update public.groups set region_id = (select id from public.regions where slug = 'western-nc')
 where region_id = (select id from public.regions where slug = 'upstate-sc');
update public.businesses set region_id = (select id from public.regions where slug = 'western-nc')
 where region_id = (select id from public.regions where slug = 'upstate-sc');
delete from public.regions where slug = 'upstate-sc';

-- 2. Coastal Carolinas
update public.regions
   set slug = 'coastal-carolinas', name = 'Coastal Carolinas', center_lat = 34.2, center_lng = -78.2,
       hub_towns = '{"Charleston, SC",Wilmington,"Nags Head"}', radius_miles = 250
 where slug = 'lowcountry';
update public.groups set region_id = (select id from public.regions where slug = 'coastal-carolinas')
 where region_id = (select id from public.regions where slug = 'cape-fear');
update public.businesses set region_id = (select id from public.regions where slug = 'coastal-carolinas')
 where region_id = (select id from public.regions where slug = 'cape-fear');
delete from public.regions where slug = 'cape-fear';
update public.groups set region_id = (select id from public.regions where slug = 'coastal-carolinas')
 where region_id = (select id from public.regions where slug = 'hampton-roads') and area ~* ', ?NC$';
update public.businesses set region_id = (select id from public.regions where slug = 'coastal-carolinas')
 where region_id = (select id from public.regions where slug = 'hampton-roads') and area ~* ', ?NC$';
update public.regions
   set name = 'Hampton Roads and the Eastern Shore', center_lat = 37.0, center_lng = -76.3, hub_towns = '{Norfolk}'
 where slug = 'hampton-roads';

-- 3. Search terms
create table public.search_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null check (char_length(btrim(term)) between 1 and 120),
  kind text not null check (kind in ('former_name', 'abbreviation', 'alias', 'geography', 'keyword')),
  region_id uuid references public.regions (id) on delete cascade,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now()
);
comment on table public.search_terms is
  'Keywords and names that mean an area (or, with no region, the board), for tagging, search and SEO. Read by anyone; written by the site admin.';
create unique index search_terms_unique on public.search_terms (lower(btrim(term)), coalesce(region_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.search_terms enable row level security;
create policy search_terms_read on public.search_terms for select to anon, authenticated using (true);
create policy search_terms_admin_insert on public.search_terms for insert to authenticated with check ((select public.is_site_admin()));
create policy search_terms_admin_update on public.search_terms for update to authenticated
  using ((select public.is_site_admin())) with check ((select public.is_site_admin()));
create policy search_terms_admin_delete on public.search_terms for delete to authenticated using ((select public.is_site_admin()));
revoke all on public.search_terms from anon, authenticated;
grant select on public.search_terms to anon, authenticated;
grant insert, update, delete on public.search_terms to authenticated;

insert into public.search_terms (term, kind, region_id, note)
select v.term, v.kind, r.id, v.note
from (values
  ('Western North Carolina', 'former_name', 'western-nc', 'The area''s name until 13 October 2026'),
  ('WNC', 'abbreviation', 'western-nc', null),
  ('Western NC', 'abbreviation', 'western-nc', null),
  ('Greenville and the Upstate', 'former_name', 'western-nc', 'Its own area until 13 October 2026'),
  ('Upstate', 'alias', 'western-nc', null),
  ('Upstate SC', 'alias', 'western-nc', null),
  ('Upstate South Carolina', 'alias', 'western-nc', null),
  ('Blue Ridge', 'keyword', 'western-nc', null),
  ('Charleston and the Lowcountry', 'former_name', 'coastal-carolinas', 'Its own area on 13 October 2026'),
  ('Lowcountry', 'alias', 'coastal-carolinas', null),
  ('Wilmington and the Cape Fear Coast', 'former_name', 'coastal-carolinas', 'Its own area on 13 October 2026'),
  ('Cape Fear', 'alias', 'coastal-carolinas', null),
  ('Grand Strand', 'alias', 'coastal-carolinas', null),
  ('Outer Banks', 'alias', 'coastal-carolinas', null),
  ('OBX', 'abbreviation', 'coastal-carolinas', null),
  ('Hampton Roads and the Outer Banks', 'former_name', 'hampton-roads', 'The area''s name on 13 October 2026, before the Outer Banks moved to the Coastal Carolinas'),
  -- North Carolina, South Carolina and Virginia's traditional regions
  -- (Sarah, 13 October 2026, from NCpedia, virginia.org and the Virginia
  -- Museum of History), each on the area it falls in.
  ('Mountains', 'geography', 'western-nc', 'North Carolina''s mountain region'),
  ('Greater Appalachia', 'geography', 'western-nc', null),
  ('Blue Ridge Mountains', 'geography', 'western-nc', null),
  ('Great Smoky Mountains', 'geography', 'western-nc', null),
  ('Great Smoky Mountains', 'geography', 'east-tennessee', null),
  ('Blue Ridge Escarpment', 'geography', 'western-nc', 'Where the Upstate meets the mountains'),
  ('Mount Rogers', 'geography', 'western-nc', 'Near Damascus, Virginia'),
  ('Piedmont', 'geography', 'charlotte', 'North Carolina''s central region'),
  ('Piedmont', 'geography', 'triangle', 'North Carolina''s central region'),
  ('Midlands', 'geography', 'charlotte', 'South Carolina''s central region, around Columbia'),
  ('Coastal Plain', 'geography', 'coastal-carolinas', null),
  ('Tidewater', 'geography', 'coastal-carolinas', null),
  ('Inner Coastal Plain', 'geography', 'coastal-carolinas', null),
  ('Sea Islands', 'geography', 'coastal-carolinas', null),
  ('Sandhills', 'geography', null, 'North and South Carolina''s Sandhills; no area there yet'),
  ('Tidewater', 'geography', 'hampton-roads', 'Virginia''s Coastal Plain'),
  ('Coastal Plain', 'geography', 'hampton-roads', 'Virginia''s Coastal Plain'),
  ('Eastern Shore', 'geography', 'hampton-roads', null),
  ('Chesapeake Bay', 'geography', 'hampton-roads', null),
  ('Piedmont', 'geography', 'washington-dc', 'Virginia''s Piedmont, west of the Fall Line'),
  ('Piedmont', 'geography', 'shenandoah', 'Virginia''s Piedmont, around Charlottesville'),
  ('Blue Ridge Mountains', 'geography', 'shenandoah', null),
  ('Blue Ridge Mountains', 'geography', 'roanoke-nrv', null),
  ('Valley and Ridge', 'geography', 'shenandoah', null),
  ('Valley and Ridge', 'geography', 'roanoke-nrv', null),
  ('Shenandoah Valley', 'geography', 'shenandoah', null),
  ('Appalachian Plateau', 'geography', null, 'Southwest Virginia''s coalfields; no area there yet'),
  ('Northern Virginia', 'geography', 'washington-dc', null),
  ('NOVA', 'abbreviation', 'washington-dc', 'Northern Virginia')
) v(term, kind, slug, note)
left join public.regions r on r.slug = v.slug;
