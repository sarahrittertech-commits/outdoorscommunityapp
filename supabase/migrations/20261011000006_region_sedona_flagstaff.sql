-- UC-35, 11 October 2026: open Sedona and Flagstaff (Sarah sent Sedona
-- research, groups and events, the same night). Hubs Sedona and Flagstaff,
-- 100 miles, Arizona time (America/Phoenix, no daylight saving). Towns and
-- zip codes are in src/config/towns.ts and zips.ts; the app's list is
-- src/config/regions.ts.

insert into public.regions (slug, name, timezone, center_lat, center_lng, state, sort_order, hub_towns, status) values
  ('sedona-flagstaff', 'Sedona and Flagstaff', 'America/Phoenix', 35.00, -111.75, 'AZ', 90, '{Sedona,Flagstaff}', 'live')
on conflict (slug) do nothing;
