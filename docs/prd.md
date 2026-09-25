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
| P4 | **Quiet by default.** Email only, opt-in beyond the essentials, one-click unsubscribe. | Push notifications, red badges, "you have 12 new…", streaks |
| P5 | **Text first.** Words and links do the work; images are optional. | Photo walls, infinite media scroll |
| P6 | **Light and fast.** Pages are plain HTML from the server and work on a weak phone signal. | Heavy client apps, spinners on every page, infinite scroll |
| P7 | **People over metrics.** Show useful facts (member count, next event), never vanity counts. | Likes, reactions, follower counts, leaderboards |

## Design direction

Craigslist's structure with a gentler, more modern finish. It should feel a
little nostalgic: the web when it was a helpful directory.

- The home page is one screen of categories and subcategories, text links in
  columns, each with a count. No hero image, no carousel.
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

Design is done in Magic Patterns and kept in its own repository, as the bike
map did. The build matches the design.

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

These are decisions, not a backlog:

- Feeds, timelines, "recommended" anything, ranking algorithms
- Likes, reactions, follower counts
- Ads, sponsored listings, paid tiers, payments, ticketing
- Real-time chat and direct messages between users (see [ADR-0005](./architecture/adr-0005-discussions))
- Push notifications and in-app notification badges
- Native mobile apps (the web app is responsive)
- Photo galleries, image uploads in posts
- Recurring event series
- AI features
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

| Phase | Delivers | Requirements |
| --- | --- | --- |
| 0 — Decide | ADRs accepted, open questions answered, design mock | — |
| 1 — Skeleton | Next.js on Railway, Supabase schema + RLS + permission tests, seeded categories, read-only browse pages over seed groups | FR-BR-1, 2, 6, 7, 8 |
| 2 — People | Magic-link sign-in, profiles, create group, join/leave, roles | FR-AC-*, FR-GR-*, FR-MB-* (Must) |
| 3 — Events | Create/edit/cancel events, RSVP, my stuff | FR-EV-* (Must) |
| 4 — Talk and safety | Discussions, reporting, admin queues, rate limits | FR-DS-*, FR-MD-* (Must) |
| 5 — Launch | Supabase Pro, custom domain, email sending, legal pages, seed real groups | TR-OPS-*, FR-MD-5 |
| After launch | Shoulds, in order of the persona they serve most | — |

Build the permission tests in phase 1, before any feature that depends on
them. They are the part of this project most likely to be wrong silently.

## Open questions

These need Sarah's decision before or during build:

- **Audience.** The bike map's docs refer to "the women's outdoor community
  app". Is this that app? A women-focused board changes the personas, the
  moderation policy and possibly who can join groups. Everything here is
  written audience-neutral until that is answered.
- **Geography.** One region at launch (Western North Carolina, around
  Brevard/Asheville) or open to anywhere? The data model supports regions
  either way; the recommendation is one region, because an empty board in
  fifty cities looks abandoned and a full board in one looks alive.
- **Who can create groups.** Anyone signed in (Meetup/Facebook model), or
  approved organizers only? Open is the default here with a per-user limit
  (FR-GR-7); approval is FR-GR-8 at Could.
- **Ship date.** None is set. The bike map showed a date is what gets a thing
  finished.
- **Name and domain.** Needed before phase 5 for email sending (a verified
  domain is required).
- **Railway account.** Confirm the Railway Hobby subscription is active on
  Sarah's own account (the dashboard's production Railway service may belong
  to a client).
- **n8n subscription.** This project does not use n8n ([ADR-0004](./architecture/adr-0004-background-jobs-and-email)).
  Whether to keep paying for it depends only on the dashboard.
