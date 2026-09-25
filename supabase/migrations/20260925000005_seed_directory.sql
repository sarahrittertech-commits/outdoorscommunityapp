-- The directory for THIS deployment: its region and its categories.
--
-- This is the one migration that differs between deployments. A copy of the
-- board for a different audience or region replaces this file and keeps every
-- other migration unchanged (see docs/cloning.md).
--
-- Order is display order: the home page is curated, not alphabetical.

insert into public.regions (slug, name, timezone) values
  ('western-nc', 'Western North Carolina', 'America/New_York');

insert into public.categories (slug, name, sort_order) values
  ('hiking',      'Hiking & Backpacking', 10),
  ('cycling',     'Cycling',              20),
  ('paddling',    'Paddling',             30),
  ('climbing',    'Climbing',             40),
  ('running',     'Running & Walking',    50),
  ('camping',     'Camping',              60),
  ('snow',        'Snow & Winter',        70),
  ('water',       'Water & Fishing',      80),
  ('nature',      'Nature & Wildlife',    90),
  ('stewardship', 'Stewardship',         100),
  ('skills',      'Skills & Learning',   110);

insert into public.subcategories (category_id, slug, name, sort_order)
select c.id, v.slug, v.name, v.sort_order
from (values
  ('hiking',      'day-hikes',           'Day hikes',               10),
  ('hiking',      'backpacking',         'Backpacking',             20),
  ('hiking',      'waterfalls',          'Waterfalls',              30),
  ('hiking',      'peak-bagging',        'Peak bagging',            40),
  ('cycling',     'road',                'Road',                    10),
  ('cycling',     'gravel',              'Gravel',                  20),
  ('cycling',     'mountain-biking',     'Mountain biking',         30),
  ('cycling',     'casual-rides',        'Family & casual rides',   40),
  ('cycling',     'bikepacking',         'Bikepacking',             50),
  ('paddling',    'kayaking',            'Kayaking',                10),
  ('paddling',    'whitewater',          'Whitewater',              20),
  ('paddling',    'paddleboard',         'Stand-up paddleboard',    30),
  ('paddling',    'canoeing',            'Canoeing',                40),
  ('paddling',    'tubing',              'Tubing',                  50),
  ('climbing',    'bouldering',          'Bouldering',              10),
  ('climbing',    'sport',               'Sport',                   20),
  ('climbing',    'trad',                'Trad',                    30),
  ('climbing',    'indoor',              'Indoor climbing',         40),
  ('running',     'trail-running',       'Trail running',           10),
  ('running',     'road-running',        'Road running',            20),
  ('running',     'walking',             'Walking groups',          30),
  ('camping',     'car-camping',         'Car camping',             10),
  ('camping',     'family-camping',      'Family camping',          20),
  ('camping',     'overlanding',         'Overlanding',             30),
  ('snow',        'ski-snowboard',       'Skiing & snowboarding',   10),
  ('snow',        'snowshoeing',         'Snowshoeing',             20),
  ('snow',        'winter-hiking',       'Winter hiking',           30),
  ('water',       'fly-fishing',         'Fly fishing',             10),
  ('water',       'swimming-holes',      'Swimming holes',          20),
  ('water',       'open-water-swimming', 'Open-water swimming',     30),
  ('nature',      'birding',             'Birding',                 10),
  ('nature',      'foraging',            'Foraging & plants',       20),
  ('nature',      'photography',         'Photography',             30),
  ('nature',      'stargazing',          'Stargazing',              40),
  ('stewardship', 'trail-work',          'Trail work',              10),
  ('stewardship', 'clean-ups',           'Clean-ups',               20),
  ('stewardship', 'conservation',        'Conservation volunteering', 30),
  ('skills',      'navigation',          'Navigation',              10),
  ('skills',      'first-aid',           'Wilderness first aid',    20),
  ('skills',      'leave-no-trace',      'Leave No Trace',          30),
  ('skills',      'beginners',           'Beginners welcome',       40)
) as v (category_slug, slug, name, sort_order)
join public.categories c on c.slug = v.category_slug;
