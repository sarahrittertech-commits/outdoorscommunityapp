-- 13 October 2026, Sarah: destinations from Maine showed under "All of the
-- Southeast". Two causes: the map read "Augusta, GA" as Augusta, Maine (the
-- town matcher now respects the state and the listing's own area), and a few
-- listings were filed in the wrong area by earlier research. This re-files
-- those by the town and state in their area text.
with moves(pattern, from_slug, to_slug) as (values
  ('^Atlanta,? GA$', 'western-nc', 'atlanta'),
  ('^North Georgia \(Dahlonega\)$', 'western-nc', 'atlanta'),
  ('^Copper Harbor, Michigan$', 'western-nc', 'marquette'),
  ('^Red River Gorge, Kentucky$', 'western-nc', 'bluegrass'),
  ('^Columbia,? SC$', 'western-nc', 'charlotte'),
  ('^Johnson City, TN$', 'western-nc', 'east-tennessee'),
  ('^Bryson City, NC$', 'east-tennessee', 'western-nc'),
  ('^Robbinsville, NC$', 'east-tennessee', 'western-nc')
), g as (
  update public.groups x set region_id = (select id from public.regions where slug = m.to_slug)
  from moves m
  where btrim(x.area) ~ m.pattern and x.region_id = (select id from public.regions where slug = m.from_slug)
  returning 1
)
update public.businesses x set region_id = (select id from public.regions where slug = m.to_slug)
from moves m
where btrim(x.area) ~ m.pattern and x.region_id = (select id from public.regions where slug = m.from_slug);
