-- Unclaimed listings from the research workspace (FR-GR-9).
--
-- Run by the operator in the SQL editor (or psql), never by the app. It reads
-- the private `research` schema, which only exists in the operator's
-- database, and copies public facts into the board:
--
--   * groups: a name, a short neutral description written here, an area, an
--     activity, and the organization's own web page (from the research);
--   * events: the title, date, start time and place from each group's public
--     event page, linking back to it.
--
-- Nothing else crosses over: no contact details, prices or research notes.
--
-- Curation: Western North Carolina community groups (clubs, friends groups,
-- trail and conservation nonprofits), marked active, with a public page.
-- Left out: businesses (guides, shops, breweries, gyms), groups outside the
-- region, youth and women-only groups (pending the audience decision in the
-- PRD) and anything unverified. Events: only those with a published start
-- time, from today on, not marked "expected".
--
-- Safe to run again: existing slugs and events are skipped.

begin;

create temporary table listing_picks (
  org_id text primary key,
  slug text not null,
  name text not null,
  subcategory text not null,
  area text not null,
  description text not null,
  source_override text
) on commit drop;

insert into listing_picks (org_id, slug, name, subcategory, area, description, source_override) values
  ('ORG-206', 'asheville-on-bikes', 'Asheville on Bikes', 'road', 'Asheville',
   'Bike advocacy nonprofit in Asheville: community rides and events, and bike-safety classes.', null),
  ('ORG-154', 'black-asheville-run-club', 'Black Asheville Run Club', 'road-running', 'Asheville',
   'Run and walk club in Asheville, meeting at Carrier Park.', null),
  ('ORG-147', 'hendersonville-run-club', 'Hendersonville Run Club', 'road-running', 'Hendersonville',
   'Community run club in Hendersonville.', null),
  ('ORG-142', 'operation-warriorfit-run-club', 'Operation Warriorfit: Asheville Run Club', 'road-running', 'Asheville',
   'Community run club in Asheville.', null),
  ('ORG-157', 'hpd-run-club', 'HPD Run Club', 'road-running', 'Hendersonville',
   'Community run group in Hendersonville, running on the Ecusta Trail.', null),
  ('ORG-182', 'pisgah-trout-unlimited', 'Pisgah Chapter of Trout Unlimited', 'fly-fishing', 'Brevard',
   'The Pisgah chapter of Trout Unlimited: conservation of coldwater streams, and fishing, around Brevard and the Pisgah area.', null),
  ('ORG-095', 'boone-area-cyclists', 'Boone Area Cyclists', 'road', 'Boone',
   'Cycling club in Boone and the High Country, for road and mountain riders.', null),
  ('ORG-117', 'southern-appalachian-bicycle-association', 'Southern Appalachian Bicycle Association', 'mountain-biking', 'Hayesville',
   'Cycling club and trail stewards in Hayesville and the far west of North Carolina, for road and mountain riders.', null),
  ('ORG-105', 'friends-of-panthertown', 'Friends of Panthertown', 'trail-work', 'Panthertown Valley',
   'Volunteer friends group caring for the trails of Panthertown Valley, working with the Forest Service.', null),
  ('ORG-090', 'friends-of-dupont-forest', 'Friends of DuPont Forest', 'conservation', 'DuPont State Forest',
   'Nonprofit friends group supporting DuPont State Recreational Forest.', null),
  ('ORG-051', 'friends-of-connect-buncombe', 'Friends of Connect Buncombe', 'casual-rides', 'Buncombe County',
   'Greenway advocacy nonprofit for Buncombe County.', null),
  ('ORG-134', 'carolina-mountain-club', 'Carolina Mountain Club', 'day-hikes', 'Asheville',
   'Hiking and trail-maintenance club, founded in 1923, with club hikes across Western North Carolina.', null),
  ('ORG-136', 'blue-ridge-hiking-club', 'Blue Ridge Hiking Club', 'day-hikes', 'Boone and Blowing Rock',
   'Informal hiking club in the High Country around Boone and Blowing Rock.', null),
  ('ORG-133', 'pisgah-hikers', 'Pisgah Hikers', 'day-hikes', 'Brevard',
   'Volunteer-led hiking club in Brevard, with weekly hikes in Pisgah and the nearby forests.', null),
  ('ORG-108', 'northwest-nc-mountain-bike-alliance', 'Northwest North Carolina Mountain Bike Alliance', 'mountain-biking', 'Lenoir',
   'Mountain bike trail club, a chapter of IMBA and SORBA, based in Lenoir.', null),
  ('ORG-026', 'conserving-carolina', 'Conserving Carolina', 'conservation', 'Hendersonville',
   'Land trust working across Western North Carolina, with volunteer trail and stewardship days.', null),
  ('ORG-025', 'rutherford-outdoor-coalition', 'Rutherford Outdoor Coalition', 'trail-work', 'Rutherford County',
   'Nonprofit trail group building and caring for trails in Rutherford County.', null),
  ('ORG-072', 'carolina-climbers-coalition', 'Carolina Climbers Coalition', 'conservation', 'North and South Carolina',
   'Nonprofit climbing advocacy group for North and South Carolina since 1995: access, crag stewardship days and gatherings.', null),
  ('ORG-020', 'pisgah-area-sorba', 'Pisgah Area SORBA', 'mountain-biking', 'Brevard and Asheville',
   'Mountain bike club and trail advocacy group for the Pisgah Ranger District, Bent Creek, Brevard and Asheville: volunteer trail days, races and socials.', null),
  ('ORG-164', 'carolina-canoe-club', 'Carolina Canoe Club', 'whitewater', 'North and South Carolina',
   'Canoe and kayak club for North and South Carolina, focused on whitewater.', null),
  ('ORG-159', 'peaks-and-valleys', 'Peaks and Valleys', 'trail-running', 'Asheville',
   'Queer trail running group in Asheville, running at Bent Creek.', null),
  ('ORG-114', 'sons-of-baxter', 'Sons of Baxter', 'mountain-biking', 'Etowah',
   'Mountain bike riding group in Etowah.', null),
  ('ORG-050', 'blue-ridge-bicycle-club', 'Blue Ridge Bicycle Club', 'road', 'Asheville',
   'Road cycling club, the largest in Western North Carolina, with weekly group rides.', null),
  ('ORG-156', 'asheville-running-collective', 'Asheville Running Collective', 'road-running', 'Asheville',
   'Run club in Asheville''s River Arts District.', null),
  ('ORG-116', 'nantahala-area-sorba', 'Nantahala Area SORBA', 'mountain-biking', 'Robbinsville',
   'SORBA chapter caring for mountain bike trails around Robbinsville and the Nantahala area.', null),
  ('ORG-144', 'asheville-runners', 'Asheville Runners', 'road-running', 'Asheville',
   'Social run club in Asheville, organized on Meetup.', null),
  ('ORG-086', 'friends-of-gorges-state-park', 'Friends of Gorges State Park', 'conservation', 'Sapphire',
   'Nonprofit friends group for Gorges State Park: park programs, volunteers and an annual festival.', null),
  ('ORG-143', 'nc-mountain-trail-runners', 'North Carolina Mountain Trail Runners', 'trail-running', 'Asheville',
   'Trail running group in Asheville, running at Bent Creek.', null),
  ('ORG-161', 'brevard-trail-runners', 'Brevard Trail Runners', 'trail-running', 'Brevard',
   'Trail running group in Brevard.', null),
  ('ORG-165', 'wacko', 'WACKO: West Asheville Canoe & Kayak Organization', 'whitewater', 'West Asheville',
   'Community whitewater paddling club in West Asheville.', null),
  ('ORG-075', 'nc-bipoc-climbers', 'NC BIPOC Climbers', 'indoor', 'Asheville',
   'Climbing group for Black, Indigenous and people of color climbers, with a monthly meetup in Asheville.',
   'https://cultivateclimbing.com/programs/community-programs/'),
  ('ORG-085', 'the-pisgah-conservancy', 'The Pisgah Conservancy', 'trail-work', 'Brevard',
   'Nonprofit partner of the Forest Service in Pisgah: volunteer days, workshops and trail care.', null),
  ('ORG-221', 'catalyst-sports-asheville', 'Catalyst Sports Asheville', 'mountain-biking', 'Asheville',
   'Asheville chapter of an adaptive adventure sports nonprofit, open to adaptive athletes and volunteers.', null),
  ('ORG-184', 'mountaintrue', 'MountainTrue', 'conservation', 'Western North Carolina',
   'Environmental nonprofit for Western North Carolina, home of the French Broad Riverkeeper.', null);

insert into public.groups (slug, name, description, subcategory_id, region_id, area, discussions_enabled, is_unclaimed, source_url)
select p.slug, p.name, p.description, s.id, r.id, p.area, false, true,
       coalesce(p.source_override, o.website, o.source_listing_url)
from listing_picks p
join research.organizations o on o.org_id = p.org_id
join public.subcategories s on s.slug = p.subcategory
cross join (select id from public.regions where slug = 'western-nc') r
where coalesce(p.source_override, o.website, o.source_listing_url) ~ '^https?://'
on conflict (slug) do nothing;

-- Events: the first picked group among each event's organizers hosts it.
with candidates as (
  select
    e.event_id,
    e.name,
    e.url,
    e.booking_url,
    e.start_date,
    coalesce(e.end_date, e.start_date) as end_date,
    substring(e.start_time from '(\d{1,2}:\d{2}\s*[AaPp][Mm])') as start_t,
    substring(e.end_time from '(\d{1,2}:\d{2}\s*[AaPp][Mm])') as end_t,
    -- Drop the research's internal codes and reminders ("(PLC-043)", "(confirm location)").
    btrim(regexp_replace(coalesce(e.venue, ''), '\s*\(((PLC|ORG)-\d+|confirm[^)]*|verify[^)]*)\)', '', 'gi')) as venue,
    (select g.id from unnest(e.organizer_ids) with ordinality as u(org_id, n)
       join listing_picks p on p.org_id = u.org_id
       join public.groups g on g.slug = p.slug and g.is_unclaimed
     order by u.n limit 1) as group_id
  from research.events e
  where e.start_date >= (now() at time zone 'America/New_York')::date
    and coalesce(e.status, '') !~* 'expected|past'
    and e.name !~* 'expected'
),
timed as (
  select c.*,
    ((c.start_date + c.start_t::time) at time zone 'America/New_York') as starts_at,
    case when c.end_t is not null
      then ((c.end_date + c.end_t::time) at time zone 'America/New_York')
    end as listed_end
  from candidates c
  where c.start_t is not null and c.group_id is not null
    and c.venue !~* 'out of region'
)
insert into public.events (group_id, title, description, starts_at, ends_at, timezone, location_name, address_visibility, source_url)
select
  t.group_id,
  left(t.name, 120),
  'Listed from the organizer''s public event page. Check there for details and how to sign up.'
    || case when t.listed_end is null or t.listed_end <= t.starts_at then ' End time not listed.' else '' end,
  t.starts_at,
  case when t.listed_end > t.starts_at then t.listed_end else t.starts_at + interval '3 hours' end,
  'America/New_York',
  left(case when t.venue ~* 'not listed' or char_length(t.venue) < 2 then 'See the event page' else t.venue end, 200),
  'public',
  coalesce(t.url, t.booking_url)
from timed t
where coalesce(t.url, t.booking_url) ~ '^https?://'
  and not exists (
    select 1 from public.events x
    where x.group_id = t.group_id and x.title = left(t.name, 120) and x.starts_at = t.starts_at
  );

select
  (select count(*) from public.groups where is_unclaimed) as listed_groups,
  (select count(*) from public.events e join public.groups g on g.id = e.group_id where g.is_unclaimed) as listed_events;

commit;
