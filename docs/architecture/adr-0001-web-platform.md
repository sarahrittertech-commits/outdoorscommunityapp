---
sidebar_position: 2
title: ADR-0001 Web platform
---

# ADR-0001 — Build a server-rendered web app with Next.js

**Status:** Proposed · **Date:** 25 September 2026

## Context

The board is a public directory first and an app second. Most visits will be
someone arriving from a search engine or a shared link, reading a group or
event page, and leaving. The product principles require pages that work
without an account, load fast on a weak signal and work without JavaScript
(P1, P6).

Signed-in features — joining, RSVPs, posting, admin screens — are forms, not
rich interactive tools.

It must be a web app, not a native mobile app: the bike map already proves
mobile shipping, and a directory needs to be reachable by a link.

## Options

### React + Vite single-page app (the dashboard's stack)

Familiar: the dashboard is built this way and it works well there. Against it:
a single-page app sends an empty page and builds it in the browser with
JavaScript. For a logged-in dashboard that's fine. For a public board it
means search engines and link previews see nothing useful, first load waits
for the whole app, and nothing works with JavaScript off. It fails P6 by
design.

### Next.js (App Router)

React, so the dashboard experience carries over, but pages are rendered to
HTML on the server. Forms can post to server actions and work without
JavaScript. It is the framework with the most documentation, the best
Supabase support (`@supabase/ssr`) and the one AI coding tools know best.
Widely recognized by reviewers, which matters for a portfolio piece.

Against it: large and fast-moving; its caching rules are a known source of
confusion. Runs best on Vercel, though it runs fine on any Node host.

### React Router framework mode (formerly Remix)

Built around exactly what this board needs: server-rendered pages and plain
HTML forms that JavaScript only enhances. Smaller and simpler than Next.js.
Against it: less documentation, fewer examples with Supabase, and less
recognizable on a portfolio.

### Astro

Excellent for content sites: ships almost no JavaScript by default. Against
it: the signed-in half of this board (forms, sessions, per-user pages) is
where Astro is weakest, and it would likely end up with a second framework
inside it.

### Expo web (the bike map's stack)

Would reuse mobile knowledge. Against it: Expo's web output is a single-page
app with the same problems as Vite, and the bike map's docs rule out sharing
code with this project anyway.

## Decision

**Next.js with the App Router, TypeScript and Tailwind, rendering every public
page on the server.**

React Router framework mode was the close second and is arguably the purer
fit for the "old web" brief. Next.js wins on documentation, Supabase support,
AI-tool fluency and portfolio recognition — all of which matter more for a
solo builder than elegance.

## Consequences

**Good:** public pages arrive as finished HTML, so they are fast, findable and
work without JavaScript. One framework for public and signed-in pages. React
and Tailwind experience from the dashboard carries straight over.

**Bad:** more framework than the board strictly needs. Next.js caching must be
handled deliberately: pages that show per-user data must never be cached and
served to someone else.

**Mitigation:** keep to a small subset — server components, server actions,
route handlers. No client-side data fetching libraries. Listing pages cache
for at most 60 seconds (TR-PERF-5); anything signed-in is never cached.

## Revisit if

Next.js's hosting requirements start forcing Vercel, or the framework proves
to be the main source of bugs. React Router framework mode is the fallback,
and the Supabase schema, permissions and tests carry over unchanged.
