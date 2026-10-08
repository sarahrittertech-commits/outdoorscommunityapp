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

## Goal

Ship a web app where anyone can browse outdoor groups by category without an
account, and where signed-in people can join groups, RSVP to events and talk
in group discussion boards, with groups run by an owner and admins.

## Success criteria

The project succeeds if all five are true on launch day:

1. A visitor can go from the home page to a group's next event in three
   clicks, without signing in.
2. A new user can sign up, join a group and RSVP to an event in under two
   minutes.
3. An organizer can create a group, add a co-admin and post an event without
   help.
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
8. Sign in (magic link) and profile
9. Group admin: members, join requests, reports

The brand (logo, color, type, voice) is set by the branch outdoors brand
guide, summarized in [Brand](./brand). Screen mock-ups are done in Magic
Patterns and kept in their own repository, as the bike map did.

## Scope

The full numbered list is in [Functional requirements](./functional-requirements).
The summary by area:

| Area | Must (MVP) | Should | Could |
| --- | --- | --- | --- |
| Browse | Category directory, subcategory listings, group and event pages | Category-wide listing, upcoming events list, keyword search | Region filter |
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
- Ads, sponsored listings or sponsored placement, paid tiers. (A small
  *Sponsored by* credit on an event page is in, under review: FR-EV-14.)
- Taking payments, checkout and ticketing. (Showing a price is in.)
- Real-time chat, typing indicators, read receipts and online status.
  (Direct messages that arrive as requests are in: [ADR-0006](./architecture/adr-0006-direct-messages).)
- Push notifications to phones, and red-dot badges. (An in-app reminders
  list and an unread-message count are in.)
- Native mobile apps (the web app is responsive)
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

Not built yet:

| Item | Requirement | Why it waits |
| --- | --- | --- |
| Cover image upload | FR-GR-1 (optional field), TR-PERF-6, TR-SEC-9 | Storage bucket and permissions exist; the upload form needs image re-encoding, which adds a dependency. Groups work without images. |
| All notification emails and unsubscribe | FR-NT-1 to FR-NT-6 | Needs Resend and a domain (phase 5). Sign-in emails don't depend on this. |
| Deleting sign-in records of deleted accounts | TR-PRIV-4 | A small scheduled job; manual step documented in the runbook until then. |
| Short caching of listing pages | TR-PERF-5 | Pages are fast without it at this size. Revisit with real traffic. |
| Browser tests and accessibility checks in CI | TR-TEST-3, TR-A11Y-5 | The use cases were walked in a real browser (43 checks); turning that into a CI job needs the Docker-based local stack. |
| Coulds | FR-AC-8, FR-GR-8, FR-EV-9, FR-EV-10, FR-DS-8, FR-MD-7, FR-AD-3 | By definition. |

## Decisions — 8 October 2026

Sarah reviewed the Magic Patterns prototype of 8 October and brought these
into scope. Each still goes through its use case, user flow and review
before it is built. The guardrails are proposals that keep each one
inside the principles; they are written into the draft requirements and
can be changed at review.

| Now in scope | Was | Use case | Proposed guardrails |
| --- | --- | --- | --- |
| **Direct messages** | Out (ADR-0005) | UC-20 | First message is a request the other person accepts; decline and block; report; plain pages, no live updates, read receipts or online status; only the two people can read it. See [ADR-0006](./architecture/adr-0006-direct-messages). |
| **Group photo galleries** | Out (P5) | UC-21 | Inside a group only, members-only by default; images re-encoded; uploader and organizers can remove; reportable. |
| **Event prices** | Out ("no prices") | UC-10 | Plain text only (*Free*, *$10 trail fee*); the board never takes payment. |
| **Save for later** | Out ("RSVP is the save") | UC-22 | Private to the user; separate from *going*. |
| **Reminders with an unread count** | Out (P4) | UC-23 | One list on the signed-in home page; only things that need the user; the header count covers unread messages only; no email or push without opt-in. |
| **Waitlists and RSVP opening times** | Could / not planned | UC-17, UC-10 | Admins move people from the waitlist, nothing automatic; the opening time is stated plainly, no ticking countdown. |

From the same review, these fit the product and are drafted as use cases:
location and distance search with *Near you* (UC-14), a destinations map
(UC-15), member list privacy (UC-16), RSVP approval (UC-17), a calendar
(UC-18), replies to replies (UC-19), and group types with cover photos
(UC-24). Event photos, series and sponsors were already drafted as UC-10.

The [feature map](./feature-map) separates what is live in the branded app
from every new feature, with its use case, requirements and status.

**Cost of these decisions.** Together they roughly double the remaining
build. Direct messages and galleries also add moderation work for the
site admin, and storage for photos. The map needs an outside map provider
or a static image ([ADR-0007](./architecture/adr-0007-destinations-map)).
The visual refresh from the same design (logo, colors, type) is a small
fix and doesn't wait on any of this.

## Open questions

These need Sarah's decision before or during build:

- **Businesses on the board (UC-12).** The board was scoped to community
  groups, with outfitters and guide services listed under "who this board
  is not for". UC-12 would add business pages: services, locations, the
  places they operate, their own events. Decide whether that is in, and if
  so whether businesses can host events or only sponsor them.
- **Sponsors (UC-10, UC-12).** A sponsor's name and logo on an event is
  close to advertising, which is out of scope. A middle path: a small, plain
  "Sponsored by" credit on the event page only, never in lists, never
  affecting order.
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
  Carolina. The data model supports more regions later.
- **Who can create groups.** Anyone signed in (Meetup/Facebook model), or
  approved organizers only? Open is the default here with a per-user limit
  (FR-GR-7); approval is FR-GR-8 at Could.
- **Ship date.** None is set. The bike map showed a date is what gets a thing
  finished.
- **Name and domain.** Name settled 29 September 2026: **Branch Outdoors**.
  The domain is still open, and is needed before phase 5 for email sending (a
  verified domain is required).
- ~~**Railway account.**~~ Settled 25 September 2026: the Railway Hobby
  subscription is on Sarah's own account, so this project deploys there.
- **n8n subscription.** This project does not use n8n ([ADR-0004](./architecture/adr-0004-background-jobs-and-email)).
  Whether to keep paying for it depends only on the dashboard.
