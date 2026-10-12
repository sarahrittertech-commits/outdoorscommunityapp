# Research prompts for Gemini (one city at a time)

Sarah researches each city before its region opens (UC-35). Run these in
Gemini, preferably with **Deep Research** so it opens and checks the pages,
once per city: the groups prompt first, then the events prompt with the
hosts it found. Save each answer as a CSV and load it with
`node scripts/research/load.mjs --append` after converting it to the
research format (see the [runbook](../../docs/runbook.md#opening-a-region)).

## Why they are shaped this way

Lessons from the 10–11 October lists:

- **One city per run.** Asking for many cities returns 8 to 10 rows each.
- **One real organization per row,** under its official name. No "X & Y" rows.
- **Every row needs links.** Each row carries a website, a separate
  `source_url`, Instagram, Facebook and any other public pages that mention
  the group (`other_sources`). The board refuses candidates without a link,
  and some links in AI output are guessed.
- **Strict confidence.** Most rows shouldn't be high.
- **No people's names, emails or phone numbers** (FR-RS-2).
- **Local chapters need their own page.** A national network's local chapter
  is listed only with a page for that chapter. The Asheville run listed
  "Outdoor Afro North Carolina" from the national homepage alone.
- **Big and everyday groups first, then the affinity pass.** The old prompt
  put the affinity pass first. That fixed Dirt Skrrts going missing, but the
  Front Range lists that came back on 11 October were mostly affinity
  groups. They also missed the region's big clubs, races and festivals.
  Affinity groups must be complete but not featured (PRD P8), so they now
  get their own required pass with the same rigor, after the anchors, and
  the answer reports coverage per activity so a lopsided list shows.
- **Activities use the board's subcategories.** The old prompt asked only
  about hiking, climbing and mountain biking, so paddling, road and gravel
  cycling, running, snow sports, fishing and stewardship never came back.
  `activities` now uses the board's subcategory slugs, so rows map straight
  onto the directory.
- **No target counts.** A model asked for 15 returns exactly 15. Instead it
  keeps searching until searches stop finding new groups, and checks each
  activity for gaps.
- **Future dates must be published.** The Rattler races came back dated
  2027 because last year's date was moved forward a year. A date has to
  appear on a page.
- **Members-only trips are marked.** Colorado Mountain Club lists dozens
  of trips that need membership. `open_to` marks them, so the board doesn't
  advertise something a visitor can't join.

Fill in the bracketed lists for each city from what you already know. Name
a few big groups and a few affinity groups you'd expect to see. The model
checks each one and searches past them.

## Groups prompt

```text
You are building a research dataset for a community board of outdoor groups. Work on ONE target city: [CITY, STATE]. Radius: 100 miles.

The board lists every kind of outdoor community: hiking and backpacking, cycling (road, gravel, mountain, casual, bikepacking), paddling, climbing, running and walking, camping, snow and winter sports, fishing and swimming, nature and wildlife, trail work and conservation, and outdoor skills courses.

Work in four passes, and put all rows in one CSV.

PASS 1 — ANCHORS. The organizations most local outdoor people already know: the large, long-running clubs and the region's chapters of national ones (for example a Colorado Mountain Club or Mountaineers branch, Sierra Club outings group, Appalachian Mountain Club chapter, IMBA or SORBA chapter, local climbing organization, Audubon chapter, Trout Unlimited chapter, paddling club, ski club, running club, cycling club or racing team), the trail and conservation nonprofits, university outdoor programs open to the public, the major climbing gyms, bike parks, ski areas and public lands people use, and the shops and outfitters that run group rides, classes or trips. Start with these if they are active: [KNOWN MAJOR GROUPS — e.g. for Denver: Colorado Mountain Club Denver Group, COMBA, Front Range Climbing Company, Colorado Trail Foundation, Denver Audubon].

PASS 2 — EVERYDAY COMMUNITY. Meetup groups, shop and brewery group rides, run clubs, gym clubs, paddling meetups, hiking groups for families, seniors or newcomers, and volunteer crews. Search Meetup, shop and gym event pages, park and recreation department calendars, and public Facebook groups.

PASS 3 — AFFINITY GROUPS (required, same rules as everything else). Women's, girls', FTWN-B, queer and LGBTQ+, BIPOC and adaptive or disability-inclusive groups for any of these activities. Many live mainly on Instagram or Facebook, so search public pages there, Meetup, and gym and shop event pages, plus local chapters of national networks (Trail Sisters, Ladies Climbing Coalition, Radical Adventure Riders, Brown Girls Climb, Outdoor Afro, Latino Outdoors, Unlikely Hikers, Catalyst Sports, SheJumps, Women's MTB Network, Girls Go Shred). Groups that live on Instagram count: use the Instagram page as the website. List a national network's chapter ONLY if you find a page for that chapter; a national homepage is not evidence of a local group. Make sure these are included if they are active: [KNOWN AFFINITY GROUPS].

PASS 4 — GAPS. Count rows per activity category. For any category with fewer than three rows, run at least two more searches for it (for example "[CITY] kayak club", "[CITY] trail running group", "[CITY] fly fishing club", "[CITY] birding group") and add what you find, or say under "Likely missing" that you found none.

Rules:
1. One real organization or place per row. Never combine two into one row ("X & Y"). Use the official name as it appears on its own website.
2. Do not invent anything. If you can't confirm something exists and is active, leave it out. If you can't find a field, leave it blank rather than guessing.
3. Open each website before you list it. "website" is the official homepage (not a deep link or a directory). "source_url" is the page where you confirmed the details. Give every source you used: Instagram and Facebook in their own columns, and any other public pages that mention the organization (Meetup, a gym or shop event page, a news story, a national network's chapter page) in "other_sources". Only pages anyone can read without signing in.
4. If an organization is nearer another major city but within 100 miles, still list it once here, with its actual town and distance.
5. Description: 1–2 factual sentences in your own words, at most 300 characters. No marketing words (premier, legendary, world-class, best). Say what they do and where.
6. No people's names, email addresses or phone numbers, ever.
7. Skip national chains' general pages, closed businesses, and anything only on a private or sign-in page.
8. There is no target number. Keep searching until new searches stop turning up new organizations.
9. At the end, after the code block, write:
   - "Found: N rows — N anchors, N everyday, N affinity; N groups, N venues, N businesses."
   - "Per category:" with a count for each of the eleven categories.
   - "Searches I ran:" with every search query.
   - "Likely missing:" with what you couldn't cover.

Output: a CSV in a single code block, every field quoted, with exactly this header:

"pass","kind","name","type","activities","audience","town","state","target_city","approx_miles","website","source_url","instagram","facebook","other_sources","scale","description","recent_activity","confidence"

- pass: anchor | everyday | affinity
- kind: group | venue | business
- type: one of: club, chapter of a national club, trail or conservation organization, meetup group, university program, racing team, women's group, inclusive group, trail system, bike park, park or forest, crag, climbing gym, ski area, bike shop, outfitter, paddle shop, guide service
- activities: semicolon-separated, only from: day-hikes; backpacking; waterfalls; peak-bagging; road; gravel; mountain-biking; casual-rides; bikepacking; kayaking; whitewater; paddleboard; canoeing; tubing; bouldering; sport; trad; indoor; trail-running; road-running; walking; car-camping; family-camping; overlanding; ski-snowboard; snowshoeing; winter-hiking; fly-fishing; swimming-holes; open-water-swimming; birding; foraging; photography; stargazing; trail-work; clean-ups; conservation; navigation; first-aid; leave-no-trace; beginners
- audience: semicolon-separated: everyone | women | queer | bipoc | adaptive | youth | families | seniors | students
- scale: one fact that shows size or age, copied from a page ("founded 1912", "1,600 Meetup members", "weekly rides since 2009"), else blank
- recent_activity: the most recent dated post, event or update you saw (YYYY-MM), else blank
- confidence: high (its own website or page shows activity in the last 12 months) | medium (it exists, but you could only see third-party pages, or nothing recent) | low (couldn't confirm). Be strict: most rows should not be high.

If the CSV is too long for one answer, stop after a complete row and write CONTINUE; I'll reply "continue" and you carry on without repeating rows.
```

## Events prompt

Events go out of date, and AI tools fill gaps with invented links. The 11
October Boone list cited one race page for eleven different events. So
this prompt works from the **hosts**, wants each event's own page with the
date copied from it word for word, and leaves out dates no page shows.

**Paste in the real host list every time.** The 11 October Denver events
run was given no host list. It came back with ski area openings, a Kansas
City race company, and links to an Eventbrite search page and a ski
conditions site. The same night's groups run had found ten Denver clubs
with their own event calendars, and the events run checked none of them.
So the prompt now:

- starts from a host list taken from the board itself (the query below);
- reports every host it checked, including the ones with nothing coming up;
- takes only links on the host's own site or a registration page naming
  the host, never a search page, listing site or news story;
- needs a start time copied from the page;
- keeps new hosts in their own pass, so they can be added before their
  events go on.

Events load into the private research tables as unverified. The board
shows an event only once its group is listed and the event checks out
(FR-RS-8). To check a row, open `event_url` and look for `date_quote`.

### 1. Get the host list from the board

Run this in the Supabase SQL editor, with the region's slug
(`front-range`, `wasatch`, `new-river-gorge` and so on). Paste the first
result into ORGANIZATIONS and the second into SHOPS AND GUIDES.

```sql
select string_agg(format('%s — %s', g.name, coalesce(g.website, g.source_url)), E'\n' order by g.name) as organizations
from public.groups g join public.regions r on r.id = g.region_id
where r.slug = 'front-range' and g.status = 'active' and g.review_status = 'approved';

select string_agg(format('%s — %s', b.name, b.website), E'\n' order by b.name) as shops_and_guides
from public.businesses b join public.regions r on r.id = b.region_id
where r.slug = 'front-range' and b.status = 'active';
```

Add any venues you know hold events: gyms, bike parks, parks and
recreation departments, REI stores, and breweries that host rides.

### 2. The prompt

```text
You are checking upcoming outdoor events for a community board. Area: within 100 miles of [CITY, STATE]. Window: today to 6 months from today.

The HOST LIST below is the board's own list. Work through it one host at a time, in order, and do not skip any. If the host list is empty or still says [ORGANIZATIONS], stop and ask me for it.

ORGANIZATIONS (name — website):
[ORGANIZATIONS]

SHOPS AND GUIDES (name — website):
[SHOPS AND GUIDES]

VENUES (gyms, bike parks, parks departments, REI stores, breweries):
[VENUES]

For each host:
a. Open its website and find its events page, calendar, ride or run schedule, trips list, or volunteer page. Also check its public Instagram and Facebook posts, its Meetup group, and its own pages on BikeReg, RunSignup, UltraSignup or Eventbrite.
b. List every upcoming event the host runs and the public can join: rides, runs, hikes, paddles, climbing nights, clinics, classes, volunteer days, races, film screenings, meetings and socials.
c. Record what you found in the HOST CHECK list (see the end), including hosts with nothing upcoming.

Put the events in one CSV, in three passes:
- PASS "host": events run by a host on the list. This is the main work; do it first and completely.
- PASS "affinity": women's, queer, BIPOC, adaptive and beginner events run by a host on the list (rides, climbing nights, clinics, skills days). Mark them here instead of under "host".
- PASS "new_host": only after every listed host is done, the area's major events run by a group NOT on the list (a race series, a festival, a film tour stop, a big trail day). For these, give the host's own website in "host_url" so I can add the host first.

Proof rules. An event that fails any rule is left out and named under "Left out":
1. "event_url" must be the event's own page on the host's website, or a registration page (BikeReg, RunSignup, UltraSignup, a single Eventbrite event, a single Meetup event) that names the host. NEVER use a search or results page (an Eventbrite or Google search), a listing or aggregator site (onthesnow, allevents, happeningnext, a tourism calendar), a news article, or a homepage that doesn't show the event. Never reuse one link for two events unless the page lists both with their dates (a ride schedule or calendar page).
2. Copy the date AND the start time from that page word for word into "date_quote". No start time on the page means the event is left out. If the page gives two different times, leave it out and say so.
3. NEVER work out a date yourself from last year's event, from "usually the first Saturday in May", or from a projected or "weather permitting" date. Ski area opening days are left out.
4. Recurring events: one row only if the page states the day and time (for example "every Wednesday, 6–8 pm"). Quote that in "recurrence", put the next date in "start_date", and write "next date from the stated pattern" in "date_note".
5. "host" is the group or business whose page announces the event, spelled exactly as on the host list. If a venue holds an event run by another group, the group is the host and the venue goes in "venue".
6. "open_to": public | members_and_guests | members. Leave out members-only events, cancelled events, and anything you can only see after signing in.
7. "location": the meeting place as written on the page (park, trailhead, shop or address). If the page has none, leave the field blank and say so in "date_note".
8. Description: one factual sentence in your own words, at most 200 characters. No marketing words, no people's names, email addresses or phone numbers.

At the end, after the code block:
- "HOST CHECK": one line per host on the list, in order: the host, the page you checked, and either "N events" or "none upcoming" or "page wouldn't load".
- "Found: N events — N host, N affinity, N new_host."
- "Left out:" each event you saw but couldn't prove, and why.

Output: a CSV in one code block, every field quoted, with exactly this header:

"pass","event_name","host","host_url","venue","location","town","state","start_date","end_date","start_time","end_time","recurrence","date_quote","date_note","activities","audience","open_to","event_url","second_source","checked_on","price","description","confidence"

- pass: host | affinity | new_host
- activities: semicolon-separated, from the groups prompt's list (day-hikes; backpacking; road; gravel; mountain-biking; casual-rides; trail-running; road-running; kayaking; whitewater; paddleboard; bouldering; indoor; birding; fly-fishing; trail-work; conservation; beginners; and so on)
- audience: semicolon-separated: everyone | women | queer | bipoc | adaptive | youth | families | seniors | beginners
- start_time and end_time: 24-hour HH:MM as on the page; end_time blank if the page has none
- price: as written on the page ("Free", "$25"), or blank
- checked_on: the date you opened the page (YYYY-MM-DD)
- confidence: high (the host's own page or registration page shows this date and time, checked today) | medium (only the host's public social post shows it) | low (anything else; these will be left off the board)

If the CSV is too long, stop after a complete row and write CONTINUE; I'll reply "continue" and you carry on without repeating rows.
```

Cities for the live regions (11 October 2026): Denver, Boulder, Colorado
Springs, Salt Lake City, Raleigh, Seattle, Bellingham, Fayetteville (West
Virginia) and Knoxville.
