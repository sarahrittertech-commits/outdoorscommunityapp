---
sidebar_position: 13
title: ADR-0012 Big regions over local areas
---

# ADR-0012 — Big regions over local areas

**Status:** Accepted · **Date:** 13 October 2026 (Sarah approved the eight-region grouping) · goes with UC-40

## Context

Regions (ADR-0010) are local areas: one or more hub towns and a 100-mile
radius, sized for "close enough to show up." Fourteen are live, from
Western North Carolina to Greater Boston. Two things now strain that:

- In the Southeast the areas sit side by side (Western NC, Charlotte,
  Greenville, Knoxville, the Triangle). Together they are about the size of
  one Colorado region, and people there routinely drive between them for a
  weekend.
- The list under *change* is getting long and has no shape. Sarah's town
  lists (12 October) already fall into the groupings travelers use.

## Options

### Make the areas bigger

Merge Western NC and Charlotte, and so on. Fewer, larger areas; but the
*Near you* row, the destinations map and "about 25 miles" stop meaning
anything, and every listing would have to move.

### Two levels: big regions over today's areas (recommended)

Keep every area as it is. Add a big region above it and let people browse
either level. Nothing moves; areas keep their towns, zips, maps and
radius; the big region is a grouping and a wider filter.

### Tags only

Label areas with a big region but offer no "all of the Southeast" view.
Cheapest, but it doesn't answer "what's on within a few hours."

## Proposed decision

Two levels. On the site the big ones are **regions** and today's ones
become **areas** (the word "region" moves up a level). Proposed grouping,
blending the Indy Pass regions with the usual outdoor regions:

| Big region | Areas live today | Areas that would open next (towns.json) |
| --- | --- | --- |
| **Southeast** (Southern Appalachians and Piedmont) | Western NC · Charlotte and Lake Norman · Raleigh and the Triangle · Greenville and the Upstate · Knoxville and East Tennessee | Atlanta and North Georgia · Coastal Carolinas · Kentucky · Nashville |
| **Mid-Atlantic** | New River Gorge | Shenandoah and Central Virginia · Potomac and Laurel Highlands · Washington and Harpers Ferry · Coastal Virginia · Philadelphia |
| **Northeast** | Burlington and Northern Vermont · Greater Boston | New Hampshire and Maine · Upstate New York and Pennsylvania |
| **Midwest and Great Lakes** | none yet | Lake Superior and the Northwoods · Driftless · Northeast Ohio |
| **Rockies** | Colorado Front Range · Durango and the San Juans · Wasatch | Colorado mountains · Montana and Wyoming · Idaho |
| **Southwest** | Sedona and Flagstaff | Canyon country · Southern Arizona · New Mexico · Las Vegas |
| **Far West and Sierra** | Reno and Tahoe | Eastern Sierra · California coast |
| **Pacific Northwest** | Seattle and Bellingham | Oregon · Eastern Washington |

Alaska and the Plains wait until there is research for them.

## Consequences

- A small table of big regions and one column on areas; the app's region
  list gains its big region. No listing, event or town moves.
- Events, Communities, Guides and shops and the activity pages take either
  level: an area as today, or a big region (all its areas, each listing
  marked with its area).
- Wording changes across the site and the docs: "region" becomes "area"
  for today's level. Worth doing in one pass, before more areas open.
- Opening an area (UC-35) now also names its big region.
- The women's clone (cloning.md) keeps the same two levels.

## As decided (13 October 2026)

- **Eight big regions**, as in the table above. The Indy Pass five and MT
  Sobek's six were weighed; the eight cover the East, where most areas are.
- **New River Gorge is in the Mid-Atlantic**, with the Virginias.
- **Words:** *region* for the big level, *area* for today's level, in new
  and changed text. The address keeps `?region=` for both, and the table is
  still `regions`; renaming existing text across the site is left for a
  separate pass.

## Built (13 October 2026)

`public.region_groups` and `regions.group_id` (migration
20261013000001), `src/config/regionGroups.ts` and each area's `group`;
`?region=<big region>` filters every list by that region's areas; the
header, the scope line on each list and the Regions page show both levels.
Tests PT-253 and PT-254, and resolver unit tests.
