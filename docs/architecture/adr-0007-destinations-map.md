---
sidebar_position: 8
title: ADR-0007 Destinations map
---

# ADR-0007 — How to draw the destinations map

**Status:** Accepted · **Date:** 8 October 2026 · built 9 October 2026

## Context

UC-15 shows places (crags, trailheads, put-ins) on a map with a list
beside it. A map needs map tiles: the background imagery of roads, rivers
and terrain. The board's rules make this a real decision:

- No third-party tracking (TR-PRIV-2) and a Content Security Policy that
  allows scripts only from the site itself (TR-SEC-7).
- Pages are light, server-rendered and work without JavaScript (P6,
  TR-PE).

## Options

### A hosted map service (Google Maps, Mapbox)

Polished and familiar. Against it: their scripts load from outside and
can track visitors, they need an account and an API key, and they can
cost money as use grows.

### OpenStreetMap tiles with a small open-source map library

Free map data. The library is bundled with the site, so the Content
Security Policy only needs to allow loading tile images from the tile
provider. Against it: the public OpenStreetMap tile servers aren't meant
for production sites, so it needs a tile provider with a free tier or a
small paid plan. It also needs JavaScript; the list is the fallback.

### A static map image, plus the list

One server-made image per activity with numbered pins matching the list.
No JavaScript and no outside script. Against it: no panning or zooming.

## Decision (proposed)

**OpenStreetMap tiles with a bundled library, from a tile provider with a
free tier, and the list always on the page.** The list carries all the
information on its own (FR-BR-17), so the map is an extra, not a
requirement. If the provider can't serve tiles without cookies or
tracking, fall back to the static image.

## Consequences

**Good:** a real, pannable map with no outside scripts and no visitor
tracking. Works the same for the women's clone with a different starting
point.

**Bad:** one new outside service and its key. The map is the one part of
the home page that needs JavaScript. Places need coordinates, so the
places list (FR-BR-16) must be built first.

## As built (9 October 2026)

Leaflet 1.9.4 is bundled with the site and loaded only on the home page.
Tiles come from OpenStreetMap's own servers (`site.mapTiles` in
`src/config/site.ts`), which allow light use with attribution; the CSP
allows images from that host and nothing else. Before traffic grows, move
to a tile provider's free tier by changing that one setting. The map shows
towns with upcoming events until the places list (FR-BR-16) exists.
