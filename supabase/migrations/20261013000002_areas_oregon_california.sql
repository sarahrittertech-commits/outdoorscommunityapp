-- UC-35, 13 October 2026: open five areas Sarah asked for the same day.
-- Pacific Northwest gains Portland and the Columbia Gorge, and Bend and
-- Central Oregon; Far West and Sierra gains the San Francisco Bay Area, Los
-- Angeles and Santa Barbara, and San Diego. Each is a 100-mile hub area on
-- Pacific time. The Seattle area takes Olympia (already inside its
-- radius) into its name. Towns and zip codes are in src/config/towns.ts and
-- zips.ts; the app's list is src/config/regions.ts.

insert into public.regions (slug, name, timezone, center_lat, center_lng, state, sort_order, hub_towns, status, group_id)
select v.slug, v.name, 'America/Los_Angeles', v.lat, v.lng, v.state, v.sort, v.hubs, 'live', g.id
from (values
  ('portland-gorge', 'Portland and the Columbia Gorge', 45.52, -122.68, 'OR', 150, '{Portland}'::text[], 'pacific-northwest'),
  ('central-oregon', 'Bend and Central Oregon', 44.06, -121.31, 'OR', 160, '{Bend}'::text[], 'pacific-northwest'),
  ('bay-area', 'San Francisco Bay Area', 37.77, -122.30, 'CA', 170, '{San Francisco,Oakland}'::text[], 'far-west'),
  ('los-angeles', 'Los Angeles and Santa Barbara', 34.15, -118.60, 'CA', 180, '{Los Angeles,Santa Barbara}'::text[], 'far-west'),
  ('san-diego', 'San Diego', 32.80, -117.10, 'CA', 190, '{San Diego}'::text[], 'far-west')
) v(slug, name, lat, lng, state, sort, hubs, grp)
join public.region_groups g on g.slug = v.grp
on conflict (slug) do nothing;

update public.regions set name = 'Seattle, Bellingham and Olympia', hub_towns = '{Seattle,Bellingham,Olympia}' where slug = 'puget-sound';
