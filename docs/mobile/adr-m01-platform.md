---
sidebar_position: 8
title: ADR-M01 Platform
---

# ADR-M01 — How to build the mobile app

**Status:** Proposed · **Date:** 14 October 2026 · decides D1 in the
[mobile overview](./index)

## Context

Sarah asked for a mobile app (14 October 2026) for finding events by
place, activity and time, and for the group, calendar and message work
members and organizers do on a phone. Two earlier decisions stand in the
way of a native app:

- ADR-0001 chose a server-rendered web app because a directory has to be
  reachable by a link, and pages have to work on a weak signal and without
  JavaScript.
- The PRD lists *native mobile apps* as out of scope ("the web app is
  responsive").

Today's responsive pages stack the desktop columns. They are usable but
were not designed for a thumb: filters are a card at the top of the page,
lists are long, and there is no tab bar.

The board is a solo, part-time portfolio piece that will be cloned for
the women's board. Whatever is chosen is built twice over its life (once
per board) unless it lives in the shared code.

## Options

### A. Installable phone-first web app (PWA) in the same code — recommended

Design the phone layout properly: tab bar, trays, chips, sticky day
headings. Same Next.js routes, same server actions, same RLS. A web app
manifest and a small service worker let people add it to their home
screen, where it opens full screen like an app.

- **Costs:** the design and build of the phone layout (the same work any
  option needs) and a service worker. No store fees, no reviews.
- **Gets:** every link still works; the women's board gets the app for
  free; permissions, Zod checks and tests carry over unchanged; one place
  to fix bugs.
- **Gives up:** no App Store or Google Play listing, which is a weaker
  "I shipped a mobile app" signal on a portfolio; iPhone home-screen web
  apps have rough edges (no install prompt, storage can be cleared after
  weeks unused); gestures are good but not native-smooth.

### B. Native app with Expo (React Native)

A separate app in the stores, talking to the same Supabase database.

- **Costs:** a second codebase and CI; Apple Developer ($99 a year) and
  Google Play ($25 once) accounts and their reviews for every release; the
  forms' server-side checks live in Next.js server actions, which a native
  app can't call, so each one the app needs becomes a database function or
  an API route running the same Zod schema; the women's board needs its
  own store listings.
- **Gets:** the strongest portfolio signal, native gestures and pickers,
  and push notifications if P4 is ever changed.
- **Gives up:** the "reachable by a link" principle inside the app, and
  the bike map's rule that the two projects share no code (it doesn't
  prevent Expo, but the bike map's Expo setup can't be reused).

### C. Wrap the web app in a store shell (Capacitor)

The PWA from option A inside a thin native shell, published to the
stores.

- **Costs:** option A plus store accounts and reviews; Apple rejects apps
  that are "just a website" unless they add native value.
- **Gets:** a store listing without a second codebase.

## Recommendation

**Option A now; keep C open.** It answers every use case in this folder,
keeps the board's principles (P1 browse first, P6 light and fast) and the
cloning promise, and costs the least to maintain. If a store listing
matters later (for the portfolio or for reach), option C adds one on top of
the same code. Option B is right only if the app is meant to become its own
product with push notifications, which would also mean changing P4.

## Consequences if accepted

- The PRD's *Native mobile apps* line becomes *Native store apps (the board
  is an installable web app; see ADR-M01)*, and *Mobile works by stacking
  the same columns* is replaced by the [design system](./design-system)'s
  phone layout.
- ADR-0001 stands.
- The phone layout replaces today's stacked layout below 768 px wide, for
  everyone, installed or not.
