-- Demo data for local development and the launch walkthrough
-- (docs/use-cases.md, "Journeys the seed data must cover").
--
-- Loaded by `supabase db reset` locally. NEVER run against production: the
-- people and groups here are made up, although the places are real.
--
-- Sign in locally as any of these addresses; the sign-in link arrives in the
-- local mail catcher (http://127.0.0.1:54324).

-- People ------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000', v.id::uuid, 'authenticated', 'authenticated', v.email, '',
  now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', now(), now()
from (values
  ('11111111-1111-4111-8111-000000000001', 'maya@example.com'),
  ('11111111-1111-4111-8111-000000000002', 'tom@example.com'),
  ('11111111-1111-4111-8111-000000000003', 'priya@example.com'),
  ('11111111-1111-4111-8111-000000000004', 'jordan@example.com'),
  ('11111111-1111-4111-8111-000000000005', 'eli@example.com'),
  ('11111111-1111-4111-8111-000000000006', 'rosa@example.com'),
  ('11111111-1111-4111-8111-000000000007', 'admin@example.com')
) as v (id, email);

update public.profiles p set display_name = v.name, area = v.area, bio = v.bio
from (values
  ('11111111-1111-4111-8111-000000000001', 'Maya R.', 'Brevard', 'Paddler, occasional hiker, full-time dog walker.'),
  ('11111111-1111-4111-8111-000000000002', 'Tom K.', 'Pisgah Forest', 'Trail runner. Slow on the ups.'),
  ('11111111-1111-4111-8111-000000000003', 'Priya S.', 'Asheville', 'Gravel rides and good coffee.'),
  ('11111111-1111-4111-8111-000000000004', 'Jordan L.', 'Hendersonville', null),
  ('11111111-1111-4111-8111-000000000005', 'Eli W.', 'Brevard', 'Birds, mostly.'),
  ('11111111-1111-4111-8111-000000000006', 'Rosa M.', 'Rosman', 'New to the area. Say hi.'),
  ('11111111-1111-4111-8111-000000000007', 'Site Admin', null, null)
) as v (id, name, area, bio)
where p.id = v.id::uuid;

update public.accounts set accepted_terms_at = now();
update public.accounts set is_site_admin = true where id = '11111111-1111-4111-8111-000000000007';

-- Groups --------------------------------------------------------------------------
-- created_by becomes the owner automatically.

insert into public.groups (id, slug, name, description, rules, subcategory_id, region_id, area, join_policy, join_question, discussions_enabled, created_by)
select v.id::uuid, v.slug, v.name, v.description, v.rules, s.id, r.id, v.area, v.policy::public.join_policy, v.question, v.discussions, v.owner::uuid
from (values
  ('22222222-2222-4222-8222-000000000001', 'brevard-saturday-paddlers', 'Brevard Saturday Paddlers', 'paddling', 'kayaking',
   'Flatwater and easy moving water on the French Broad, most Saturday mornings from spring to fall. Bring your own boat; we can point you to rentals.',
   'PFDs on the water, always. Nobody gets left at the take-out.', 'Brevard', 'approval', 'What boat do you paddle, and how much river experience do you have?', true,
   '11111111-1111-4111-8111-000000000001'),
  ('22222222-2222-4222-8222-000000000002', 'pisgah-trail-runners', 'Pisgah Trail Runners', 'running', 'trail-running',
   'Weekly group runs in Pisgah National Forest. All paces; we regroup at every junction.',
   null, 'Pisgah Forest', 'open', null, true,
   '11111111-1111-4111-8111-000000000002'),
  ('22222222-2222-4222-8222-000000000003', 'dupont-day-hikers', 'DuPont Forest Day Hikers', 'hiking', 'day-hikes',
   'Moderate day hikes in DuPont State Recreational Forest: Triple Falls, Hooker Falls, Stone Mountain and the lakes.',
   'Leave No Trace. Dogs on leash.', 'Cedar Mountain', 'open', null, true,
   '11111111-1111-4111-8111-000000000001'),
  ('22222222-2222-4222-8222-000000000004', 'weekday-wanderers', 'Weekday Wanderers', 'hiking', 'day-hikes',
   'Short weekday hikes for people with flexible schedules. Two to five miles, lots of stops.',
   null, 'Brevard', 'open', null, true,
   '11111111-1111-4111-8111-000000000006'),
  ('22222222-2222-4222-8222-000000000005', 'sunrise-summit-club', 'Sunrise Summit Club', 'hiking', 'day-hikes',
   'Early starts to catch sunrise from Looking Glass, John Rock and friends. Headlamps required.',
   null, 'Brevard', 'open', null, true,
   '11111111-1111-4111-8111-000000000002'),
  ('22222222-2222-4222-8222-000000000006', 'asheville-gravel-collective', 'Asheville Gravel Collective', 'cycling', 'gravel',
   'No-drop gravel rides on forest service roads around Asheville and the Pisgah Ranger District.',
   'No-drop means no-drop.', 'Asheville', 'open', null, true,
   '11111111-1111-4111-8111-000000000003'),
  ('22222222-2222-4222-8222-000000000007', 'brevard-family-bike-rides', 'Brevard Family Bike Rides', 'cycling', 'casual-rides',
   'Easy rides on the Estatoe Trail for families and anyone who likes ice cream at the end.',
   null, 'Brevard', 'open', null, false,
   '11111111-1111-4111-8111-000000000004'),
  ('22222222-2222-4222-8222-000000000008', 'transylvania-birders', 'Transylvania County Birders', 'nature', 'birding',
   'Monthly bird walks and a spring warbler weekend. Binoculars to lend.',
   null, 'Brevard', 'open', null, true,
   '11111111-1111-4111-8111-000000000005'),
  ('22222222-2222-4222-8222-000000000009', 'blue-ridge-trail-crew', 'Blue Ridge Trail Crew', 'stewardship', 'trail-work',
   'Volunteer trail maintenance days with local land managers. Tools and training provided.',
   null, 'Pisgah Forest', 'approval', 'Have you done trail work before? (No experience is fine.)', true,
   '11111111-1111-4111-8111-000000000005'),
  ('22222222-2222-4222-8222-000000000010', 'hendersonville-beginner-climbers', 'Hendersonville Beginner Climbers', 'climbing', 'indoor',
   'Meet-ups at the gym for new climbers, with the occasional trip outside to Rumbling Bald.',
   null, 'Hendersonville', 'open', null, true,
   '11111111-1111-4111-8111-000000000004')
) as v (id, slug, name, category_slug, subcategory_slug, description, rules, area, policy, question, discussions, owner)
join public.categories c on c.slug = v.category_slug
join public.subcategories s on s.category_id = c.id and s.slug = v.subcategory_slug
cross join (select id from public.regions where slug = 'western-nc') r;

-- Memberships beyond the owners.
insert into public.group_members (group_id, user_id, role, status) values
  ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000002', 'admin', 'active'),
  ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000005', 'admin', 'active'),
  ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000003', 'member', 'active'),
  ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000006', 'member', 'pending'),
  ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-000000000001', 'member', 'active'),
  ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-000000000006', 'member', 'active'),
  ('22222222-2222-4222-8222-000000000003', '11111111-1111-4111-8111-000000000006', 'member', 'active'),
  ('22222222-2222-4222-8222-000000000003', '11111111-1111-4111-8111-000000000005', 'member', 'active'),
  ('22222222-2222-4222-8222-000000000006', '11111111-1111-4111-8111-000000000002', 'member', 'active'),
  ('22222222-2222-4222-8222-000000000008', '11111111-1111-4111-8111-000000000001', 'member', 'active');

-- Events ----------------------------------------------------------------------------

insert into public.events (id, group_id, title, description, starts_at, ends_at, timezone, location_name, address_visibility, capacity, created_by)
values
  ('33333333-3333-4333-8333-000000000001', '22222222-2222-4222-8222-000000000001',
   'French Broad float: Hap Simpson to Island Ford',
   'About 6 river miles, flat water with a couple of riffles. We run a shuttle; tell us in the thread if you can drive.',
   date_trunc('day', now()) + interval '5 days 13 hours', date_trunc('day', now()) + interval '5 days 17 hours',
   'America/New_York', 'Hap Simpson Park put-in', 'members', 12, '11111111-1111-4111-8111-000000000001'),
  ('33333333-3333-4333-8333-000000000002', '22222222-2222-4222-8222-000000000002',
   'Tuesday night run: Black Mountain Trail',
   'Out-and-back, 6 miles, headlamps after sunset.',
   date_trunc('day', now()) + interval '3 days 22 hours', date_trunc('day', now()) + interval '3 days 23 hours 30 minutes',
   'America/New_York', 'Pisgah Ranger Station', 'public', null, '11111111-1111-4111-8111-000000000002'),
  ('33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-000000000003',
   'Triple Falls and Hooker Falls loop',
   '3.5 miles, moderate. Crowded after 11am, so we start early.',
   date_trunc('day', now()) + interval '6 days 13 hours', date_trunc('day', now()) + interval '6 days 16 hours',
   'America/New_York', 'Hooker Falls parking area', 'public', 20, '11111111-1111-4111-8111-000000000001'),
  ('33333333-3333-4333-8333-000000000004', '22222222-2222-4222-8222-000000000008',
   'Spring warbler walk',
   'Slow walk, lots of looking up. Beginners very welcome.',
   date_trunc('day', now()) + interval '10 days 11 hours', date_trunc('day', now()) + interval '10 days 14 hours',
   'America/New_York', 'Bracken Mountain Preserve', 'public', 15, '11111111-1111-4111-8111-000000000005'),
  ('33333333-3333-4333-8333-000000000005', '22222222-2222-4222-8222-000000000003',
   'Stone Mountain loop',
   'A past event, so group pages show history.',
   date_trunc('day', now()) - interval '8 days' + interval '13 hours', date_trunc('day', now()) - interval '8 days' + interval '17 hours',
   'America/New_York', 'Corn Mill Shoals parking', 'public', null, '11111111-1111-4111-8111-000000000001');

insert into public.event_private_details (event_id, address) values
  ('33333333-3333-4333-8333-000000000001', '1 Hap Simpson Park Rd, Brevard, NC'),
  ('33333333-3333-4333-8333-000000000002', '1600 Pisgah Hwy, Pisgah Forest, NC'),
  ('33333333-3333-4333-8333-000000000003', 'Staton Rd, Cedar Mountain, NC'),
  ('33333333-3333-4333-8333-000000000004', 'Bracken Mountain Trailhead, Brevard, NC');

insert into public.event_rsvps (event_id, user_id, status) values
  ('33333333-3333-4333-8333-000000000001', '11111111-1111-4111-8111-000000000001', 'going'),
  ('33333333-3333-4333-8333-000000000001', '11111111-1111-4111-8111-000000000003', 'going'),
  ('33333333-3333-4333-8333-000000000002', '11111111-1111-4111-8111-000000000006', 'going'),
  ('33333333-3333-4333-8333-000000000003', '11111111-1111-4111-8111-000000000005', 'going');

-- Discussions -------------------------------------------------------------------------

insert into public.threads (id, group_id, author_id, title, body) values
  ('44444444-4444-4444-8444-000000000001', '22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000003',
   'Shuttle drivers for Saturday?', 'I can take two boats on my roof. Anyone else driving?'),
  ('44444444-4444-4444-8444-000000000002', '22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000001',
   'Water levels this season', 'Checking the USGS gauge at Blantyre before each trip. Anything under 3 ft is a gentle float.');

update public.threads set is_pinned = true where id = '44444444-4444-4444-8444-000000000002';

insert into public.replies (thread_id, author_id, body) values
  ('44444444-4444-4444-8444-000000000001', '11111111-1111-4111-8111-000000000002', 'I can drive. Room for one boat.'),
  ('44444444-4444-4444-8444-000000000001', '11111111-1111-4111-8111-000000000001', 'Thanks both. That covers it.');
