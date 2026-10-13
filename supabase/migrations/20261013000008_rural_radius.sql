-- 13 October 2026, Sarah: be flexible with the 100-mile radius. Groups in
-- rural areas, especially in the West, draw people from much farther than
-- groups near big cities. Rural Western and North Woods areas get 150 miles;
-- city areas keep 100. (FR-RG-13)
update public.regions set radius_miles = 150
 where slug in ('missoula', 'bozeman', 'jackson-hole', 'boise-sun-valley', 'moab-grand-junction', 'zion-kanab', 'durango-san-juans', 'sedona-flagstaff', 'central-oregon', 'duluth', 'marquette');
