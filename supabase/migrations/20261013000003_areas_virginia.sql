-- UC-35, 13 October 2026: two Virginia areas in the Mid-Atlantic, at
-- Sarah's request (she had sent Blacksburg and Roanoke research, and a
-- Harrisonburg adventure-town feature). Roanoke and the New River Valley
-- takes the Virginia listings that had been filed under the New River
-- Gorge; Harrisonburg and the Shenandoah Valley opens with research to
-- follow. 100-mile areas on Eastern time; towns and zip codes are in
-- src/config/towns.ts and zips.ts.

insert into public.regions (slug, name, timezone, center_lat, center_lng, state, sort_order, hub_towns, status, group_id)
select v.slug, v.name, 'America/New_York', v.lat, v.lng, 'VA', v.sort, v.hubs, 'live', g.id
from (values
  ('roanoke-nrv', 'Roanoke and the New River Valley', 37.25, -80.20, 200, '{Roanoke,Blacksburg}'::text[]),
  ('shenandoah', 'Harrisonburg and the Shenandoah Valley', 38.30, -78.85, 210, '{Harrisonburg,Charlottesville}'::text[])
) v(slug, name, lat, lng, sort, hubs)
join public.region_groups g on g.slug = 'mid-atlantic'
on conflict (slug) do nothing;

-- Virginia listings filed under the New River Gorge move to Roanoke and
-- the New River Valley.
update public.groups
   set region_id = (select id from public.regions where slug = 'roanoke-nrv')
 where region_id = (select id from public.regions where slug = 'new-river-gorge')
   and (area ~* ', ?VA$' or area ~* '^New River Valley');
update public.businesses
   set region_id = (select id from public.regions where slug = 'roanoke-nrv')
 where region_id = (select id from public.regions where slug = 'new-river-gorge')
   and (area ~* ', ?VA$' or area ~* '^New River Valley');
