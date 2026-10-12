-- UC-35, 12 October 2026: open Durango and the San Juans (Sarah sent
-- Durango, CO research). Hub Durango, 100 miles, Mountain time; about 300
-- miles from Denver, so not part of the Front Range. Towns and zip codes are
-- in src/config/towns.ts and zips.ts; the app's list is src/config/regions.ts.

insert into public.regions (slug, name, timezone, center_lat, center_lng, state, sort_order, hub_towns, status) values
  ('durango-san-juans', 'Durango and the San Juans', 'America/Denver', 37.27, -107.88, 'CO', 110, '{Durango}', 'live')
on conflict (slug) do nothing;
