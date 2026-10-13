-- UC-35, 12 October 2026: open Charlotte and Lake Norman, Burlington and
-- Northern Vermont, and Greater Boston (Sarah sent research for all three
-- earlier the same day and asked for them to go live). Each is a hub with a
-- 100-mile radius on Eastern time. Towns and zip codes are in
-- src/config/towns.ts and zips.ts; the app's list is src/config/regions.ts.
--
-- Charlotte's groups had been filed under Western North Carolina, the
-- nearest region before this one existed; they move to Charlotte.

insert into public.regions (slug, name, timezone, center_lat, center_lng, state, sort_order, hub_towns, status) values
  ('charlotte', 'Charlotte and Lake Norman', 'America/New_York', 35.23, -80.84, 'NC', 120, '{Charlotte}', 'live'),
  ('northern-vermont', 'Burlington and Northern Vermont', 'America/New_York', 44.48, -73.21, 'VT', 130, '{Burlington}', 'live'),
  ('greater-boston', 'Greater Boston', 'America/New_York', 42.36, -71.06, 'MA', 140, '{Boston}', 'live')
on conflict (slug) do nothing;

update public.groups
   set region_id = (select id from public.regions where slug = 'charlotte')
 where region_id = (select id from public.regions where slug = 'western-nc')
   and area ~* '^(Charlotte|Mooresville|Huntersville|Cornelius|Davidson|Concord|Matthews|Gastonia|Lake Norman)\M';

update public.businesses
   set region_id = (select id from public.regions where slug = 'charlotte')
 where region_id = (select id from public.regions where slug = 'western-nc')
   and area ~* '^(Charlotte|Mooresville|Huntersville|Cornelius|Davidson|Concord|Matthews|Gastonia|Lake Norman)\M';
