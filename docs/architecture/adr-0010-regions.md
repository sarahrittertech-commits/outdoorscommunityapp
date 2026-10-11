---
sidebar_position: 11
title: ADR-0010 Regions
---

# ADR-0010 — One board, many regions

**Status:** Accepted · **Date:** 11 October 2026 (accepted by Sarah in auto
mode and built the same day) · changes the *Geography* decision of
25 September 2026 (PRD) and the region part of [Cloning](../cloning)

## Context

The board launched for one region, Western North Carolina: the town list,
zip codes, map starting point and home-page wording were all set for it in
`src/config`, and a second region was expected to be a *clone*, a separate
deployment. The data model already had a `regions` table and every group a
`region_id`, but nothing filtered by it.

On 10 and 11 October Sarah researched clubs, venues and shops in dozens of
cities (Gemini, UC-9) and found the same communities overlapping across
them, especially in mountain biking and climbing. She asked to take the
board national, region by region, starting with Denver and Boulder,
Raleigh, Seattle and Bellingham, Fayetteville (West Virginia) and
Knoxville, alongside Western North Carolina.

## Options

### A deployment per region (the cloning plan)

Each region a separate copy of the site with its own database. Simple
code, but six copies to deploy, six databases on Supabase's plan (two
free), and members who ride in two regions need two accounts. Clones stay
the right answer for a different *audience* (the women's board), not a
different place.

### One board, regions as data (chosen)

One deployment and one database. A region is a row: a name, one or more
hub cities, a centre, a radius (100 miles by default), a time zone, a
status (*live* or *coming soon*) and an order. Every group belongs to one
region. Visitors look at one region at a time and can switch.

### No regions: just distance from wherever you are

Drop regions and let every page be "within N miles of a town". Most
flexible, but there is nothing to land on: the home page, the activity
pages and the map need a starting place, and Sarah opens areas
deliberately, after research, which a region captures.

## Decision

One board, regions as data.

- **Which region a visitor sees:** a `?region=` link wins (so shared links
  open the same view), then the region they chose before (a first-party
  cookie, `region`, kept a year), then a signed-in member's home-town
  region, then Western North Carolina. The choice is never stored on an
  account or sent anywhere else.
- **What follows the region:** the home page (hero line, *Near you*, the
  destinations map's centre and towns), Communities, Events, the activity
  pages and search. Activity pages and search offer *All regions*.
- **Towns and zip codes:** the bundled town list grows region by region;
  each town names its region. Zip codes outside Western North Carolina are
  matched by their first three digits to a nearby town, so a zip search is
  approximate there (town-centre distances already are).
- **Groups:** an organizer picks the region on the group form; the site
  admin picks it when listing a researched candidate. Only *live* regions
  can be chosen; the database refuses the rest.
- **Time zones:** each region has one; a new event defaults to its group's
  region's zone. Pages that show dates without an event of their own (the
  admin page, inboxes) still use the board's default zone.
- **Opening a region** is a migration plus town-list entries, then
  research and listing ([runbook](../runbook#opening-a-region)).

## Consequences

- One account works everywhere; a member can join groups in several
  regions.
- Research data for many more cities can sit in the private research
  tables before its region opens; nothing is public until it is listed.
- The free OpenStreetMap tiles were fine for one region; national traffic
  makes moving to a tile provider's free tier more pressing
  ([ADR-0007](./adr-0007-destinations-map)).
- Moderation load grows with each region. The site admin is still one
  person; first-group review (UC-27) and the research review keep listings
  deliberate.
- The town list is hand-made per region. A full national place and zip
  list (Census gazetteer) would make search work anywhere; it waits until
  a region needs it.
