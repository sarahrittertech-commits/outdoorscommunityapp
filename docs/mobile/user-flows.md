---
sidebar_position: 3
title: User flows
---

# Mobile user flows

> **Draft, awaiting review** (14 October 2026). One diagram per
> [mobile use case](./use-cases). Rectangles are screens, diamonds are
> decisions, rounded boxes are where the flow ends; a tray is marked
> *tray* (it slides up over the screen it belongs to, see the
> [design system](./design-system#trays)).

The tab bar is always there except on full-screen pages (an event, a
conversation, a form), which have a back arrow instead:

```mermaid
flowchart LR
  tabs["Tab bar"] --> ev["Events"]
  tabs --> wk["My week"]
  tabs --> gr["Groups"]
  tabs --> ib["Inbox"]
  tabs --> me["Me"]
  ev -.->|signed out| wk2["My week, Inbox: 'Sign in to see your plans'"]
```

## MUC-1 — Set up around where I live

```mermaid
flowchart TD
  open["First open"] --> where["Where do you live?<br/>zip code, or town + state"]
  where --> match{How many areas cover it?}
  match -->|one or more| pick["Pick your area<br/>nearest first: name, hub towns, distance, groups, events"]
  match -->|none: town not in an area yet| near["'Your town isn't in an area yet.'<br/>Show everything within 50 miles"]
  match -->|not found| again["'We don't know that zip code yet.'<br/>Try a nearby town"] --> where
  pick -->|choose| saved["Saved on this phone (and to the profile's home town if signed in)"]
  near --> saved
  saved --> try{"Tell us what you do? (once)"}
  try -->|yes| muc2(["MUC-2"])
  try -->|skip| events(["Events · This weekend in that area"])
```

## MUC-2 — What I do and what I want to try

```mermaid
flowchart TD
  start["What do you do? (activities as rows)"] -->|tap a row| tray["Tray: I do this / I want to try this<br/>level: New to it · Getting comfortable · Experienced"]
  tray --> start
  start -->|Done| signed{Signed in?}
  signed -->|yes| profile["Saved to the profile's activities<br/>(Show/Hide as today)"]
  signed -->|no| phone["Kept on this phone only"]
  profile --> events(["Events, with 'My activities' and 'Try something new' chips"])
  phone --> events
```

## MUC-3 — What's on this weekend

```mermaid
flowchart TD
  events["Events<br/>When: This weekend · This week · Coming up<br/>chips: Everything · My activities · Try something new · each activity"] --> line["Summary line: count · when · distance · sort"]
  line --> list["Days, each heading sticky and foldable<br/>event cards soonest first"]
  list -->|tap an activity chip| list
  list -->|Filters| ftray["Tray: Distance · Time of day · Level · Cost · Hosts<br/>button: Show n events"]
  ftray -->|Show n events| list
  ftray -->|Clear all| list
  list -->|Sort| stray["Tray: Soonest first · Nearest first"] --> list
  list -->|no events| empty["'Nothing this weekend within 25 miles.'<br/>Widen to 50 miles · Show this week"]
  empty --> list
  list -->|tap a card| event["Event, full screen<br/>bottom bar: Going · Save"]
  event -->|Save| saved{Signed in?}
  saved -->|no| signin["Sign in tray"] --> event
  saved -->|yes| cal(["Saved; Add to my calendar"])
```

## MUC-4 — Try something new

```mermaid
flowchart TD
  events["Events"] -->|Try something new| has{Want-to-try activities set?}
  has -->|no| ask["Tray: which activities would you like to try?"] --> intro
  has -->|yes| intro["Intro events in those activities<br/>within distance, next 30 days, soonest first"]
  intro --> groups["Groups that welcome beginners in those activities, A–Z"]
  intro -->|none| widen["'No intro events in Climbing within 25 miles in the next 30 days.'<br/>Widen to 50 miles · Look 90 days ahead · See groups"]
  intro -->|tap a card| event["Event: level, what to bring, cost"]
  event -->|Going| done(["Going; in My week"])
```

## MUC-5 — My week

```mermaid
flowchart TD
  wk["My week<br/>7-day strip, today first; dots = my plans"] --> days["Each day's events: Going · Saved · Asked to go"]
  wk -->|swipe strip or Next/Previous| wk
  wk -->|Today| wk
  days -->|tap| event["Event"] -->|Not going| days
  wk -->|filter tray| f["Going and saved · Going only · Saved only · Everything in my groups · one group"] --> wk
  gr["Groups tab"] --> g["Group: next events · latest threads"]
  g --> thread["Thread<br/>reply box pinned at the bottom"] -->|send| thread
```

## MUC-6 — Answer my messages

```mermaid
flowchart TD
  ib["Inbox"] --> needs{Organizer?}
  needs -->|yes| nyou["Needs you (MUC-7)"]
  ib --> msgs["Messages, newest first, unread bold"]
  ib --> reqs["Requests"]
  msgs --> conv["Conversation<br/>reply box above the keyboard"] -->|send| conv
  reqs --> req["Request: sender's profile card and first message"]
  req -->|Accept| conv
  req -->|Decline| ib
  req -->|Block and report| report(["Blocked; report sent"])
```

## MUC-7 — Run my group from my phone

```mermaid
flowchart TD
  ib["Inbox · Needs you"] --> jr["Join requests: card per person<br/>name, profile card, answer to the join question"]
  jr -->|Approve / Decline, or swipe| jr
  ib --> rr["RSVP requests"] -->|Approve / Decline| rr
  ib --> rp["Reports"] -->|Remove · Keep| rp
  grp["Group"] -->|Run this group| run["Next event: going, spots left<br/>Manage RSVPs · Post an update · Post an event · Members"]
  run --> mr["Manage RSVPs<br/>tabs: Going · Asked · Waitlist"]
  run --> upd["Post an update (thread, pin optional)"] --> posted(["Pinned thread in the group"])
  run --> pst(["MUC-8"])
  run --> mem["Members: search, A–Z<br/>Make page manager · Remove · Ban"]
```

## MUC-8 — Post an event from my phone

```mermaid
flowchart TD
  run["Run this group"] -->|Post an event| src{Copy or blank?}
  src -->|Copy a past event| pick["Last five events, newest first"] --> form
  src -->|Start blank| form["Event form in folding sections<br/>What · When · Where · Who can come · Cost"]
  form -->|Post event| check{Server checks pass?}
  check -->|no| fix["The section with the problem opens, message beside the field"] --> form
  check -->|yes| done(["The event, as members see it"])
```
