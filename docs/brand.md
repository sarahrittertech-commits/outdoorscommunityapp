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

A plum twig with four leaves in Marigold, Ember and Rust, beside the
lowercase wordmark set in Young Serif (the 8 October Magic Patterns
version). The twig is about one and a half times the text height, and the
lockup shrinks on phones. It appears in the header and again in the footer.

| Use | In the app |
| --- | --- |
| Header lockup (mark + wordmark) | `src/app/layout.tsx`, mark in `src/components/BranchMark.tsx` |
| Favicon / app icon | `src/app/icon.svg` |

Don't stretch it, recolor the leaves outside the palette, outline or texture
the letters, or put it over busy photos.

## Color

Plum does the work: headings, links, buttons (the UI plum; the logo keeps the original). The autumn colors live in the
leaves and small highlights. Pages stay mostly paper (about 70% paper, 14% ink,
10% plum, 6% autumn accents).

| Name | Hex | Used for | Contrast on paper |
| --- | --- | --- | --- |
| Plum | `#39204D` | Wordmark and logo twig | 13.1:1 (AAA) |
| UI plum | `#382A63` | Headings, links, buttons (slightly bluer, from the 8 October design) | 12.5:1 on white (AAA) |
| Search orange | `#B94F1C` | The hero's Search button only, white text; hover `#A2441A` | 5.0:1 white on orange (AA) |
| Band | `#EFEDF7` | Light purple section bars in long lists (month headings) | — |
| Subtle | `#464B5E` | Line under page titles | 8.6:1 on white |
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

Scale: H1 42/1.1 (32 on phones), H2 26/1.2, H3 20 bold, body 18/1.55, small 15/1.45.

## Links and buttons

- Links are always underlined: UI plum, 1px; 2px on hover; visited `#6A4C93`;
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

- **The home page has a ridgeline line drawing.** The guide keeps images
  off the home page; the 8 October design's answer is a thin plum line
  drawing of the Blue Ridge with a few pines and an ember sun, on white,
  above the search fields (`src/brand/Ridgeline.tsx`, colors from the
  `--ridgeline` and `--sun` slots). It replaced the purple ridge band on
  9 October. The headline is bold plum sans, lowercase: *find your people.
  find your outdoors.* The hero's Search button is deep orange with white
  text, the design's choice (Sarah, 8 October; marigold and plum were the
  alternatives).
- **Filters fold away on phones.** On Events and Communities the side
  filters become a card at the top (*Browse by activity*, or *Change
  activity* once one is picked); filter headings are plum, underlined.
- **Activities are line drawings** (`src/components/ActivityIcon.tsx`), in
  the heading color, always beside their name.
- **Pages are white, not paper.** Paper (`#FAF6EF`) is used for panels, and
  there is no dark mode: the board looks the same in every setting.

## Representative photos

An event page shows a photo of its activity beside the details, always
captioned "<activity> · representative photo", never as the group's own
(`src/brand/activityPhotos.ts`, images from the 8 October design in
`public/activities/`). Activities without one keep their line drawing.

## Spacing

Stacked blocks on a page (headings, paragraphs, tags, sections) sit at
least 1rem (16px) apart by default, and a breadcrumb sits 1.5rem (24px)
above its page title (Sarah, 9 October 2026). The rule lives in
`src/app/globals.css` at zero specificity, so a page can still set its own
spacing on purpose.

## Alternate names

If the domain isn't available, the guide's system also works for
**trailpost**, **the clearing** and **common ground** (the last is widely used).
