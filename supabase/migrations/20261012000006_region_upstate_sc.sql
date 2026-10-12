-- UC-35, 12 October 2026: open Greenville and the Upstate (Sarah sent
-- Greenville, SC research, groups and events). Hub Greenville, 100 miles,
-- Eastern time. Towns and zip codes are in src/config/towns.ts and zips.ts;
-- the app's list is src/config/regions.ts.

insert into public.regions (slug, name, timezone, center_lat, center_lng, state, sort_order, hub_towns, status) values
  ('upstate-sc', 'Greenville and the Upstate', 'America/New_York', 34.85, -82.40, 'SC', 100, '{Greenville}', 'live')
on conflict (slug) do nothing;
