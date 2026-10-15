---
sidebar_position: 2
title: Product requirements
---

# Product requirements

## Problem

Someone wants to find people to hike, paddle, climb or ride with. The groups
exist, but they are scattered across Meetup (organizer fees, upsells),
Facebook groups (an account wall and a feed that hides events) and Discord
servers (invisible unless someone sends you an invite). There is no single
plain place to browse what's out there by activity and see what's coming up.

Organizers have the mirror-image problem: they pay for Meetup or fight the
Facebook algorithm to get an event in front of their own members.

**Not one more platform** *(Sarah, 12 October 2026)*. Organizers of
community groups and nonprofits already juggle Instagram, Facebook, a
website, a sign-up tool and group chats. The board must not become one
more thing to keep up to date. And the path from a post to a sign-up is
too long: a flyer on Instagram, then the profile, then the link in the
bio, then another site to register. Too many awkward taps for someone
scrolling Instagram or TikTok. An event on the board should be the one
page every post links to, with RSVPs on it, and sharing it should take
less work than what organizers do now (UC-38, draft).

## Goal

Ship a web app where anyone can browse outdoor groups by category without an
account, and where signed-in people can join groups, RSVP to events and talk
in group discussion boards, with groups run by an owner and admins.

The board started with one region, Western North Carolina, and since 11
October 2026 grows **region by region** across the US: each region is
built around one or more hub cities that Sarah has researched first
(UC-34, UC-35).

## Success criteria

The project succeeds if all five are true on launch day:

1. A visitor can go from the home page to a group's next event in three
   clicks, without signing in.
2. A new user can sign up, join a group and RSVP to an event in under two
   minutes.
3. An organizer can create a group, add a co-admin and post an event without
   help, once their first group is approved (UC-27).
4. Every permission in the [roles matrix](./roles-and-permissions) is enforced
   by the database and covered by an automated test.
5. The repository, documentation and live site are public and coherent.

As with the bike map, note what is absent: user counts, retention, revenue.
A portfolio piece is judged on whether it is finished and well made.

## Product principles

These are the "old internet" brief. They are requirements, not decoration —
each one rules features out.

| # | Principle | What it rules out |
| --- | --- | --- |
| P1 | **Browse first, sign up later.** Everything public is readable without an account. | Login walls, "sign up to see more" |
| P2 | **Lists, not feeds.** Every list is sorted alphabetically or by date, says so, and is the same for everyone. | Personalized feeds, "recommended for you", ranking algorithms |
| P3 | **No ads, no tracking.** | Promoted groups, ad slots, third-party pixels, selling data |
| P4 | **Quiet by default.** Email only, opt-in beyond the essentials, one-click unsubscribe. In-app reminders sit in one list you open yourself; the header shows only a count of conversations with unread messages *(amended 8 October 2026)*. | Push notifications, red dots, "you have 12 new…", streaks, engagement prompts |
| P5 | **Text first.** Words and links do the work; images are optional. One photo per event, and members-only photo galleries inside groups *(amended 8 October 2026)*. | Photo walls on browse pages, infinite media scroll |
| P6 | **Light and fast.** Pages are plain HTML from the server and work on a weak phone signal. | Heavy client apps, spinners on every page, infinite scroll |
| P7 | **People over metrics.** Show useful facts (member count, next event), never vanity counts. | Likes, reactions, follower counts, leaderboards |
| P8 | **Complete, not featured.** Affinity groups (women's, queer and LGBTQ+, BIPOC, adaptive, youth and family) are why many people find a safe first step into a sport, so research must never leave them out; but they are listed like every other group, in the same lists and the same order, never singled out, featured or gathered into a showcase that draws the wrong kind of attention. They can keep their space their own *(added 11 October 2026)*. | Research and listings that reflect only what ranks highest in search; "women's groups" banners, featured affinity sections or anything that makes those groups easier to target; settings that expose a group's members to people outside it |

## Design direction

Craigslist's structure with a gentler, more modern finish. It should feel a
little nostalgic: the web when it was a helpful directory.

- The site keeps the structure of the Magic Patterns design (30 September
  2026, Sarah's call): a header with *explore · events · communities*, a
  search box and *+ post*; a home page that leads with search over a
  ridgeline hero, then the activities as line drawings, then the next events
  as cards; *Events* and *Communities* pages with filters down the left.
- The Craigslist-style directory of every category and subcategory with
  counts is one click away, at *Browse all*.
- Still no feed, carousel of promotions, prices on listings or urgency
  nudges. The event cards are a fixed list of the next eight events, soonest
  first, the same for everyone.
- Group and event pages are documents: a heading, the facts, a description.
- One accent color, generous whitespace, a readable type size, clear link
  styling (links look like links).
- Mobile works by stacking the same columns, not by becoming a different app.

Screens the design needs to cover, in priority order:

1. Home (category directory)
2. Subcategory listing (groups in a subcategory)
3. Group page (about, upcoming events, organizers, join button)
4. Event page (details, RSVP)
5. Discussion board and a single thread
6. Create/edit group and create/edit event forms
7. "My stuff" (my groups, my upcoming RSVPs)
8. Sign in, create an account, forgot password (email and password, UC-29) and profile
9. Group admin: members, join requests, reports

The brand (logo, color, type, voice) is set by the branch outdoors brand
guide, summarized in [Brand](./brand). Screen mock-ups are done in Magic
Patterns and kept in their own repository, as the bike map did.

## Scope

The full numbered list is in [Functional requirements](./functional-requirements).
The summary by area:

| Area | Must (MVP) | Should | Could |
| --- | --- | --- | --- |
| Browse | Category directory, subcategory listings, group and event pages, regions (FR-RG-1 to FR-RG-3, FR-RG-6 to FR-RG-8; added 11 Oct) | Category-wide listing, upcoming events list, keyword search | — |
| Accounts | Magic-link sign-in, profile, my stuff, delete account | Public profile page | Google sign-in |
| Groups | Create, edit, discussions on/off, join policy | Rules text, archive, creation limit | New-group review queue |
| Membership | Join, request to join, leave, roles, remove/ban | Transfer ownership, join question | — |
| Events | Create, edit, cancel, RSVP | Capacity, attendee list, calendar file, past events | Waitlist, duplicate event |
| Discussions | Threads, replies, edit/delete own, pin/lock/remove | — | Event comment threads |
| Notifications | Unsubscribe controls (if any email is sent) | Join request, reminder, cancellation emails | New-event emails |
| Moderation | Report, admin queues, site-admin removal, rate limits, legal pages | Moderation log | Block a user |

Anything at **Could** gets cut without discussion if the MVP is at risk.

## Explicitly out of scope

These are decisions, not a backlog. Several were narrowed on 8 October
2026 (see *Decisions — 8 October 2026* below); what remains out is listed
here.

- Feeds, timelines, "recommended" anything, ranking algorithms
- Likes, reactions, follower counts
- Ads, sponsored listings or sponsored placement, paid tiers. (A
  *Sponsored by* section with logos on an event page is in: FR-EV-14.)
- Taking payments, checkout and ticketing. (Showing a price is in.)
- Real-time chat, typing indicators, read receipts and online status.
  (Direct messages that arrive as requests are in: [ADR-0006](./architecture/adr-0006-direct-messages).)
- Push notifications to phones, and red-dot badges. (An in-app reminders
  list and an unread-message count are in.)
- Native mobile apps (the web app is responsive). *Under review since 14
  October 2026:* Sarah asked for a mobile app; the drafts, and the PRD
  decisions they would change (this line, P2, P4), are in
  [Mobile app](./mobile/).
- Image uploads in discussion posts, and photo walls on browse pages.
  (Event photos and members-only group galleries are in.)
- AI features for users. (The weekly research agent, UC-9, is an operator
  tool: it only suggests candidates to the site admin.)
- Users under 18
- Shared code with the bike map or the dashboard

## Constraints

| Constraint | Implication |
| --- | --- |
| Solo build, part-time | Must requirements only until they are finished |
| Portfolio piece, publicly visible | It must stay up unattended, so no free tier that pauses (see [costs](./technical-requirements#cost-position)) |
| User-generated content | Moderation, reporting and legal pages are Must, not polish |
| Public repository | Commit history is part of the deliverable; no secrets in the repo |

## Delivery plan

Phases, not dates. Each ends with something deployed.

| Phase | Delivers | Requirements | Status |
| --- | --- | --- | --- |
| 0 — Decide | ADRs accepted, open questions answered, design mock | — | ADRs accepted 25 Sep; design next |
| 1 — Skeleton | Supabase schema + RLS + permission tests, seeded categories, browse pages | FR-BR-1, 2, 6, 7, 8 | **Built** |
| 2 — People | Magic-link sign-in, profiles, create group, join/leave, roles | FR-AC-*, FR-GR-*, FR-MB-* (Must) | **Built** |
| 3 — Events | Create/edit/cancel events, RSVP, my stuff | FR-EV-* (Must) | **Built** |
| 4 — Talk and safety | Discussions, reporting, admin queues, rate limits | FR-DS-*, FR-MD-* (Must) | **Built** |
| 5 — Launch | Supabase Pro, Railway, custom domain, email sending, reviewed legal pages, real groups | TR-OPS-*, FR-MD-5 | Not started — see [Runbook](./runbook) |
| After launch | Remaining Shoulds, in order of the persona they serve most | — | — |

Build the permission tests in phase 1, before any feature that depends on
them. They are the part of this project most likely to be wrong silently.

### Build status — 25 September 2026

Every **Must** is built, tested and working end to end against a local
database, plus these Shoulds, because they fell out of the Musts almost for
free: category listings (FR-BR-3), upcoming events (FR-BR-4), search
(FR-BR-5), public profiles (FR-AC-4), group rules (FR-GR-5), archiving
(FR-GR-6), the group limit (FR-GR-7), ownership transfer (FR-MB-6), the join
question (FR-MB-9), capacity (FR-EV-5), attendee lists (FR-EV-6), calendar
files (FR-EV-7), past events (FR-EV-8) and the moderation log (FR-MD-6).

Added 30 September 2026: **unclaimed listings and claims** (FR-GR-9,
FR-GR-10). Production launched empty, so real Western NC groups are listed
from public information (name, neutral description, website link, upcoming
events) until their organizers claim them. It's the honest version of a
seeded board: every listing says it is unclaimed and sends people to the
organizer's own site.

Added 8 October 2026: the **weekly research agent** (UC-9, FR-RS-*) and
**affinity tags** (FR-GR-11). A scheduled Claude Code session searches the
public web for new groups and events and saves them as candidates; the
site admin lists or skips each one from the admin page. Groups can carry
the tags Women, Youth, BIPOC and LGBTQIA+, and women-only and youth groups
are listed like any other.

Added 9 October 2026: **email and password sign-in** (UC-29, FR-AC-17 to
FR-AC-21, ADR-0009), replacing the emailed sign-in link (FR-AC-1). Open
sign-up with a confirmed email; forgot and change password. New accounts
and resets need email delivery, so they reach the public only once Resend's
SMTP is set up.

Added 9 October 2026: **a person's first group waits for review**
(UC-27, FR-GR-8, FR-GR-21, FR-GR-22). The site admin approves or declines
it from *New groups* on the admin page; later groups list at once.

Added 10 October 2026: **the About me profile** (UC-33, FR-PR-1 to
FR-PR-10). A small photo, home town, blurb, activities, fill-in-the-blanks,
this year's adventure goals and groups, each shown or hidden by its owner.
Profiles of page admins and page managers are public; a plain member's is
seen by the organizers of their groups, and by co-members only if they opt
in. This reverses *No profile photos* (FR-AC-3) and narrows the public
profile (FR-AC-4); Sarah will test the sharing model with users.

Not built yet:

| Item | Requirement | Why it waits |
| --- | --- | --- |
| Cover image upload | FR-GR-1 (optional field), TR-PERF-6, TR-SEC-9 | Storage bucket and permissions exist; the upload form needs image re-encoding, which adds a dependency. Groups work without images. |
| All notification emails and unsubscribe | FR-NT-1 to FR-NT-6 | Needs Resend and a domain (phase 5). Sign-in emails don't depend on this. |
| Deleting sign-in records of deleted accounts | TR-PRIV-4 | A small scheduled job; manual step documented in the runbook until then. |
| Short caching of listing pages | TR-PERF-5 | Pages are fast without it at this size. Revisit with real traffic. |
| Browser tests and accessibility checks in CI | TR-TEST-3, TR-A11Y-5 | The use cases were walked in a real browser (43 checks); turning that into a CI job needs the Docker-based local stack. |
| Coulds | FR-AC-8, FR-EV-9, FR-EV-10, FR-DS-8, FR-MD-7, FR-AD-3 | By definition. |

## Decisions — 8 October 2026

Sarah reviewed the Magic Patterns prototype of 8 October and brought these
into scope. Each still goes through its use case, user flow and review
before it is built. The guardrails are proposals that keep each one
inside the principles; they are written into the draft requirements and
can be changed at review.

| Now in scope | Was | Use case | Proposed guardrails |
| --- | --- | --- | --- |
| **Direct messages** | Out (ADR-0005) | UC-20 | First message is a request the other person accepts; decline and block; report; plain pages, no live updates, read receipts or online status; only the two people can read it. See [ADR-0006](./architecture/adr-0006-direct-messages). **Built 9 October 2026.** |
| **Group photo galleries** | Out (P5) | UC-21 | Inside a group only, members-only by default; images re-encoded; uploader and organizers can remove; reportable. |
| **Event prices** | Out ("no prices") | UC-10 | Plain text only (*Free*, *$10 trail fee*); the board never takes payment. |
| **Save for later** | Out ("RSVP is the save") | UC-22 | Private to the user; separate from *going*. |
| **Reminders with an unread count** | Out (P4) | UC-23 | One list on the signed-in home page; only things that need the user; the header count covers unread messages only; no email or push without opt-in. |
| **Waitlists and RSVP opening times** | Could / not planned | UC-17, UC-10 | Admins move people from the waitlist, nothing automatic; the opening time is stated plainly, no ticking countdown. |
| **Business pages** | Out ("who this board is not for") | UC-12 | Owned by an account signed in with the business's email, which the site admin checks against its website; admins are people's own accounts, no shared login; a business runs events only through a group it links, whose admins are separate; own directory page, never in group listings or above groups. |
| **Sponsors on events** | Under review | UC-10, UC-12 | A *Sponsored by* section with logos below the event details, on the event page only; a sponsor can link to a business or group page; never in lists, order or search. |

From the same review, these fit the product and are drafted as use cases:
location and distance search with *Near you* (UC-14), a destinations map
(UC-15), member list privacy (UC-16), RSVP approval (UC-17), a calendar
(UC-18), replies to replies (UC-19), and group types with cover photos
(UC-24). Event photos, series and sponsors were already drafted as UC-10.

Sarah also asked on 8 October for three changes outside the design,
drafted 9 October: a branded sign-in email (UC-25), email confirmation for
claims (UC-26), and approval of new groups (UC-27). The first two wait on
the domain; the third was decided (first group only) and built on 9
October.

The [feature map](./feature-map) separates what is live in the branded app
from every new feature, with its use case, requirements and status.

**Cost of these decisions.** Together they roughly double the remaining
build. Direct messages and galleries also add moderation work for the
site admin, and storage for photos. The map needs an outside map provider
or a static image ([ADR-0007](./architecture/adr-0007-destinations-map)).
The visual refresh from the same design (logo, colors, type) is a small
fix and doesn't wait on any of this.

## Security review — 9 October 2026

A review of the whole codebase after the 8 October work. Nothing found was
a new feature; each finding was the code not keeping a promise the product
already makes, so the fixes went in with the requirements they belong to
rather than through a new use case.

Two were promises to a member that only the pages kept, not the database:

- **Who reported something stays private.** The report form says the
  reporter's name is not shown to the person reported. The pages never
  showed it, but the data was readable by a group's own admins — so an
  organizer could learn who reported them. Now written down as FR-MD-8 and
  enforced in the database, with the site admin the only one who can see it.
- **A member always has a name.** A display name has been required since
  FR-AC-3, but an account could clear it and keep posting, leaving a member
  nobody could report, reach or suspend. The requirement now says what
  required means, and the database refuses it.

The rest were edge cases in rules already written: a group removed when its
owner left could be restored with nobody able to run it (FR-GR-10), an
archived group still allowed an RSVP to be changed (FR-GR-6), and claim
requests were the one write with no rate limit (TR-SEC-8, FR-MD-4). Two
were bounds rather than permissions: a page number from the URL could make
the database scan a whole table, and the Events page filtered and counted
in the application over a truncated set of rows, so both are now covered by
TR-SEC-12.

None of this changes what the board does or how any page looks.

## Decisions — 11 October 2026

Sarah asked to take the board national, region by region, after
researching clubs, venues and shops in dozens of cities and finding the
same mountain biking and climbing communities overlapping between them.
Approved in auto mode the same day; the reasoning is in
[ADR-0010](./architecture/adr-0010-regions).

| Decision | What it means |
| --- | --- |
| **One board, many regions** | One site, one database, one account for everyone. A region is a row (name, hub towns, centre, radius, time zone, status), not a separate copy of the site. Clones stay for a different audience (the women's board). |
| **Launch regions** | Western North Carolina (Asheville); Colorado Front Range (Denver, Boulder); Raleigh and the Triangle; Seattle and Bellingham; New River Gorge (Fayetteville, WV); Knoxville and East Tennessee. Salt Lake City and the Wasatch opened the same evening, the first region opened by the UC-35 process, then Reno and Lake Tahoe, and Sedona and Flagstaff; Greenville and the Upstate, and Durango and the San Juans, followed on 12 October. Denver and Boulder, and Seattle and Bellingham, share a region each because their 100-mile areas almost entirely overlap. |
| **Visitors see one region at a time** | The header names it, with *change*. A shared link's `?region=` wins, then the visitor's earlier choice (a first-party cookie), then a signed-in member's home-town region, then Western North Carolina. It is a filter the visitor chose and the page states, so P2 (*lists, not feeds*) holds: the same filters give everyone the same list (FR-BR-8). |
| **Regions open after research** | Sarah researches an area (Gemini, UC-9), loads it into the private research tables and lists groups from the admin page into the region. Nothing is listed unreviewed (UC-35). |
| **Town search per region** | Each region brings its own towns; zip codes outside Western North Carolina match by their first three digits, so distances there are approximate. A full national town and zip list waits until it's needed. |
| **Map tiles** | Still OpenStreetMap's own tiles; with six regions, moving to a tile provider's free tier comes before any promotion (ADR-0007). |

Not decided yet (open questions below): which regions come next, whether a
region needs local moderators, and the order for research beyond the six.

### Affinity first — 11 October 2026

Sarah, after a Gemini research run for Asheville returned 15 clubs and left
out Blue Ridge Dirt Skrrts, the one local ride that sells out on RSVP:
women built their groups on Facebook because it was easy, the platform then
let men find and target those groups, and women are moving off it to keep
spaces of their own. The same is true of other affinity groups. The board
has to be where they can go, and its data gathering has to correct
actively for the bias in search tools, which rank large, older,
mixed-gender organizations first while many affinity groups live mainly on
Instagram.

| Decision | What it means |
| --- | --- |
| **Principle P8, complete, not featured** | Above. |
| **Research never leaves affinity groups out** | Every research run, Gemini or the weekly agent, includes a required affinity pass from a per-city list of known groups and national networks' local chapters, and reports how many it found (FR-RS-11). Revised the same evening: the affinity pass comes after the anchors and everyday groups, not first (below). |
| **A bias check before a region opens** | A region doesn't go live until its research includes an affinity pass and its candidates have been checked against the known-groups list (FR-RS-12). Measured on 11 October: 34 of 692 researched organizations (5%) were women-specific; 12 of Western North Carolina's 62 listed groups and none of the Triangle's 14 carry an affinity tag. |
| **Not featured** | Sarah, the same day: affinity groups must not be put front and centre, which would attract the wrong kind of attention; they just must not be left off. No affinity showcase on the home page; the existing affinity tags (FR-GR-11) stay as they are. |
| **Safety for affinity groups (draft)** | UC-36 (keep our space our own) is drafted for review. |
| **Balanced research** | Sarah, the same evening: the Front Range lists came back mostly affinity groups and missed the big events. Research now runs anchors first (large clubs, major races, festivals and film tours), then everyday groups and recurring events, then the required affinity pass, across every activity category, and reports coverage per category so a lopsided list shows (FR-RS-11; `scripts/research/gemini-prompt.md`). |
| **Guides and shops now** | Sarah, the same night: "go ahead and add guide services and gear stores now." The first part of UC-12 is built: the site admin lists guide services and gear shops from the research as unclaimed listings, on their own *Guides and shops* page, never among the groups (FR-BZ-7). Claiming and the rest of UC-12 wait for review. |
| **Events from guides, shops and venues** | Sarah, 12 October 2026: "lets make sure we don't miss events just because they are not hosted by a club". UC-37: a listing's events sit in the Events list by date, marked with the host, with a *community groups only* filter; venues (nature centers, gyms, city programs, ski areas) became a third kind. Replaces FR-BZ-5 (events through groups only). No paid placement: same order for everyone (P2). |

## Decisions — 12 October 2026

| Decision | What it means |
| --- | --- |
| **The aim: try something, meet people** | The board exists to get people to try something new with others (a first camping or backpacking trip, a hard hike, mountain biking). Research favors beginner clinics, intro trips, no-drop group outings and trail days over races. |
| **Community calendars before race sites** | Event sources (UC-39) read groups' own calendars and park programs first; race registration sites (RunSignup, BikeReg) may come later. |
| **Outdoor & music festivals** | A subcategory under Camping, because festivals overlap with the board's activities (camping, paddling, riding at the same weekend). Only festivals with camping or outdoor activities; plain concerts stay off. |

## Open questions

These need Sarah's decision before or during build:

- ~~**Businesses on the board (UC-12).**~~ Settled 8 October 2026:
  businesses are in. A business page is owned by an account signed in
  with the business's email and has its own admins; it can link a group
  with separate admins, and hosts events only through that group.
- ~~**Sponsors (UC-10, UC-12).**~~ Settled 8 October 2026: a *Sponsored
  by* section with sponsors' logos below the event details, on the event
  page only, never in lists or affecting order.
- **Event series, pictures and questions (UC-10, UC-11).** Each reverses
  or extends an out-of-scope decision: recurring series and image uploads
  are listed as out of scope, and event questions need either notification
  emails or admins checking each event page.
- **National organizations (UC-13).** Linking chapters to a parent
  organization adds a level above groups. Small to build, but it is new
  structure in the data model.
- **Places and venues (UC-12).** One list of places (a crag area, a
  trailhead, a put-in, a shop's storefront) that events, groups and
  businesses point to would answer "business location or venue?": a
  business links to places as *its location* or *operates at*. The
  research tables already hold 116 places.

- ~~**Audience.**~~ Settled 25 September 2026: this is the **general,
  all-adventure** local board. The women's outdoor community app comes
  later as a clone of it — see [Cloning](./cloning).
- ~~**Geography.**~~ Settled 25 September 2026: **one region**, Western North
  Carolina. **Changed 11 October 2026:** the board goes national region by
  region, starting with six regions (see *Decisions — 11 October 2026*).
- **Which regions next, and when.** Sarah has research loaded for Burlington,
  both Portlands, Austin, Birmingham, Bozeman, Sedona, Chattanooga, Salt
  Lake City, Reno, Bentonville and eleven Eastern cities. Each opens after
  its groups are reviewed (UC-35).
- **Local help with moderation.** One site admin for many regions; whether
  a region gets a trusted local moderator is open.
- ~~**Who can create groups (UC-27).**~~ Settled 9 October 2026: **option
  B, approve only a person's first group**, built the same day. Anyone
  signed in can still start up to 3 groups (FR-GR-7); their first waits for
  the site admin before it is listed, and once one is approved (or they had
  a claim approved) the rest list at once. Success criterion 3 now reads
  "...once their first group is approved". The options weighed are in
  [Functional requirements](./functional-requirements#group-creation-approval-uc-27).
- **Who can receive a group's ownership.** Today only an admin (FR-MB-6).
  Sarah may want any member to be eligible. Raised with UC-27; not drafted.
- **Ship date.** None is set. The bike map showed a date is what gets a thing
  finished.
- **Name and domain.** Name settled 29 September 2026: **Branch Outdoors**.
  The domain is still open, and is needed before phase 5 for email sending (a
  verified domain is required). The branded sign-in email (UC-25) and
  claim confirmation (UC-26) can't ship until it is chosen.
- ~~**Railway account.**~~ Settled 25 September 2026: the Railway Hobby
  subscription is on Sarah's own account, so this project deploys there.
- **n8n subscription.** This project does not use n8n ([ADR-0004](./architecture/adr-0004-background-jobs-and-email)).
  Whether to keep paying for it depends only on the dashboard.
