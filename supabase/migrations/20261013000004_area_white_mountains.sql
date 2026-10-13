-- UC-35, 13 October 2026: North Conway and the White Mountains in the
-- Northeast, at Sarah's request (an east-coast capital for alpine and
-- backcountry skiing, rock and ice climbing, and hiking). A 100-mile area on
-- Eastern time around North Conway and Lincoln, NH, reaching western Maine;
-- towns and zip codes are in src/config/towns.ts and zips.ts.

insert into public.regions (slug, name, timezone, center_lat, center_lng, state, sort_order, hub_towns, status, group_id)
select 'white-mountains', 'North Conway and the White Mountains', 'America/New_York', 44.05, -71.35, 'NH', 220,
       '{North Conway,"Lincoln, NH"}'::text[], 'live', g.id
from public.region_groups g where g.slug = 'northeast'
on conflict (slug) do nothing;
