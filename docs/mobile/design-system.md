---
sidebar_position: 6
title: Design system
---

# Mobile design system

> **Draft** (14 October 2026). The phone layout's navigation, patterns,
> tokens and components. It builds on the board's [brand](../brand) and
> its color slots in `src/brand/tokens.css`; it adds no colors, only new
> roles for existing ones, so a cloned board re-skins the app by replacing
> that one file. See it working in the clickable wireframe
> (`docs/mobile/wireframes.html`).

## Principles

1. **Where, what, when, first.** Every finding screen starts from the
   person's area, an activity and a time window. Nothing has to be browsed
   to find something to do this weekend.
2. **Say what the list is.** Every list has a one-line summary of what it
   holds and how it's sorted. Filters show as removable chips. No hidden
   ranking (P2).
3. **Trays, not pages, for choices.** Filters, sorts, the area picker and
   quick actions slide up from the bottom over the list they change, so
   the person never loses their place. Pages are for things (an event, a
   group, a conversation).
4. **One thumb.** Primary actions sit in the bottom third: the tab bar, a
   tray's button, the event's *Going* bar, the reply box.
5. **Lists end.** No infinite scroll, no auto-loading. *Show 30 more* and
   *That's everything* (P6).
6. **Quiet.** One number on one tab. No red dots, no streaks, no "people
   also viewed" (P4, P7).
7. **Text first, drawings for recognition.** Activity line drawings beside
   their names; no photos in lists (P5).

## Navigation model

```
┌──────────────────────────────┐
│ Hendersonville · W. Carolinas▾ 🔍 │  top bar (collapses on scroll)
├──────────────────────────────┤
│ [This weekend][This week][Coming up] │  when (segmented, sticky)
│ (Everything)(My activities)(Try new)(🥾 Hiking)… │  chips (scroll sideways)
│ 14 events · this weekend · 25 mi · soonest  [Filters 2][Sort] │
├──────────────────────────────┤
│ SATURDAY 17 OCT · 9 ▾        │  sticky day heading, folds
│ ┌──────────────────────────┐ │
│ │ 8:00 am · Day hike        │ │  event card
│ │ …                         │ │
├──────────────────────────────┤
│ Events  My week  Groups  Inbox 3  Me │  tab bar
└──────────────────────────────┘
```

| Tab | Member sees | Organizer also sees |
| --- | --- | --- |
| **Events** | When control, activity chips, filter and sort trays, day list | — |
| **My week** | Week strip and the days' going, saved and asked-to-go events | Events they host, marked *You're hosting* |
| **Groups** | *Mine* (next event, newest thread), then *In this area* A–Z with a letter index | *Run this group* on groups they run |
| **Inbox** | *Messages*, *Requests* | *Needs you* at the top: join and RSVP requests, reports |
| **Me** | Profile, *What I do*, area and town, saved events, settings, sign out | *Groups I run* |

Organizers get no separate app or mode: what they run appears where it
belongs (*Needs you* in Inbox, *Run this group* on the group). A member who
becomes a page manager sees nothing move.

## Patterns

### When control

A three-part segmented control: **This weekend · This week · Coming up**.
It sticks under the top bar. *Pick dates* lives in the filter tray, and
when used, the control shows *Custom: 24–31 Oct ✕*.

### Chips

- **Activity chips** scroll sideways in one row, single choice, the chosen
  chip filled in plum with white text, the others outlined. *Everything*,
  *My activities* and *Try something new* come first, then activities with
  their drawings. Choosing an activity reveals a second row for its
  subcategories.
- **Filter chips** under the summary line show each active filter with a
  ✕ to remove it. *Clear all* appears when there are two or more.

### Summary line

`14 events · this weekend · Paddling · within 25 mi · soonest first`, in
the muted color, always above the list. It is a live region, so screen
readers hear it change.

### Trays

A tray is a sheet that slides up from the bottom over a dimmed screen.

| Part | Rule |
| --- | --- |
| Heights | *Half* (sort, quick actions, area) or *tall* (filters, what I do); tall trays scroll inside |
| Top | A drag handle, the title, and a *Close* button |
| Bottom | One full-width primary button that says what happens: *Show 5 events*, *Save*; a secondary text button on the left (*Clear all*) |
| Closing | Drag down, tap the dim area, *Close*, *Escape*, or the primary button |
| Focus | Moves into the tray; held there; returns to the button that opened it |
| No JavaScript | The same controls as a `<details>` panel at the top of the list, or their own page, submitting a plain form |

Trays used: **Filters**, **Sort**, **Area** (town and area), **What I do**
(per activity), **Sign in** (when a signed-out person taps *Going* or
*Save*), **Event actions** (share, add to calendar, report).

### Long lists

| List | Pattern |
| --- | --- |
| Events | Grouped by day; sticky, foldable day headings with counts; *Show 30 more*; *Jump to date* in *Coming up* |
| Groups in an area | A–Z with letter headings and a letter index along the right edge; activity chips above |
| Members (organizers) | Search field first, then A–Z; role labels |
| Messages | Newest first, unread bold; no previews of blocked people |

Scroll position, folded days and filters survive opening an item and
coming back.

### Cards

One card per item, the same layout for every item of a kind. Cards are
white on the panel color with a 1 px rule border and a 12 px radius; no
shadows except on trays.

**Event card**

```
8:00 am – 1:00 pm                      [☆ Save]
Waterfall loop at Graveyard Fields
Blue Ridge Hiking Club · 🥾 Hiking
Graveyard Fields lot · 18 mi
[Intro] [Free] 6 spots left            ✓ Going
```

**Group card**: name, type drawing and type, activities, *Next: Sat 24
Oct*, member count, *Member* or *Run this group* if so.

**Request card** (organizers): name, profile card summary (town, what
they do), the join question's answer, *Approve* and *Decline* buttons.
Swipe right approves, left declines; *Undo* shows for 5 seconds.

### Bottom action bar

On the event screen: *Going* (or *Ask to go*, *Join waitlist*, *Full*)
as the one primary button, *Save* beside it. On a thread or conversation:
the reply box. It sits above the home indicator.

### Folding form sections

Long forms (post an event) are sections that fold to a one-line summary:
*When · Thu 22 Oct, 5:30–7:30 pm (Eastern)*. Only one section is open at
a time. A failed server check opens its section with the message beside
the field.

### Empty, loading and offline states

- **Empty:** says why and offers the next step with its count (*Widen to
  50 miles · 9 events*).
- **Loading:** the summary line reads *Loading…*; cards keep their last
  content until the new list arrives. No spinner over the page.
- **Offline:** a band under the top bar, *Offline · showing what was saved
  at 7:42 am*.

### Confirmation

Removing a member, banning, cancelling an event and declining a request
each ask in a tray: what happens, who sees it, and a button naming the
action in rust (*Cancel the event*). Nothing irreversible is one tap.

## Tokens

Colors come from the brand slots; these are the roles the phone layout
uses them in. Spacing and type are new and live beside the slots in
`src/app/globals.css`.

| Role | Slot | Notes |
| --- | --- | --- |
| Screen background | `--panel` | Lists sit on the panel; cards are white |
| Card, tray, bars | `--paper` | |
| Body text | `--ink` | |
| Secondary text, summary line | `--muted` | |
| Borders | `--rule` | |
| Primary button, chosen chip, current tab | `--accent` / `--current` | Current tab: icon filled and label bold, not color alone |
| Day headings | `--band` background, `--ink` text | As the web's month bars |
| Level *Intro* tag | `--tag-new` background, `--ink` text | |
| Cost *Free*, spots | `--notice` background | |
| Destructive | `--danger` | |
| Focus ring | `--focus`, 3 px | |
| Tray shadow and dim | `--shadow`, ink at 40% | |

| Spacing | Value | Use |
| --- | --- | --- |
| `--space-1` | 4 px | Between a label and its value |
| `--space-2` | 8 px | Between chips; inside tags |
| `--space-3` | 12 px | Inside cards between lines |
| `--space-4` | 16 px | Screen gutter; card padding |
| `--space-6` | 24 px | Between sections |

| Type (phone) | Size / line | Use |
| --- | --- | --- |
| Title | 26 / 1.15, bold | Screen titles (event and group names) |
| Heading | 20 / 1.25, bold | Section headings |
| Card title | 18 / 1.3, bold | Event and group names in cards |
| Body | 17 / 1.5 | Text, descriptions, messages |
| Meta | 15 / 1.4 | Card lines, summary line, tags |
| Label | 13 / 1.3, bold | Tab labels, day headings |

All in Atkinson Hyperlegible (the wordmark stays Young Serif). Radii: 12 px
cards, 999 px chips, 16 px tray top corners. Motion: 200 ms ease-out for
trays and folds, none when `prefers-reduced-motion` is set.

## Components

Each is a shared component (tool scope) in `src/components/mobile/` when
built, with every color from a slot.

| Component | States | Notes |
| --- | --- | --- |
| `TabBar` | current, count | Five tabs; count on Inbox only |
| `TopBar` | expanded, collapsed, offline | Area and town button, search |
| `WhenControl` | three windows, custom | Links with JavaScript off |
| `ChipRow` | single choice, with drawing, revealed sub-row | Scrolls the chosen chip into view |
| `FilterChips` | one or more, clear all | |
| `SummaryLine` | loading, result | `aria-live="polite"` |
| `Tray` | half, tall, with footer | `<dialog>`; `<details>` fallback |
| `DayGroup` | open, folded, sticky | Folded state remembered for the session |
| `EventCard` | going, saved, asked, waitlist, full, cancelled, hosted by guide/shop/venue | |
| `GroupCard` | member, organizer, pending | |
| `RequestCard` | default, swiping, done with undo | Buttons always visible |
| `LetterIndex` | — | A list of links for screen readers |
| `ActionBar` | going states, reply box | Above the home indicator |
| `FormSection` | open, folded with summary, error | |
| `EmptyState` | with widening options | |
| `WeekStrip` | today, selected, dots | Previous / Next buttons as well as swipe |
