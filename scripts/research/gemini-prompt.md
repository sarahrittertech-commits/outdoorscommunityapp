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
- A website and a separate `source_url` for every row, and a confidence,
  because the board refuses candidates without a link and some links in
  AI output are guessed.
- No people's names, emails or phone numbers (FR-RS-2).

```text
You are building a research dataset for a community board of outdoor groups. Work on ONE target city: [CITY, STATE]. Radius: 100 miles.

Find every real, currently active:
- hiking, backpacking, climbing/mountaineering and mountain biking CLUBS and community groups (including trail-building and advocacy groups, Meetup groups, women's and inclusive groups, university clubs open to the public);
- VENUES for those activities (trail systems, bike parks, state/national parks and forests used for these sports, outdoor crags, climbing and bouldering gyms);
- mountain bike SHOPS (independent shops and outfitters with a bike department).

Rules:
1. One real organization or place per row. Never combine two into one row ("X & Y"). Use the official name as it appears on its own website.
2. Do not invent anything. If you can't confirm something exists and is active, leave it out. If you can't find a field, leave it blank rather than guessing.
3. Open each website before you list it. "website" must be the official homepage (not a deep link, not a directory). "source_url" is the page where you confirmed the details (it can be the same page).
4. If an organization is within 100 miles of a different major city, still list it once here and put the actual town and distance.
5. Description: 1–2 factual sentences in your own words, at most 300 characters. No marketing words (premier, legendary, world-class, best). Say what they do and where (trails, crags, ride days).
6. No people's names, email addresses or phone numbers, ever.
7. Skip national chains' general pages, closed businesses, and anything only on a private or sign-in page.
8. Aim for completeness: at least 15 clubs, 15 venues and 10 shops if they exist. At the end, write one line: "Found: N clubs, N venues, N shops. Likely missing: ..." (what you couldn't cover).

Output: a CSV in a single code block, with exactly this header and these allowed values, every field quoted:

"kind","name","type","activities","town","state","target_city","approx_miles","website","source_url","instagram","women_specific","description","recent_activity","confidence"

- kind: group | venue | business
- type: one of: hiking club, backpacking club, climbing club, mountain bike club, trail organization, women's group, inclusive group, university club, meetup group, trail system, bike park, state or national park/forest, outdoor crag, climbing gym, bouldering gym, bike shop, outfitter
- activities: semicolon-separated, only from: hiking; backpacking; rock_climbing; bouldering; indoor_climbing; mountaineering; mountain_biking; trail_running; trail_stewardship; skills_courses; camping; social_meetup
- instagram: the public handle with @ if you found one, else blank
- women_specific: Yes | No | Unknown
- recent_activity: the most recent dated post, event or update you saw (YYYY-MM), else blank
- confidence: high (official site confirms it) | medium (only third-party sources) | low (couldn't confirm)

If the CSV is too long for one answer, stop after a complete row and write CONTINUE; I'll reply "continue" and you carry on without repeating rows.
```

Cities for the live regions (11 October 2026): Denver, Boulder, Raleigh,
Seattle, Bellingham, Fayetteville (West Virginia) and Knoxville. The
Front Range, Seattle–Bellingham, New River Gorge and East Tennessee regions
are thin until these runs come back with links.
