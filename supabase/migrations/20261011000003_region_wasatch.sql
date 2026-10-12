-- UC-35, 11 October 2026: open Salt Lake City and the Wasatch (Sarah, for a
-- meeting about Denver and Salt Lake City). Hub Salt Lake City, 100 miles,
-- Mountain time. Towns and zip prefixes are in src/config/towns.ts and
-- zips.ts; the app's list is src/config/regions.ts.

insert into public.regions (slug, name, timezone, center_lat, center_lng, state, sort_order, hub_towns, status) values
  ('wasatch', 'Salt Lake City and the Wasatch', 'America/Denver', 40.76, -111.89, 'UT', 70, '{"Salt Lake City"}', 'live')
on conflict (slug) do nothing;
