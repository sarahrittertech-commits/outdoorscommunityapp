-- UC-35, 11 October 2026: open Reno and Lake Tahoe (Sarah sent Reno
-- research the same night). Hub Reno, 100 miles, Pacific time, centred
-- between Reno and the lake. Towns and zip prefixes are in
-- src/config/towns.ts and zips.ts; the app's list is src/config/regions.ts.

insert into public.regions (slug, name, timezone, center_lat, center_lng, state, sort_order, hub_towns, status) values
  ('reno-tahoe', 'Reno and Lake Tahoe', 'America/Los_Angeles', 39.40, -119.95, 'NV', 80, '{Reno}', 'live')
on conflict (slug) do nothing;
