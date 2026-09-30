---
sidebar_position: 12
title: Brand
---

# Brand

**branch outdoors** — a plain, friendly board for finding people to go outside
with. This page summarizes the brand guide (v2, September 2026, made in Claude
Design) as it is built into the app. The guide itself lives in Sarah's Claude
Design project, not in this repository.

The brand should feel like the helpful web of a few years ago: clear lists,
readable text, links that look like links.

## Logo

A clean plum branch with leaves in Rust, Marigold and Ember, beside the
lowercase wordmark set in Young Serif.

| Use | In the app |
| --- | --- |
| Header lockup (mark + wordmark) | `src/app/layout.tsx`, mark in `src/components/BranchMark.tsx` |
| Favicon / app icon | `src/app/icon.svg` |

Don't stretch it, recolor the leaves outside the palette, outline or texture
the letters, or put it over busy photos.

## Color

Plum does the work: headings, links, buttons. The autumn colors live in the
leaves and small highlights. Pages stay mostly paper (about 70% paper, 14% ink,
10% plum, 6% autumn accents).

| Name | Hex | Used for | Contrast on paper |
| --- | --- | --- | --- |
| Plum | `#39204D` | Wordmark, headings, links, buttons | 13.1:1 (AAA) |
| Ember | `#DD7242` | Leaves, small highlights, illustrations | 3.0:1 — graphics only |
| Marigold | `#E7A855` | Leaves, "new" tags as a tint | 1.9:1 — decorative only |
| Rust | `#B43C34` | Leaves, errors, cancelled events | 5.4:1 (AA) |
| Lake | `#50759F` | Focus rings, notices | 4.4:1 — large text and UI |
| Ink | `#2A2230` | Body text | 14.2:1 |
| Muted | `#6B6072` | Secondary text | 5.5:1 |
| Rule | `#E4DACB` | Borders | — |
| Paper | `#FAF6EF` | Page | — |
| White | `#FFFFFF` | Cards, form fields | — |

Ember and Marigold never carry text or links. Every color is a token at the top
of `src/app/globals.css`. The page itself is white (see below), and there is no
dark mode.

## Type

Two free Google fonts, self-hosted at build time so pages make no requests to
Google.

| Font | Used for |
| --- | --- |
| **Young Serif** (one weight) | Wordmark, H1, H2. Sentence case or lowercase. |
| **Atkinson Hyperlegible** (400, 700) | H3, body, labels, buttons, data. Bold for emphasis, not color. |

Scale: H1 36/1.15, H2 26/1.2, H3 20 bold, body 18/1.55, small 15/1.45.

## Links and buttons

- Links are always underlined: plum, 1px; 2px on hover; visited `#7A5A93`;
  focus is a 3px Lake ring.
- Buttons are for actions (join, RSVP, save); links are for going somewhere.
  One primary (plum) button per page; secondary is outlined; destructive is
  Rust.

## Voice

Write like a friendly trail steward posting on a notice board: useful facts
first, no pressure. Plain, calm, local, welcoming.

| Write | Not |
| --- | --- |
| Next event: Sat 12 Oct, 6:15 am | Don't miss out on this epic adventure! |
| 14 going · 6 spots left | Hurry, spots are filling fast! |
| Sign in to RSVP. We'll email you a link. | Unlock the full experience |
| Groups, sorted A–Z | Recommended for you |

## Where the app differs from the guide

- **The home page has a ridgeline hero.** The guide keeps images off the home
  page. Sarah chose the Magic Patterns layout: a full-width band of layered
  Blue Ridge silhouettes (drawn as SVG, colors from the `--ridge-*` tokens)
  behind the heading and search (`src/components/RidgeBand.tsx`). The hero's
  Search button is ink on Marigold, an approved pairing, so it stands out on
  plum.
- **Activities are line drawings** (`src/components/ActivityIcon.tsx`), in
  the heading color, always beside their name.
- **Pages are white, not paper.** Paper (`#FAF6EF`) is used for panels, and
  there is no dark mode: the board looks the same in every setting.

## Alternate names

If the domain isn't available, the guide's system also works for
**trailpost**, **the clearing** and **common ground** (the last is widely used).
