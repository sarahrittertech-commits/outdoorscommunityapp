-- 13 October 2026, from Sarah's notes on grouping the rest of the towns:
-- Richmond and Northern Virginia, Washington, DC and Annapolis belong
-- together; Atlanta goes with Athens and Helen in the Southeast; Birmingham
-- and North Alabama, all of Florida (one area: few clubs, no mountains) and
-- Nashville (its own Tennessee area, on Central time) join the Southeast;
-- Cleveland, the Pennsylvania Wilds with the Poconos, and Philadelphia join
-- the Mid-Atlantic; Acadia and Midcoast Maine join the Northeast. Her lists
-- of the Northeast's and Mid-Atlantic's outdoor regions go into
-- search_terms, on the area each falls in, or on none yet.

update public.regions
   set name = 'Washington, DC, Richmond and Annapolis', center_lat = 38.4, center_lng = -77.2,
       hub_towns = '{"Washington, DC","Richmond, VA",Annapolis}', radius_miles = 130
 where slug = 'washington-dc';

insert into public.regions (slug, name, timezone, center_lat, center_lng, state, sort_order, hub_towns, radius_miles, status, group_id)
select v.slug, v.name, v.tz, v.lat, v.lng, v.state, v.sort, v.hubs, v.radius, 'live', g.id
from (values
  ('atlanta', 'Atlanta, Athens and North Georgia', 'America/New_York', 33.95, -84.2, 'GA', 400, '{"Atlanta","Athens"}'::text[], 100, 'southeast'),
  ('north-alabama', 'Birmingham and North Alabama', 'America/Chicago', 34.1, -86.6, 'AL', 410, '{"Birmingham","Huntsville, AL"}'::text[], 100, 'southeast'),
  ('florida', 'Florida', 'America/New_York', 28.3, -82.0, 'FL', 420, '{"Orlando","Tampa","Miami"}'::text[], 250, 'southeast'),
  ('cleveland-akron', 'Cleveland, Akron and the Cuyahoga Valley', 'America/New_York', 41.3, -81.55, 'OH', 430, '{"Cleveland, OH","Akron"}'::text[], 100, 'mid-atlantic'),
  ('coastal-maine', 'Acadia and Midcoast Maine', 'America/New_York', 44.3, -68.9, 'ME', 440, '{"Bar Harbor","Camden, ME"}'::text[], 100, 'northeast'),
  ('pa-wilds-poconos', 'Pennsylvania Wilds and the Poconos', 'America/New_York', 41.3, -76.5, 'PA', 450, '{"Wellsboro","Jim Thorpe"}'::text[], 100, 'mid-atlantic'),
  ('philadelphia', 'Philadelphia and the Delaware Valley', 'America/New_York', 40.0, -75.2, 'PA', 460, '{"Philadelphia"}'::text[], 100, 'mid-atlantic'),
  ('nashville', 'Nashville and Middle Tennessee', 'America/Chicago', 36.0, -86.6, 'TN', 470, '{"Nashville"}'::text[], 100, 'southeast')
) v(slug, name, tz, lat, lng, state, sort, hubs, radius, grp)
join public.region_groups g on g.slug = v.grp
on conflict (slug) do nothing;

-- Athens and Dahlonega listings (filed under Greenville and the Upstate,
-- then the Western Carolinas) move to Atlanta.
update public.groups set region_id = (select id from public.regions where slug = 'atlanta')
 where region_id = (select id from public.regions where slug = 'western-nc') and area ~* '^(Athens|Dahlonega|Helen|Gainesville)\y.*, ?GA$';
update public.businesses set region_id = (select id from public.regions where slug = 'atlanta')
 where region_id = (select id from public.regions where slug = 'western-nc') and area ~* '^(Athens|Dahlonega|Helen|Gainesville)\y.*, ?GA$';

insert into public.search_terms (term, kind, region_id, note)
select v.term, v.kind, r.id, v.note
from (values
  ('Washington, DC and Harpers Ferry', 'former_name', 'washington-dc', 'The area''s name until 13 October 2026'),
  ('DMV', 'abbreviation', 'washington-dc', 'DC, Maryland and Virginia'),
  ('Richmond', 'alias', 'washington-dc', null),
  ('RVA', 'abbreviation', 'washington-dc', 'Richmond'),
  ('C&O Canal', 'geography', 'washington-dc', null),
  ('Potomac River', 'geography', 'washington-dc', null),
  ('Billy Goat Trail', 'geography', 'washington-dc', null),
  ('Calvert Cliffs', 'geography', 'washington-dc', null),
  ('Chesapeake Bay', 'geography', 'washington-dc', null),
  ('Harpers Ferry', 'alias', 'washington-dc', null),
  ('Delaware Water Gap', 'geography', 'pa-wilds-poconos', null),
  ('Pocono Mountains', 'geography', 'pa-wilds-poconos', null),
  ('Poconos', 'alias', 'pa-wilds-poconos', null),
  ('Pennsylvania Wilds', 'geography', 'pa-wilds-poconos', null),
  ('Quehanna Wild Area', 'geography', 'pa-wilds-poconos', null),
  ('Pine Creek Gorge', 'geography', 'pa-wilds-poconos', null),
  ('Delaware River Valley', 'geography', 'philadelphia', null),
  ('Delaware Valley', 'alias', 'philadelphia', null),
  ('Assateague Island', 'geography', 'hampton-roads', 'Chincoteague side'),
  ('Acadia', 'geography', 'coastal-maine', null),
  ('Mount Desert Island', 'geography', 'coastal-maine', null),
  ('Cadillac Mountain', 'geography', 'coastal-maine', null),
  ('Midcoast Maine', 'alias', 'coastal-maine', null),
  ('Green Mountains', 'geography', 'northern-vermont', null),
  ('Northeast Kingdom', 'geography', 'northern-vermont', null),
  ('Kingdom Trails', 'geography', 'northern-vermont', 'East Burke'),
  ('Long Trail', 'geography', 'northern-vermont', null),
  ('Lake Willoughby', 'geography', 'northern-vermont', null),
  ('Adirondacks', 'geography', 'northern-vermont', 'Lake Placid and the High Peaks'),
  ('High Peaks', 'geography', 'northern-vermont', 'Adirondack High Peaks'),
  ('Presidential Range', 'geography', 'white-mountains', null),
  ('Kancamagus Highway', 'geography', 'white-mountains', null),
  ('Mount Washington', 'geography', 'white-mountains', null),
  ('Cape Cod', 'geography', 'greater-boston', null),
  ('Block Island', 'geography', 'greater-boston', null),
  ('Cuyahoga Valley', 'geography', 'cleveland-akron', null),
  ('Northeast Ohio', 'alias', 'cleveland-akron', null),
  ('North Georgia', 'geography', 'atlanta', null),
  ('Chattahoochee', 'geography', 'atlanta', null),
  ('Middle Tennessee', 'geography', 'nashville', null),
  ('Catskills', 'geography', null, 'Hudson Valley and the Catskills, no area yet'),
  ('Hudson Valley', 'geography', null, 'No area yet'),
  ('Shawangunk Ridge', 'geography', null, 'The Gunks, near New Paltz; no area yet'),
  ('Finger Lakes', 'geography', null, 'No area yet'),
  ('Mid-Atlantic Highlands', 'geography', null, 'Harriman to the Delaware Water Gap'),
  ('Harriman State Park', 'geography', null, 'No area yet'),
  ('Breakneck Ridge', 'geography', null, 'No area yet'),
  ('Jersey Shore', 'geography', null, 'No area yet'),
  ('Fire Island', 'geography', null, 'No area yet'),
  ('Coastal Delaware', 'geography', null, 'No area yet'),
  ('Blackwater National Wildlife Refuge', 'geography', null, 'Maryland''s Eastern Shore; no area yet')
) v(term, kind, slug, note)
left join public.regions r on r.slug = v.slug
on conflict do nothing;
