---
sidebar_position: 2.3
title: Research playbook
---

# Research playbook

*Written 12 October 2026, after a full day of loading research (Raleigh,
Greenville, Durango, North Carolina, Colorado, Virginia, West Virginia,
Utah, Boston, Burlington, Montana, Arkansas, California). What worked, what
didn't, and how to spend less of Sarah's time on it. The expansion that
followed (to 45 areas, 13 October) is in
[research and areas — findings](./research-findings).*

## What the day added

| | Count |
| --- | --- |
| Groups listed on 12 October | 174 (252 on the board in all) |
| Guides, shops, venues and event companies listed | 113 |
| Upcoming events published that day | about 400 (427 on the board) |
| Finds kept in the research tables | 671 (465 unverified, 32 failed) |
| Regions opened | 2 (Greenville and the Upstate; Durango and the San Juans) |

## What each source was worth

| Source | Verdict | Why |
| --- | --- | --- |
| **Public calendar feeds** (NC State Parks' Localist feed) | Best | 52 dated ranger programs in one read, exact times, no AI, no cost. Now automatic every week (feed reader). |
| **Organizers' own events pages** | Best | The only place dates are trustworthy. Every event on the board comes from one. |
| **Sarah's Google searches** (plain search, incognito) | Very good for niche topics | Fly tying: 7 of 7 shops real; Gemini found only 3, one of them a 404. |
| **Gemini sweep** (organizations only, links checked by code) | Good for broad topics, cheap | Denver: 25 real new clubs for about 5 cents; about 1 in 5 suggestions failed the check and were caught. Answers from memory (no searches), so it misses new and small groups. |
| **AI-written lists of organizations** | Useful as names to check | Most organizations real; websites, chapters and details often wrong. |
| **AI-written event calendars** (CSV) | Not usable | Whole files for North Carolina, Colorado, Utah and West Virginia were invented: made-up domains, template names ("Meetup #1 to #220", "winter hiking" in June). None was loaded. |
| **Editorial and listing pages** (climbing.com, aggregators, tourism sites) | Leads only | Sign-in walls, stale pages and missing times; each event still needs its organizer's page. |
| **Facebook and Instagram** | Not readable | Terms forbid automated reading; events there need the organizer to post on the board (UC-38). |

## Where the manual work went, and how to cut it

1. **Pasting lists and waiting for checks.** Most of the day was Sarah
   pasting lists and the assistant checking each link. *Cut:* send links,
   not lists; the topic search (Actions → *Research sweep (Gemini)* →
   topic and area) does the AI half and returns a checked spreadsheet.
2. **Past events.** Many lists were festivals that had already happened.
   They are worth keeping as "watch for next year", but they cost time now
   and add nothing to the board until a date is posted. *Cut:* ask for
   "the next date posted on the organizer's site"; skip anything without one.
3. **Re-finding what's already listed.** Several lists repeated groups the
   board already had. *Cut:* the sweep already skips known names; the next
   step is the event sources table (UC-39), so each listed host is re-read
   automatically instead of re-searched.
4. **Recurring programs.** Weekly runs, tying nights and park programs were
   typed in by hand. *Cut:* calendar feeds (done for NC State Parks); next,
   club WordPress calendars and Meetup group feeds for listed hosts
   (FR-ES-12, steps 1 and 2).
5. **Google overloads.** Four of seven real Denver passes failed with
   Google's "busy" answer. *Cut:* the sweep retries twice; run it on a
   schedule overnight rather than on demand before a meeting.

## Better searches

What found the most real, beginner-friendly events and groups:

- `site:meetup.com [activity] [city]` for active groups.
- `"no-drop" ride [city]`, `"beginner clinic" climbing [city]`,
  `"all paces" run club [city]`, `"intro to" [activity] [city]`.
- `"volunteer workday" OR "trail work day" [year] [county]`.
- `[group name] events` to find the page the crawler should read.
- `[city] parks and recreation calendar` and `[state] state parks events`:
  many run on Localist or similar feeds the reader can take as-is.
- For Gemini: one activity and one area at a time, "organizations and
  their events page, no dates", at most 12 (how the sweep now asks).

## Recommended weekly rhythm

| When | What | Cost |
| --- | --- | --- |
| Monday, automatic | Feed reader: NC State Parks (more feeds as they're added) | Free |
| Twice a week, automatic (once Sarah turns the schedule on) | Gemini sweep through the live regions, one activity at a time, to the review queue | Pennies |
| As Sarah browses | Paste links (not lists) of groups and events she finds; one topic search per niche | A few minutes |
| Weekly, 15 minutes | Review queue on the admin page: list or skip | Sarah's time only |

## Next steps that remove the most work

1. Event sources table and weekly re-read of each listed host's events
   page (UC-39, FR-ES-1 to FR-ES-5). Biggest single cut: no re-searching.
2. More feeds: other states' parks and city recreation calendars that use
   Localist or similar (Colorado, Utah, Washington); club WordPress
   calendars.
3. Schedule the Gemini sweep (twice a week) once a cost cap is set in
   Google Cloud.
4. Organizer claims and the share kit (UC-38): every organizer who posts
   for themselves is one less page to read.
