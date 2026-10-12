# Area sweep agent (from 12 October 2026)

Instructions for the **area sweep**: a scheduled Claude routine that runs
every few hours and works through Sarah's list of target areas, one or two
per run, until each area has been searched deeply. It saves everything as
*candidates* through the research intake, exactly like the weekly agent.
**It never lists anything and never changes the website.** The site admin
reviews candidates and decides what goes on the board, and which new
regions open (UC-35).

Read `scripts/research/agent.md` first. Its sections *What you are allowed
to do*, *What you must never do*, the intake calls, the find format (step
5) and the summary (step 6) all apply here. This file replaces its steps 2
and 3 (what to search).

## Which areas this run

Work through the list below in order. Each run takes the **next two areas
whose status is not `deep`**, using the board's own memory to decide:

1. Call `{"action": "known"}` and keep `names`.
2. For the first area on the list, search `<area> hiking club`,
   `<area> mountain bike club` and `<area> climbing gym`. If most of what
   comes back is already in `names`, the area is done: move to the next.
   Otherwise this is one of your two areas.

Rotate the start of the list by the hour so parallel runs don't collide:
start at position (hour of the day ÷ 2) mod the list length, and wrap.

The list (Sarah, 12 October 2026). "Region" is where it would belong:
`live` means a live region already covers it, `new` means a region doesn't
exist yet (set `out_of_region` to true for those finds).

| Area | Region |
| --- | --- |
| Greenville, SC | live (Western North Carolina) |
| Chattanooga, TN | live (East Tennessee) |
| Fort Collins, CO | live (Front Range) |
| Boulder, CO | live (Front Range) |
| Denver, CO | live (Front Range) |
| Salt Lake City, UT | live (Wasatch) |
| Reno, NV | live (Reno–Tahoe) |
| Flagstaff, AZ | live (Sedona–Flagstaff) |
| Charleston, SC | new |
| Portland, ME | new |
| Boise, ID | new |
| Missoula, MT | new |
| Bozeman, MT | new |
| Chicago, IL | new |
| Bend, OR | new |
| Portland, OR | new |
| Ashland, OR | new |
| Spokane, WA | new |
| Ithaca, NY | new |
| Durango, CO | new |
| Carbondale, CO (Roaring Fork Valley) | new |
| Madison, WI | new |
| Grand Rapids, MI | new |
| Burlington, VT | new |
| Waitsfield, VT (Mad River Valley) | new |
| Tucson, AZ | new |

## What to search in an area

About 40 searches per run, split between your two areas. In each area, in
this order (the order is about completeness, never about featuring):

1. **Anchors.** The big, long-running clubs and chapters of national clubs
   (hiking, mountaineering, cycling, paddling, running, climbing access,
   Audubon, Trout Unlimited, trail and conservation nonprofits).
2. **Everyday groups.** Meetup groups, shop and brewery rides, run clubs,
   gym clubs, volunteer crews.
3. **Affinity pass (required, FR-RS-11).** Women's, queer and LGBTQ+, BIPOC,
   adaptive, youth and family groups, including local chapters of national
   networks (Trail Sisters, Ladies Climbing Coalition, Radical Adventure
   Riders, Brown Girls Climb, Outdoor Afro, Latino Outdoors, Unlikely
   Hikers, Catalyst Sports, SheJumps, Black Girls Do Bike, Women's MTB
   Network). A national homepage is not evidence of a local chapter: list a
   chapter only with its own page. Many live on Instagram or Facebook; a
   public page counts.
4. **Venues, guides, shops and event companies (UC-37).** Climbing gyms,
   nature centers, city outdoor programs, ski areas, guide services, bike
   and gear shops that run rides or classes, and race companies. Kinds:
   `venue`, `guide`, `business`.
5. **Events.** For every host you found or that `names` already holds in
   the area, open its own events page and add upcoming events.

## The proof rules (learned on 11–12 October 2026)

AI research invents things. A find that fails a rule is not thrown away:
save it with `verification` `failed` or `unverified` and the reason in
`evidence` (events: `date_only` or `verification` plus a `note`), as
`agent.md` step 4 says (FR-RS-13). Only finds that pass every rule are
saved as `verified`:

- **Open the page.** Never save a website you haven't opened. Dead domains,
  404s and redirects to something else mean leave it out (or use the page
  it really moved to).
- **Active means 2025 or 2026 evidence** on the group's own page or public
  social page: a dated post, event or report. A copyright footer alone is
  not evidence.
- **Events need the host's own page** (or a single registration page naming
  the host) showing the date **and start time** for this year. Never a
  search page, listing site, news story or tourism calendar. Never a date
  worked out from last year or from "usually the first Saturday". No
  projected ski openings unless the resort's own page states the date.
- **Recurring events:** only when the page states the day and time; add
  the next three dates.
- **Members-only events and trips are left out.**
- **No people's names, emails or phone numbers. Prices only inside the
  location text, as written** ("($15)").
- **Time zones with the right offset**, including daylight saving
  (Nov 1, 2026 and Mar 14, 2027 in the US; Arizona never changes).

## Finish

The summary from `agent.md` step 6, plus: which two areas you took, how
many anchors, everyday groups, affinity groups, venues/guides/shops and
events you added for each, and whether each area now looks `deep` (most
searches turn up only known names). Don't send a push notification unless
the intake failed.
