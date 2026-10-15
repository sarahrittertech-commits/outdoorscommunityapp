---
sidebar_position: 2.4
title: Research and areas — findings
---

# Research and areas — findings

*Written 15 October 2026. What 12 to 14 October taught about research,
event sources and how to carve the country into areas. The earlier
[research playbook](./research-playbook) covers 12 October alone; this
note covers the expansion from 11 regions to 45 areas in 8 big regions.*

## Where the board stands

| | Count |
| --- | --- |
| Live areas | 45, in all 8 big regions |
| Communities listed | 1,121 (168 with no area yet, UC-41) |
| Guides, shops, venues and event companies | 887 (122 with no area yet) |
| Upcoming events | about 2,600 |
| Event sources the weekly reader watches | 3,551 (64 of them calendar feeds) |
| Research finds kept | 2,399 (446 not listed: unverified, failed or waiting) |
| Search terms (old names, nicknames, traditional regions) | 96 |
| Database permission tests | about 1,000, plus 217 unit tests |

Areas per big region: Southeast 10, Mid-Atlantic 9, Rockies 7, Midwest 5,
Northeast 4, Far West 4, Southwest 3, Pacific Northwest 3.

## How the areas were grouped

Sarah's grouping decisions, 13 October 2026, now in the database and
[ADR-0012](./architecture/adr-0012-region-groups):

- **Two levels.** Big regions (Southeast, Mid-Atlantic, Northeast,
  Midwest, Rockies, Southwest, Far West, Pacific Northwest), each with
  local areas. On the site the big level is a *region*, the local one an
  *area*.
- **Western Carolinas** (was Western North Carolina) takes in Greenville
  and the Upstate. The slug stays `western-nc` so saved links work.
- **Coastal Carolinas**: the Outer Banks, Wilmington, Charleston, Hilton
  Head and Savannah, one area with a 250-mile radius. Virginia's side
  stays Mid-Atlantic as Hampton Roads and the Eastern Shore.
- **Washington, DC, Richmond and Annapolis** together, with Northern
  Virginia and Harpers Ferry.
- **Atlanta, Athens and North Georgia** (Helen, Dahlonega);
  **Birmingham and North Alabama**; **Florida** as one area (few clubs,
  no mountains); **Nashville and Middle Tennessee** in the Southeast.
- **Cleveland, Akron and the Cuyahoga Valley**, the **Pennsylvania Wilds
  and the Poconos**, and **Philadelphia** in the Mid-Atlantic.
- **Acadia and Midcoast Maine** in the Northeast; the Adirondacks stay
  with Burlington and Northern Vermont.
- **Radius fits the place** (FR-RG-13): cities about 100 miles; rural
  Western and North Woods areas 150; a long coast or a whole state up to
  250. Towns listed for an area may sit up to its radius plus 50 miles
  from the centre.
- **Not in an area yet** (UC-41, FR-RG-14): a verified community in a
  town with no open area is still listed and found by zip code and town;
  the site admin groups it later from Admin › Ungrouped.

Calls made along the way, worth revisiting:

- **Nashville is its own area**, not part of East Tennessee: it is on
  Central time, and an area's time zone is the default for its groups'
  events.
- **Philadelphia sits in the Mid-Atlantic** with Pittsburgh and
  Cleveland, though Sarah listed it among the Northeast's big cities.
- **Missoula and Bozeman are separate areas** (200 miles apart), as are
  Jackson Hole (with Cody) and Boise, McCall and Sun Valley.
- **Ozarks** are filed under the Southeast; Texas, the Plains and Alaska
  have no big region yet.

## Lessons from opening 34 areas in two days

- **Split on distance, not on a list's heading.** "Montana and Wyoming"
  or "Lake Superior" read as one place but span 200+ miles; areas were
  drawn where the towns with verified groups cluster.
- **Every area needs at least 20 towns** (a test), each within its
  radius plus 50 miles, plus zip codes so the location search knows it.
- **A town name used in two states needs its state everywhere.** Adding
  Augusta, Maine put every "Augusta, GA" listing and its events in Maine
  on the destinations map, because the matcher fell back to the bare
  name. Since 13 October the matcher respects a stated state and,
  without one, prefers the town in the listing's own area (it gives no
  pin rather than a distant one). Watch Lexington, Portland, Columbia,
  Jackson, Woodstock, Richmond, Augusta, Concord and Fayetteville.
- **Misfiled listings are easy to make in bulk.** Run the audit in the
  runbook (*Checking where listings sit*) after any batch load.
- **A merged or renamed area keeps its old names** in `search_terms`
  (Western North Carolina, WNC, Lowcountry, OBX, NOVA), for search and
  SEO later.

## Research: what worked

- **Agent town sweeps** (one agent per group of towns, shared rules,
  results as JSON lines, loaded through `research.add_candidate`) found
  about 1,100 organizations in a night. Verification means the
  organization's own site loaded and named it; Meetup pages count.
- **Calendar feeds beat everything.** WordPress sites using The Events
  Calendar answer `<site>/events/?ical=1`; public Google Calendars
  publish `basic.ics`. One feed is a whole season of dated events with
  no AI. Always ask for the feed when researching.
- **The web-search allowance is shared** by every agent in one turn
  (about 200 searches). Nine agents at once ran it dry; the last towns
  came out thin (Cody, Glenwood Springs, the Black Hills, Grand Rapids,
  Chicago, Minneapolis). Run at most five or six at a time, or spread
  them over turns.
- **Organizations rename.** Many Audubon chapters are now Bird
  Alliances (Tucson, Birds Georgia, Southern Wisconsin, Chicago, Central
  New Mexico); old domains redirect.
- **Lapsed club domains turn into spam.** About 25 former club addresses
  now serve gambling, crypto or for-sale pages (for example
  clarksvillecycling.com, duluthaudubon.org, earthtreksclimbing.com,
  stonesummit.com, wakekayak.org, bostonrockgym.com). Never guess a
  domain; a site that doesn't load and name the organization stays
  unverified.
- **National directories help confirm chapters.** The American Alpine
  Club's chapters page confirmed 19 chapters at once (Atlanta, Austin,
  Bozeman, Chicago, Denver, Fresno, the Gunks, Los Angeles, Miami,
  Montana, New York City, North Texas, Northern Sierra, San Diego,
  Triangle, Twin Cities, Washington DC, West Michigan).

## Research: what to avoid

- **AI-written event lists are invented.** Four Gemini event files on
  12 October were entirely fabricated (templated names, domains that
  don't resolve). Only events read from an organizer's own page, a
  public calendar feed or a recognised sign-up site reach the board.
- **Events fail closed.** An event without `verification` is kept, not
  published; times need an offset or a known time zone
  ([migration 20261012000010](https://github.com/sarahrittertech-commits/outdoorscommunityapp/blob/main/supabase/migrations/20261012000010_research_review_fixes.sql)).
- **Keep every find** (FR-RS-13): unverified and failed checks are stored
  with the reason, so nobody pays to research them twice.
- **People's personal contact details are not collected.** Outreach goes
  through organizations' public channels and an opt-in list.
- **Affinity groups are complete, not featured.** Research always runs an
  affinity pass (FR-RS-11, FR-RS-12); the site lists those groups like any
  other and never spotlights them.

## The weekly source reader: rules learned

From the 12 October night run (the board went from 477 to 2,318 events,
cleaned to about 1,430) and the 13 October runs (2,072 sources read, 496
new events):

- **Rolling window:** at most the next six dates of a repeating event per
  host (a weekly ride, a daily museum program); later dates stay in
  research.
- **Midnight starts are all-day events**, kept as date-only, not shown.
- **A zero UTC offset on a WordPress site usually means local time.**
- **A state named in a title or place** ("Butte, MT") outside the area's
  nearby states means the event is out of area.
- **Statewide calendars** (state parks) publish only events at parks or
  towns inside an area's radius.
- **Retire calendars that are mostly indoor or not outdoors** (planetarium
  shows, town tourism calendars).
- **Listings with no area aren't read yet**: an area gives events their
  time zone. Their events start once they're assigned an area.
- **Some sites block GitHub's runners** (Outdoor Knoxville, Legacy Parks);
  read those from a laptop and send the results the same way.

## What's next

- **Review the ungrouped listings** (Admin › Ungrouped). New York City
  (29), the Hudson Valley and Catskills (26), Cincinnati (16) and the
  Seacoast of New Hampshire (12) are big enough to open as areas.
- **Second research pass** for the thin areas: Minneapolis, Marquette,
  Moab, Missoula, Wilmington, Hampton Roads, Cody, the Black Hills.
- **Use `search_terms`** in search and tagging (not built yet).
- **States as a filter**, if wanted: most areas cross a state line, so a
  state is better as a filter within a big region than as a level. Needs
  a use case first.
