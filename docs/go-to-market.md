---
sidebar_position: 2.2
title: Go-to-market plan
---

# Go-to-market plan

*Draft, 12 October 2026, from Sarah's outline: friendly interviews first,
then group organizers, then growth through social platforms and search
(including AI assistants). Nothing here changes the product until a step
has its own use case.*

The board's job, in Sarah's words: *find outdoors community without
constant scrolling — we want you to get offline and get outside.* Growth
has to keep that promise. The principles still apply: lists, not feeds
(P2); no ads or tracking (P3); affinity groups complete, never featured
(P8).

## Phase 1 — Friendly interviews (weeks 1–2)

**Goal:** confirm the problem in people's own words before selling
anything.

- **Who:** 6–8 people Sarah knows: a few who are already in outdoor
  groups, a few who tried and gave up, at least two women who left a
  Facebook group, and one person new to a town.
- **How:** 20–30 minutes, in person or by video, recorded with
  permission. Ask about the last time it happened; don't show the site
  until the end.
- **Questions:**
  1. Tell me about the last time you looked for people to ride, climb,
     hike or paddle with. Where did you look? What happened?
  2. How do you hear about group rides, clinics or events now?
  3. What's annoying about Facebook groups, Meetup, Instagram or group
     chats for this?
  4. Have you ever not gone to something because you couldn't tell if it
     was for you (your level, your pace, people like you)?
  5. When you moved or started a new sport, how did you find your people?
  6. *(Last)* Look at the site for two minutes. What do you expect to
     find? What would make you come back?
- **What we're testing** (each one keeps its own tally):

  | Hypothesis | Holds if… |
  | --- | --- |
  | Events are scattered across too many places | Most people name 3+ places they check |
  | Feeds bury events | People describe missing things they'd have gone to |
  | Beginners can't tell what's for them | People mention level, pace or "is it for me" |
  | Affinity groups need a safer home than Facebook | Women and other affinity members describe unwanted attention or leaving |
  | People want less scrolling, not more | Positive reaction to the motto and the plain lists |

- **Output:** one page of quotes and tallies in `docs/research/`
  (names removed), and a go/adjust note on the PRD's problem statement.

## Phase 2 — Group organizers (weeks 2–6)

**Goal:** make sure we solve the organizer's problem, because organizers
bring the events, and events bring everyone else.

- **Who:** 10–15 organizers in **two pilot regions**: Western North
  Carolina (home turf) and the Front Range (Sarah's Denver contacts).
  Mix big clubs (SORBA chapter, hiking club), small Meetups, shop rides,
  and affinity groups (Blue Ridge Dirt Skrrts, Women Who Rock).
- **Questions:**
  1. Walk me through posting your last event, from idea to the day. Where
     did you post it? How many places?
  2. How do new people find you? Who do you lose along the way?
  3. What do you do about no-shows, waitlists, waivers, weather calls?
  4. What does Facebook, Meetup or Strava cost you, in money, time or
     trouble?
  5. *(Affinity organizers)* What do you do to keep your space safe? What
     would you need before moving off Facebook?
  6. *(Last)* Here's your group's listing on the board. What's wrong or
     missing? Would you claim it?
- **The offer:** your listing is already there and free forever; claim it,
  and your events reach people searching for exactly what you run. No
  fees, no ads beside your group, member lists private (UC-16, UC-36).
- **Output:** a ranked list of organizer pain points; claims (the real
  signal); and use cases for anything they ask for that the board doesn't
  do. Features wait for a reviewed use case, as always.

## Phase 3 — Density before reach (weeks 4–10)

People only come back if their area is full. Grow region by region, not
nationally:

- **A region is ready to promote** when it has 40+ groups, 30+ upcoming
  events in the next month (group and hosted), and at least five
  organizers who have claimed and post their own events.
- The research agents keep the data fresh (`scripts/research/`); organizer
  claims replace research over time.
- Pilot regions first; others open only when they meet the bar.

## Phase 4 — Growth channels

### Search engines and AI assistants (the main channel)

People ask Google and ChatGPT "beginner mountain bike clinic Asheville" or
"women's climbing group Denver". The board should be the best answer: a
plain page listing exactly that, with dates and links to sign up.

What makes that happen, roughly in order of payoff:

1. **A real domain** (pending; also needed for email). Search engines and
   AI assistants trust and remember a domain, not a Railway subdomain.
2. **Pages that match questions.** The board already has activity pages,
   group pages, event pages and town search. Add landing pages people
   search for: *activity × region*, *beginner* and *classes and clinics*
   (e.g. "Learn to mountain bike in Chattanooga"). Each needs a use case;
   they are lists, not articles.
3. **Structured data** (schema.org): `Event` is already on group event
   pages (TR-SEO-3). Add it to hosted events (UC-37), plus `SportsClub`
   or `Organization` on group pages and `ItemList` on lists. This is what
   puts dates into Google results and helps AI assistants quote the page
   correctly.
4. **Sitemap and freshness:** include hosted events and listings; update
   daily. Past events drop out (TR-SEO-5).
5. **Search consoles, no tracking:** Google Search Console and Bing
   Webmaster Tools (ChatGPT's search draws on Bing). Both read the
   sitemap and report searches and clicks without any script on the site,
   so TR-PRIV-2 holds.
6. **Let AI search crawlers in** (OpenAI's search bot, Perplexity,
   Claude's): a `robots.txt` decision to record as an ADR. Also add a
   short, factual About page that says what the board covers, where, and
   how listings are checked. Assistants cite pages that explain
   themselves.
7. **Be cited where assistants look:** Reddit threads, local news, trail
   organizations' "find a group" pages, and the national networks' chapter
   lists. A link from a SORBA chapter or a city parks page is worth more
   than any post.

### Reddit

The most useful channel for "where do I find people to…" questions, and
the least tolerant of promotion.

- Answer real questions in local and sport subreddits (r/asheville,
  r/Denver, r/MTB, r/climbing, r/hiking, city subs) with a direct link to
  the matching list, and say plainly that you built it.
- Ask moderators before posting the site itself; offer a monthly
  "outdoor events this month" post if they want one.
- Never post the same link around, never use sock puppets: one ban costs
  a whole community.

### Instagram and Facebook

- **Instagram:** one account. Weekly regional posts (a carousel of the
  week's events and beginner clinics), photos from groups that agree.
  Bio link to the region's Events page. Reshare organizers' posts with
  credit.
- **Facebook:** don't advertise in groups. Organizers decide whether to
  share their listing link with their members; make that easy (share
  buttons, good link previews, calendar files).
- **Make sharing one step for organizers** (UC-38, draft): a share kit
  on every event (post and story images with a QR code, caption, short
  link) and one bio link that never changes. Every post leads to the
  event page where people RSVP, so the board replaces work instead of
  adding a platform.
- **Affinity groups:** never promoted as a category or "featured" (P8).
  They choose whether and how to share.

### X / Twitter

Low priority for outdoor communities. Use it for the build-in-public
portfolio story (the product, the decisions, the data), not for
recruiting users.

### Offline, which fits the motto

- QR posters and cards at bike shops, climbing gyms, outfitters and
  trailhead kiosks ("Find a ride this week"). The venues listed under
  UC-37 are natural partners.
- Show up at events: SORBA trail days, gym community nights, film tours.
- Ask trail organizations, parks departments and tourism bureaus to link
  to their region's page from their "get involved" pages.

### Email (once the domain is set up)

A plain weekly email per region: this week's events, new groups. Opt-in,
no tracking pixels (TR-OPS-7). It brings people back without a feed.

## Becoming the authoritative source

*Added 12 October 2026, after a day of loading research for Raleigh,
Greenville, Durango, North Carolina and Virginia.*

The goal is that people, clubs and AI assistants check the board first
when they want to know what's happening outdoors in a region, because it
is the most complete and the most often right. Five moves, cheapest and
most durable first:

1. **Deep before wide.** Authority comes from being complete somewhere,
   not thin everywhere. Pick one pilot region (Western North Carolina:
   it's home, so gaps are easy to spot) and fill it until the coverage
   numbers from UC-39 say nearly everything is there: every club ride,
   race, park program and trail day. Other regions follow Phase 3's bar.
2. **Organizers post for themselves.** Their own posts are the only data
   better than our checking. Make claiming worth it: the share kit and one
   stable bio link (UC-38), and later a calendar feed or embed for the
   group's own website, so their site shows the board's listing and the
   board becomes the original. Every claimed group is one fewer page to
   crawl.
3. **Be what search engines and assistants read.** Structured event data
   and calendar feeds per region and activity (Phase 4, *Search engines
   and AI assistants*). When someone asks "group rides near Asheville this
   weekend", the answer should come from a page that is complete, dated
   and labeled.
4. **Make accuracy visible.** Show where an event was checked and when
   ("checked on the organizer's page, 12 Oct"), registration as plain fact
   ("registration opens 1 November", "sold out"), and an easy way to
   report a correction. Directories are often wrong; being visibly right
   is what people notice. Part of UC-39.
5. **Borrow reach from those who already have it.** One relationship can
   cover hundreds of groups: national networks with chapters (SORBA, Trout
   Unlimited, Audubon, Trail Sisters, Black Girls RUN!), race companies
   that run many events (Pisgah Productions, Trivium Racing, Tanawha
   Adventures), park Friends groups, tourism boards, and shops and gyms
   with community boards.

**What we learned about data on 12 October.** AI-generated event lists
can't be the base. Asked for hundreds of events across every activity,
Gemini returned whole files for North Carolina, Colorado, Utah and West
Virginia with invented websites and template names ("winter hiking" in
June, "Meetup #1" to "#220"); none was loaded. Its short lists of clubs
and its long reports were useful only as names to check. What worked:
checking each name on the organizer's own page or its official sign-up
page (RunSignup, UltraSignup, BikeReg), which is how UC-39 proposes to
find events routinely.

**What not to do:** add feed mechanics, ranking or engagement tricks to
grow, or publish anything unchecked. Either would spend the trust the
board is trying to earn.

## Measures

The board counts from its own database (TR-PRIV-3); search numbers come
from the search consoles.

| Measure | Why it matters |
| --- | --- |
| Groups claimed by their organizers, per region | The organizer side is working |
| Events posted by organizers (not research) per week | The board is a source, not a copy |
| RSVPs marked going, and repeat RSVPs | People actually get outside (the north star) |
| Search impressions and clicks for activity × town queries | Search is finding the board |
| Mentions and links from clubs, parks and local media | The board is becoming the reference |
| Coverage per region: hosts with a known event source, sources read this week, upcoming events (UC-39) | The board is complete where it claims to be |
| Share of upcoming events posted by organizers rather than found by research | The board is the original, not a copy |
| Corrections reported and how fast they're fixed | Accuracy people can see |

## What needs a use case before it's built

- Activity × region landing pages, and *beginner / classes and clinics*
  pages.
- Structured data on hosted events, groups and lists.
- Share buttons and image link previews for events.
- The AI-crawler `robots.txt` decision (ADR).
- The weekly regional email (after email setup).
- Event sources, discovery and keeping events current, with "checked"
  labels and registration status (UC-39, draft).
- A calendar feed or embed for a group's own website.

## Order of work

| Weeks | Step |
| --- | --- |
| 1–2 | Friendly interviews; domain and email; search consoles |
| 2–6 | Organizer interviews in two pilot regions; claims |
| 3–6 | Structured data and landing pages (after use cases) |
| 4–10 | Fill the pilot regions to the bar; Reddit answers; shop and gym posters |
| 8+ | Weekly email; open the next regions as they meet the bar |
