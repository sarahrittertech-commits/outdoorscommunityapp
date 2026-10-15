---
sidebar_position: 9
title: Session log
---

# Mobile app: session log

A record of the working sessions behind the mobile drafts, so the reasoning
survives outside the chat. Newest last.

## 14 October 2026: the request and the first drafts

**Sarah's request (paraphrased closely):** now that the app is fairly
stable, make a mobile app for it. It needs a lot of work on easy
navigation over the large lists, with good use of cards and trays to slide
things around, and filters. Useful features for someone in a group:
managing their calendar and replying to messages, and the same for group
admins. Browsing would be very difficult on a phone, so ask for a zip code
or home town and state, then have the person pick their area. Let people
build out their profile: *I currently like hiking and camping but I want to
try climbing*, so the app can show local events and groups that match
their skill level, and intro events (*intro to mountain biking*) for what
they want to try. Wireframe the app as a member and as a group admin, and
think through the UX patterns and the design system: modern patterns for
collapsible navigation, filters and sorts; few graphics; focus on how easy
it is to find an event by place and activity, and on browsing this
weekend, this week and what's coming up.

**Follow-up the same session:** keep the mobile requirements in their own
folder, written for the tool as a whole, as community event management.

**What was found before drafting:**

- The PRD lists *native mobile apps* as out of scope ("the web app is
  responsive"), and ADR-0001 chose a server-rendered web app on purpose.
- Principle P2 rules out "recommended for you"; P4 rules out push
  notifications; P6 rules out infinite scroll.
- Events have no level field; *Beginners welcome* is only a group
  subcategory. The profile has *activities I enjoy* but no levels and no
  *want to try*.
- CLAUDE.md requires a reviewed use case and flow before any build.

So the session drafted everything for review and built nothing.

**What was produced** (PR
[#135](https://github.com/sarahrittertech-commits/outdoorscommunityapp/pull/135),
branch `claude/mobile-app-docs`):

| File | What it is |
| --- | --- |
| [index.md](./index) | Purpose, scope, the five decisions below |
| [use-cases.md](./use-cases) | MUC-1 to MUC-8 |
| [user-flows.md](./user-flows) | One diagram per use case |
| [functional-requirements.md](./functional-requirements) | FR-MO, by area |
| [technical-requirements.md](./technical-requirements) | TR-MO |
| [design-system.md](./design-system) | Navigation, trays, chips, long lists, cards, tokens, components |
| [screens.md](./screens) | Screen inventory, member and organizer |
| `wireframes.html` | Clickable wireframe, member and page-admin views. A hosted copy is in Sarah's private artifacts |
| [adr-m01-platform.md](./adr-m01-platform) | Installable web app vs native app (Proposed) |

The PRD's out-of-scope line, the ADR index, the feature request log and
CLAUDE.md each got a pointer to this folder.

**The shape of the app, in short:**

- Five tabs: *Events*, *My week*, *Groups*, *Inbox*, *Me*.
- Setup: zip code or town, then pick the area; then *I do this* (with a
  level) or *I want to try this* per activity, skippable.
- *Events* is the home screen: *This weekend · This week · Coming up*,
  activity chips (*Everything*, *My activities*, *Try something new*, each
  activity), a summary line saying exactly what the list holds, and
  *Filters* and *Sort* in trays. Days have sticky headings that fold. Lists
  end with *Show 30 more*, never infinite scroll.
- Organizers get no separate mode: *Needs you* at the top of *Inbox* (join
  and RSVP requests, reports; swipe or buttons, with undo) and *Run this
  group* on each group they run (Manage RSVPs, post an update, post an
  event by copying a past one).
- Browsing the whole directory, creating groups and group settings stay on
  the web.

**Decisions waiting on Sarah** (recommended answer first):

| # | Question | Recommended |
| --- | --- | --- |
| D1 | Native app or not | An installable phone-first web app in the same code (ADR-M01); a store wrapper (Capacitor) can come later |
| D2 | Push notifications (P4) | Keep P4: a plain count on *Inbox*, nothing on the lock screen |
| D3 | Suggestions (P2) | *Try something new* is a filter the person set and the screen names; same settings, same list |
| D4 | Event level | Add an optional level: Intro, All levels, Some experience, Experienced (web too) |
| D5 | Profile levels | Each profile activity gets *do* or *want to try*, and a level, under Show/Hide |

**Next step once Sarah decides:** finish the requirements to her answers,
then build the phone layout and the two migrations (`events.level`;
`profile_activities.stance` and `.level`) with their permission tests.
