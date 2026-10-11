# Research prompt for Gemini (one city at a time)

Sarah researches each city before its region opens (UC-35). Run this in
Gemini, preferably with **Deep Research** so it opens and checks the pages,
once per city. Save the answer as a CSV and load it with
`node scripts/research/load.mjs --append` after converting it to the
research format (see the [runbook](../../docs/runbook.md#opening-a-region)).

Why it is shaped this way (lessons from the 10–11 October lists):

- One city per run: asking for many cities returns 8 to 10 rows each.
- One real organization per row, official name, no "X & Y" rows.
- `kind` and `activities` match the board's import, so rows load cleanly.
- A website, a separate `source_url`, Instagram, Facebook and any other
  public pages that mention the group (`other_sources`) for every row, and
  a confidence that is strict (most rows shouldn't be high),
  because the board refuses candidates without a link and some links in
  AI output are guessed.
- No people's names, emails or phone numbers (FR-RS-2).
- A national network's local chapter only with a page for that chapter:
  the Asheville run listed "Outdoor Afro North Carolina" and "Latino
  Outdoors Western North Carolina" from the national homepages alone.
- No target counts, and a required second pass for women's and inclusive
  groups. The 11 October Asheville run returned exactly the 15 clubs it was
  asked for and left out Blue Ridge Dirt Skrrts: search tools rank large,
  older, mixed-gender organizations first, while many women's and inclusive
  groups live mainly on Instagram. Fill in the "make sure these are
  included" list for each city from what you already know.

```text
You are building a research dataset for a community board of outdoor groups. Work on ONE target city: [CITY, STATE]. Radius: 100 miles.

Start with affinity groups: first find every women's, girls', FTWN-B, queer and LGBTQ+, BIPOC and adaptive or disability-inclusive group for these activities around [CITY] (rule 9), then everything else.

Find every real, currently active:
- hiking, backpacking, climbing/mountaineering and mountain biking CLUBS and community groups (including trail-building and advocacy groups, Meetup groups, women's and inclusive groups, university clubs open to the public);
- VENUES for those activities (trail systems, bike parks, state/national parks and forests used for these sports, outdoor crags, climbing and bouldering gyms);
- mountain bike SHOPS (independent shops and outfitters with a bike department).

Rules:
1. One real organization or place per row. Never combine two into one row ("X & Y"). Use the official name as it appears on its own website.
2. Do not invent anything. If you can't confirm something exists and is active, leave it out. If you can't find a field, leave it blank rather than guessing.
3. Open each website before you list it. "website" must be the official homepage (not a deep link, not a directory). "source_url" is the page where you confirmed the details (it can be the same page). Give every source you used: the organization's Instagram and Facebook pages in their own columns, and any other pages that mention it (Meetup, a shop or gym event page, a news story, a national network's chapter page) in "other_sources". Only pages anyone can read without signing in.
4. If an organization is within 100 miles of a different major city, still list it once here and put the actual town and distance.
5. Description: 1–2 factual sentences in your own words, at most 300 characters. No marketing words (premier, legendary, world-class, best). Say what they do and where (trails, crags, ride days).
6. No people's names, email addresses or phone numbers, ever.
7. Skip national chains' general pages, closed businesses, and anything only on a private or sign-in page.
8. There is no target number. Keep searching until new searches stop turning up new organizations; do not stop at a round number.
9. AFFINITY PASS, done FIRST: search specifically for women's, girls', FTWN-B, queer and LGBTQ+, BIPOC and adaptive or disability-inclusive groups for these activities around [CITY]. Search Instagram and Facebook pages that anyone can read, Meetup, local bike shop and climbing gym event pages, and national networks' local chapters (Trail Sisters, Ladies Climbing Coalition, Radical Adventure Riders, Brown Girls Climb, Outdoor Afro, Latino Outdoors, Unlikely Hikers, Catalyst Sports, SheJumps, Women's MTB Network, Girls Go Shred). Groups that live mainly on Instagram count: use their Instagram page as the website and give the handle. List a national network's local chapter ONLY if you find a page for that chapter (a chapter page, its own Instagram, Facebook or Meetup); a national homepage alone is not evidence of a local group. Put these rows in the same CSV.
10. Make sure these are included if they are active (check each one): [KNOWN GROUPS — e.g. for Asheville: Blue Ridge Dirt Skrrts (dirtskrrts.com), Trail Sisters WNC, Ladies Climbing Coalition Asheville, Radical Adventure Riders Asheville, Girls Go Shred, Asheville Women's Run Club].
11. At the end, after the code block, write: "Found: N clubs (of which N women's or inclusive), N venues, N shops." Then "Searches I ran:" with the search queries you used, and "Likely missing:" with what you couldn't cover.

Output: a CSV in a single code block, with exactly this header and these allowed values, every field quoted:

"kind","name","type","activities","town","state","target_city","approx_miles","website","source_url","instagram","facebook","other_sources","women_specific","description","recent_activity","confidence"

- kind: group | venue | business
- type: one of: hiking club, backpacking club, climbing club, mountain bike club, trail organization, women's group, inclusive group, university club, meetup group, trail system, bike park, state or national park/forest, outdoor crag, climbing gym, bouldering gym, bike shop, outfitter
- activities: semicolon-separated, only from: hiking; backpacking; rock_climbing; bouldering; indoor_climbing; mountaineering; mountain_biking; trail_running; trail_stewardship; skills_courses; camping; social_meetup
- instagram: the public handle with @ if you found one, else blank
- facebook: the full link to the public Facebook page or group if there is one, else blank
- other_sources: other public links that mention the organization, separated by " ; ", else blank
- women_specific: Yes | No | Unknown
- recent_activity: the most recent dated post, event or update you saw (YYYY-MM), else blank
- confidence: high (its own website or page shows activity in the last 12 months) | medium (it exists, but you could only see third-party pages, or nothing recent) | low (couldn't confirm). Be strict: most rows should not be high.

If the CSV is too long for one answer, stop after a complete row and write CONTINUE; I'll reply "continue" and you carry on without repeating rows.
```

Cities for the live regions (11 October 2026): Denver, Boulder, Raleigh,
Seattle, Bellingham, Fayetteville (West Virginia) and Knoxville. The
Front Range, Seattle–Bellingham, New River Gorge and East Tennessee regions
are thin until these runs come back with links.

## Events prompt

Events go out of date and AI tools fill gaps with invented links: the 11
October Boone events list cited one race page for eleven different events.
So this prompt starts from the groups, wants each event's own page, and
puts affinity events (women's rides, clinics, meetups) first. Events load
into the private research tables as unverified; the board shows an event
only once its group is listed and the event checks out (FR-RS-8).

```text
List upcoming outdoor events within 100 miles of [CITY, STATE] in the next 6 months, for hiking, backpacking, climbing and mountain biking.

Start with these groups' own calendars, event pages and public Instagram or Facebook posts, then search more widely: [GROUP NAMES — e.g. for Boone: Trail Sisters High Country NC, Boone Area Girls MTB, Boone Area Cyclists, High Country Trail Keepers, Carolina Climbers Coalition, Northwest NC Mountain Bike Alliance].

Do women's, queer, BIPOC, adaptive and beginner events FIRST: group rides, clinics, meetups, skills days, women's ride days at bike parks and gyms.

Rules:
1. Every event needs its OWN page: the event page, the organizer's calendar entry, a registration page, or a public post announcing it. Never reuse one link for two events. If you can't find the event's own page, leave the event out.
2. The date must appear on that page. Copy the date and start time as written. If the page says "tentative" or gives no year, say so in "date_note". Never guess a date from last year's event.
3. Recurring events (a weekly ride): one row, with the pattern in "recurrence" and the next date in "start_date".
4. The organizer must be a real group or business with its own website or public page. Never invent an organizer name.
5. Description: one factual sentence in your own words, at most 200 characters. No marketing words.
6. No people's names, email addresses or phone numbers.
7. At the end, after the code block: "Found: N events (of which N women's, inclusive or beginner)." Then "Searches I ran:" and "Left out:" (events you saw but couldn't source).

Output: a CSV in one code block, every field quoted, with exactly this header:

"event_name","organizer","organizer_website","venue","town","state","start_date","end_date","start_time","recurrence","date_note","activities","event_url","women_specific","beginner_friendly","description","confidence"

- start_date and end_date: YYYY-MM-DD
- activities: semicolon-separated, only from: hiking; backpacking; rock_climbing; bouldering; indoor_climbing; mountaineering; mountain_biking; trail_running; trail_stewardship; skills_courses; camping; social_meetup
- women_specific and beginner_friendly: Yes | No | Unknown
- confidence: high (the event's own page shows this date) | medium (a public post or listing shows it) | low (couldn't confirm). Be strict.

If the CSV is too long, stop after a complete row and write CONTINUE.
```
