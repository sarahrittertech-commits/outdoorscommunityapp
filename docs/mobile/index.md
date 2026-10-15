---
sidebar_position: 1
title: Mobile app
---

# Mobile app

> **Draft, awaiting review.** Requested by Sarah on 14 October 2026: now that
> the board is stable, a mobile app with easy navigation over large lists,
> cards and trays, filters and sorts; set up around a zip code or town and an
> area; a profile of what someone does and wants to try, at what level, so
> the app can show them intro events; and the group and calendar work that
> members and organizers do on a phone. Nothing here is built. Each use case
> waits for Sarah's go (CLAUDE.md: no build without a reviewed use case and
> flow).

Everything about the mobile app lives in this folder, separate from the web
board's documents. It is written for **the tool**, community event
management, so every board made from this code (Branch Outdoors, Sage
Women) gets the same app with its own name, activities, colors and areas
([Cloning](../cloning)). Outdoor examples are Branch Outdoors'.

## What the app is for

The web board is a directory: someone arrives from a link or a search,
reads a group or event page, and leaves. A phone is used differently. The
app is for the two jobs people do on a phone:

1. **Find something to do soon, near where they are, in an activity they
   do or want to try.** *What's on this weekend within 25 miles?* *Is there
   an intro to mountain biking anywhere this month?*
2. **Keep up with the groups they're in.** Their week, the events they're
   going to, replies in their groups' threads and their messages; and, for
   organizers, the join requests, RSVP requests and reports that need them.

Browsing the whole directory (every category, every area, every group A to
Z) stays on the web. On a phone it is a long list nobody finishes. The app
asks where someone lives once, then shows that area.

## Documents

| Document | What it holds |
| --- | --- |
| [Use cases](./use-cases) | MUC-1 to MUC-8: actor, trigger and the main path only |
| [User flows](./user-flows) | One diagram per use case: the screens and decisions |
| [Functional requirements](./functional-requirements) | FR-MO: the alternative paths and edge cases, each with *accepted when*. Draft until the use cases are approved |
| [Technical requirements](./technical-requirements) | TR-MO: performance, offline, accessibility, security |
| [Design system](./design-system) | Navigation model, UX patterns (cards, trays, filters, sorts, long lists), tokens and components |
| [Screens](./screens) | Every screen for a member and an organizer, with the clickable wireframe |
| [ADR-M01 Platform](./adr-m01-platform) | Installable web app or native app, and what each costs |
| [Session log](./session-log) | What was asked, what was found, and what is waiting on a decision, per working session |

The clickable wireframe is `docs/mobile/wireframes.html`: one file, no
build step, opened straight in a browser. The pull request links a hosted
copy.

## Decisions Sarah needs to make

Each of these changes a decision already written in the PRD, so none is
assumed here. The recommended answer is marked; the documents are written
to it and say where a different answer would change them.

| # | Question | Recommended | What the other answer costs |
| --- | --- | --- | --- |
| D1 | **Platform.** The PRD lists *native mobile apps* as out of scope and ADR-0001 chose the web. | **An installable phone-first web app (PWA)** in the same Next.js code, at the same addresses, with an app layout below 768 px wide. See [ADR-M01](./adr-m01-platform). | A native app (Expo / React Native): a second codebase, App Store and Google Play accounts and reviews, and the server-side form checks moved into the database or a new API. |
| D2 | **Notifications to the phone.** Principle P4 rules out push notifications. | **Keep P4.** The app shows a plain count on the *Inbox* tab (as the header does for unread messages today) and nothing reaches the lock screen. | Opt-in push for organizers (join and RSVP requests) and for direct messages: amends P4, needs a push service and a settings screen, and makes the board louder. |
| D3 | **Suggestions.** Principle P2 rules out "recommended for you". | **Suggestions are a filter the person set and the screen names**: *Intro events · Climbing · within 25 miles of Asheville*, soonest first, the same list for anyone with the same settings. Nothing is ranked or learned from behaviour. | Ranked or learned suggestions: reverses P2. |
| D4 | **Event level.** Events have no level today; *Beginners welcome* is a group subcategory. | **Add an optional level to events** (*Intro: first-timers welcome*, *All levels*, *Some experience*, *Experienced*), set by the organizer; the web board shows it too. | Without it, *Try something new* can only match groups in *Beginners welcome* and words in titles, which misses most intro events. |
| D5 | **What I do and want to try.** The profile has *activities I enjoy*. | **Each activity gets *I do this* or *I want to try this*, and a level** (*New to it*, *Getting comfortable*, *Experienced*), under the existing Show/Hide setting. | Keep only *activities I enjoy*: *Try something new* has nothing to work from. |

## Scope

**In:** the eight use cases; the navigation, trays, filters and sorts in
the design system; the event level (D4) and profile levels (D5), which the
web board also uses.

**Out (the PRD's rules hold):** feeds, ranking, likes, follower counts,
streaks, red-dot badges, real-time chat, typing indicators, read receipts,
the device's location (the app asks for a zip code or town, as the web
does), maps as the main way to browse, ads, and creating groups or editing
group settings on a phone (they stay on the web; the app links there).

## Relationship to the web board

- **Same accounts, same data, same permissions.** The app reads and writes
  the same Supabase database through the same row-level security. Nothing a
  member can't do on the web becomes possible in the app.
- **Same addresses.** An event or group link opens the same page in the app
  or a browser.
- **The web documents still govern the web.** These documents add to them;
  where a mobile requirement changes the web (D4, D5), it is marked
  *also web* and lands in the main [functional requirements](../functional-requirements)
  when built.
