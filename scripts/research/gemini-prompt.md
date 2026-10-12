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

It now starts with the region's **major events**: races, festivals, film
tours and big volunteer days. Then come the weekly community events, then
the affinity and beginner events.

Events load into the private research tables as unverified. The board
shows an event only once its group is listed and the event checks out
(FR-RS-8). To check a row, open `event_url` and look for `date_quote`.

```text
You are checking upcoming outdoor events for a community board. Area: within 100 miles of [CITY, STATE]. Window: today to 6 months from today. Activities: every kind of outdoor recreation — hiking, cycling of all kinds, paddling, climbing, running, camping, snow sports, fishing, nature and wildlife, trail work and conservation, and skills courses.

HOSTS to work through, one at a time (open each one's events page or calendar, its public Instagram and Facebook posts, and its registration pages on BikeReg, RunSignup, UltraSignup, Eventbrite or Meetup):
- ORGANIZATIONS: [ORGANIZATIONS from the groups run]
- VENUES AND BUSINESSES (gyms, bike parks, ski areas, parks and recreation departments, shops, outfitters, REI stores, breweries that host rides): [VENUES]
- RACE AND EVENT PROMOTERS: [PROMOTERS, if you know any]

Work in three passes and put all rows in one CSV.

PASS 1 — MAJOR EVENTS. The events the outdoor community in this area plans around: races and race series (trail running, mountain bike, gravel, road, paddling, climbing competitions), festivals and expos, film tours (Banff Mountain Film Festival World Tour, Reel Rock, Radical Reels, Fly Fishing Film Tour), big trail work days and clean-ups, park and public lands days, season openers and closers, and clubs' annual meetings, dinners and swaps that are open to the public. Search "[CITY] trail race [YEAR]", "[CITY] gravel race", "[CITY] outdoor festival", "[CITY] film festival tour", "[STATE] race calendar", and the state's race calendars and parks calendars, then find each event's own page.

PASS 2 — RECURRING COMMUNITY EVENTS. Weekly and monthly shop rides, run clubs, gym meetups, paddling nights, group hikes, volunteer days, and beginner classes at shops, gyms and parks.

PASS 3 — AFFINITY AND BEGINNER EVENTS (required). Women's, queer, BIPOC, adaptive and beginner rides, clinics, climbing nights, skills days and meetups at every host above, and at the affinity groups from the groups run.

Proof rules (an event that fails any of these is left out and named under "Left out"):
1. Every event needs its OWN page: the event page, the host's calendar entry, a registration page, or a public post announcing that event. Never reuse one link for two different events. A homepage or a general calendar is not an event page unless the event and its date are on it.
2. Copy the date and time from that page word for word into "date_quote". Then give "start_date" as YYYY-MM-DD. NEVER work a date out from last year's date or from "usually the first Saturday in May": if no page shows this edition's date, leave the event out and name it under "Left out". If the page shows no year or says tentative or TBA, say so in "date_note" and set confidence to low.
3. "checked_on": the date you opened the page (YYYY-MM-DD).
4. "second_source": another public page that shows the same event and date (the host's Instagram, a registration site, a venue calendar), or blank. Do not invent one.
5. Name the real host: the group or business whose page announces the event, with its own website or public page in "host_url". If a venue holds an event run by another group, put the group in "host" and the venue in "venue".
6. Recurring events (a weekly ride): one row, with the page's wording for the pattern in "recurrence" and the next date in "start_date".
7. "open_to": public (anyone can come or register) | members_and_guests (the page says guests may join) | members (members only). Skip members-only events unless they are big annual events listed publicly; skip cancelled and past events and anything you can only see after signing in.
8. Description: one factual sentence in your own words, at most 200 characters. No marketing words. No people's names, email addresses or phone numbers.
9. At the end, after the code block, write:
   - "Found: N events — N major, N recurring, N affinity or beginner — from N hosts."
   - "Per category:" with a count for each activity category.
   - "Hosts with no upcoming events found:"
   - "Searches I ran:"
   - "Left out:" with each event you saw but couldn't prove, and why.

Output: a CSV in one code block, every field quoted, with exactly this header:

"pass","event_name","host","host_url","venue","town","state","start_date","end_date","start_time","end_time","recurrence","date_quote","date_note","activities","audience","open_to","event_url","second_source","checked_on","price","description","confidence"

- pass: major | recurring | affinity
- activities: semicolon-separated, using the same list as the groups prompt (day-hikes; backpacking; road; gravel; mountain-biking; trail-running; paddleboard; indoor; trail-work; beginners; and so on)
- audience: semicolon-separated: everyone | women | queer | bipoc | adaptive | youth | families | seniors | beginners
- price: as written on the page ("Free", "$25"), or blank
- confidence: high (the event's own page shows this date and you checked it today) | medium (only a public post or a listing site shows it) | low (no year, tentative, or couldn't confirm). Be strict.

If the CSV is too long, stop after a complete row and write CONTINUE; I'll reply "continue" and you carry on without repeating rows.
```

Cities for the live regions (11 October 2026): Denver, Boulder, Colorado
Springs, Salt Lake City, Raleigh, Seattle, Bellingham, Fayetteville (West
Virginia) and Knoxville.
