-- UC-35, 13 October 2026: seventeen more areas, at Sarah's request ("all
-- of them"), each opened where the 13 October town research found verified
-- groups: Missoula; Bozeman and Big Sky; Jackson Hole; Boise, McCall and Sun
-- Valley; Charleston and the Lowcountry; Wilmington and the Cape Fear coast;
-- Hampton Roads and the Outer Banks; Lexington, Louisville and the Red River
-- Gorge; Washington, DC and Harpers Ferry; Pittsburgh and the Laurel
-- Highlands; Duluth; Marquette and the Keweenaw; Chicago; the Twin Cities;
-- Madison and the Driftless; Moab and Grand Junction; St. George, Zion and
-- Kanab. The Midwest gets its first areas. 100-mile areas; towns and zip
-- codes are in src/config/towns.ts and zips.ts.

insert into public.regions (slug, name, timezone, center_lat, center_lng, state, sort_order, hub_towns, status, group_id)
select v.slug, v.name, v.tz, v.lat, v.lng, v.state, v.sort, v.hubs, 'live', g.id
from (values
  ('missoula', 'Missoula and Western Montana', 'America/Denver', 46.87, -114.0, 'MT', 230, '{"Missoula"}'::text[], 'rockies'),
  ('bozeman', 'Bozeman and Big Sky', 'America/Denver', 45.6, -111.1, 'MT', 240, '{"Bozeman","Big Sky"}'::text[], 'rockies'),
  ('jackson-hole', 'Jackson Hole and the Tetons', 'America/Denver', 43.9, -110.3, 'WY', 250, '{"Jackson, WY"}'::text[], 'rockies'),
  ('boise-sun-valley', 'Boise, McCall and Sun Valley', 'America/Boise', 44.0, -115.6, 'ID', 260, '{"Boise","McCall","Ketchum"}'::text[], 'rockies'),
  ('lowcountry', 'Charleston and the Lowcountry', 'America/New_York', 32.5, -80.5, 'SC', 270, '{"Charleston, SC","Hilton Head"}'::text[], 'southeast'),
  ('cape-fear', 'Wilmington and the Cape Fear Coast', 'America/New_York', 34.0, -78.2, 'NC', 280, '{"Wilmington"}'::text[], 'southeast'),
  ('hampton-roads', 'Hampton Roads and the Outer Banks', 'America/New_York', 36.5, -76.2, 'VA', 290, '{"Norfolk","Nags Head"}'::text[], 'mid-atlantic'),
  ('bluegrass', 'Lexington, Louisville and the Red River Gorge', 'America/New_York', 38.0, -84.7, 'KY', 300, '{"Lexington, KY","Louisville, KY"}'::text[], 'southeast'),
  ('washington-dc', 'Washington, DC and Harpers Ferry', 'America/New_York', 38.95, -77.25, 'DC', 310, '{"Washington, DC"}'::text[], 'mid-atlantic'),
  ('laurel-highlands', 'Pittsburgh and the Laurel Highlands', 'America/New_York', 39.7, -79.6, 'PA', 320, '{"Pittsburgh","Morgantown"}'::text[], 'mid-atlantic'),
  ('duluth', 'Duluth and the North Shore', 'America/Chicago', 47.0, -92.0, 'MN', 330, '{"Duluth"}'::text[], 'midwest'),
  ('marquette', 'Marquette and the Keweenaw', 'America/Detroit', 46.9, -88.0, 'MI', 340, '{"Marquette"}'::text[], 'midwest'),
  ('chicago', 'Chicago and Starved Rock', 'America/Chicago', 41.85, -88.0, 'IL', 350, '{"Chicago"}'::text[], 'midwest'),
  ('twin-cities', 'Minneapolis–St. Paul and the St. Croix', 'America/Chicago', 44.98, -93.1, 'MN', 360, '{"Minneapolis","St. Paul"}'::text[], 'midwest'),
  ('madison-driftless', 'Madison and the Driftless', 'America/Chicago', 43.2, -90.3, 'WI', 370, '{"Madison","Decorah"}'::text[], 'midwest'),
  ('moab-grand-junction', 'Moab and Grand Junction', 'America/Denver', 38.85, -109.0, 'UT', 380, '{"Moab","Grand Junction"}'::text[], 'southwest'),
  ('zion-kanab', 'St. George, Zion and Kanab', 'America/Denver', 37.15, -112.6, 'UT', 390, '{"St. George","Kanab"}'::text[], 'southwest')
) v(slug, name, tz, lat, lng, state, sort, hubs, grp)
join public.region_groups g on g.slug = v.grp
on conflict (slug) do nothing;
