---
sidebar_position: 12
title: ADR-0011 Event sources
---

# ADR-0011 — Event sources: read feeds first, AI only where there is none

**Status:** Proposed · **Date:** 12 October 2026 · goes with UC-39 (draft)

## Context

Sarah's priority is the most complete list of events per region. So far,
research has been a web search per town (Gemini, then Claude) followed by
a check of every link. What that showed:

- AI search invents things. In Greenville, Durango and Raleigh, Gemini
  named groups that don't exist, wrong websites and trail days no one
  scheduled. The checking step, not the search, produced the good data.
- Real events come from a short list of places per region: race sign-up
  sites, Meetup, state park program pages, and club and shop calendars.
- Nothing remembers where an event came from, so each refresh starts over
  and pays for the same search again.
- The free Gemini API can't search the web any more (paused 12 October),
  and Claude credits are the budget.

## Options

### Keep searching the web each time

What we do now. Simple, but it costs credits every run, finds the same
events again, and keeps letting invented data in for the checker to catch.

### Track sources, and read them the cheapest way that works (proposed)

Each listed host gets one or more **event sources**: a page or feed where
it posts dates, with its kind, when it was last read and how many real
events it gave. A weekly reader goes through them:

1. **Feeds and open data first**, with no AI: calendar feeds (iCal) that
   many club websites publish, and sign-up sites that offer open data.
   This costs nothing per run and copies dates exactly.
2. **AI only for pages without a feed**, once a week, copying only what
   the page shows (the weekly research agent, UC-9).
3. **Annual events by their calendar.** Past editions are kept as
   watched events; their page is read only as the next edition's window
   comes up, a few times a year.
4. **Web search only to find new sources**, when a region opens or a
   region looks thin, not to find events.

Which sign-up sites and Meetup pages offer usable feeds is checked when
building, not assumed here.

### Pay for an events data provider

Commercial event APIs exist, but they cover ticketed and big events, not
Saturday club rides, and cost money every month. Not now.

## Decision (proposed)

Track sources and read feeds first. Publishing stays as it is: only events
from a host's own page, feed or official sign-up page, with a date and a
time, for a host already listed, reach the board without review.

## Consequences

- One new admin-only table (event sources), readable and writable only by
  the site admin, with tests like every other table. Visitors see nothing
  new except more events.
- A weekly scheduled function reads the feeds (ADR-0004); the AI part
  stays in the existing research agent, so there's no new service.
- Coverage per region becomes a number (hosts with a source, sources read
  this week, upcoming events) for the admin page and the business plan.
- The same organization records can later carry sponsor and partner
  roles (the business side Sarah raised on 12 October), without changing
  the board.
- Cost: feeds are free; the AI part is bounded by the number of pages
  without a feed, read weekly, instead of a web search per town.
