---
sidebar_position: 4.5
title: User flows
---

# User flows

One diagram per [use case](./use-cases): the screens a person moves
through on the main path, and the decisions where the path could split.
Rectangles are screens, diamonds are decisions, and rounded boxes are
where the flow ends. A split is shown only where it changes which screen
comes next; the full list of alternative paths and edge cases lives in the
[functional requirements](./functional-requirements).

The diagrams are [Mermaid](https://mermaid.js.org/), which GitHub renders
in place.

## UC-1 — What's out there?

```mermaid
flowchart TD
  home["Home<br/>search · activity drawings · coming up"] -->|clicks Hiking drawing| cat["Category: Hiking & Backpacking<br/>groups A–Z"]
  cat -->|picks Day hikes| sub["Subcategory: Day hikes<br/>groups A–Z"]
  sub -->|opens a group| group["Group page<br/>about · organizers · upcoming events"]
  group -->|opens next event| event["Event page<br/>when · where · host"]
  event --> done([Knows what's on, never asked to sign in])
  home -.->|or: types in search| search["Search results"] -.-> group
```

## UC-2 — Join and show up

```mermaid
flowchart TD
  group["Group page"] -->|Join group| signed{Signed in?}
  signed -->|no| signin["Sign in<br/>enter email"] --> email["Email link"] --> welcome["Welcome<br/>18+, terms, display name"] --> group2
  signed -->|yes| policy
  group2["Back on the group page"] --> policy{Join policy}
  policy -->|open| member["Group page: you're a member"]
  policy -->|approval| pending(["Request sent; waits for an organizer"])
  member -->|opens next event| event["Event page"] -->|I'm going| going([Going; shows in My stuff])
```

## UC-3 — Start a group

```mermaid
flowchart TD
  post["+ post"] --> choose["Post page<br/>an event · a group"]
  choose -->|Start a group| form["New group form<br/>name, description, activity, area, join policy"]
  form -->|Create| group["New group page<br/>you're the owner"]
  group -->|post an event| eform["New event form<br/>date, time, meeting point"]
  eform -->|Post| event["Event page"] --> done([Group and event live; link shared])
```

## UC-4 — Share the work

```mermaid
flowchart TD
  group["Group page (owner)"] -->|members| members["Members page"]
  members -->|make admin| members2["Members page: now an admin"]
  members2 --> admin["New admin opens Members page"]
  admin -->|approves 2 requests| admin2["Members page: requests cleared"]
  admin2 -->|post an event| eform["New event form"] --> done([Event posted by the new admin])
```

## UC-5 — Sort out the carpool

```mermaid
flowchart TD
  me["My stuff<br/>upcoming RSVPs"] -->|opens Saturday's group| group["Group page"]
  group -->|discussion board| board["Discussion board"]
  board -->|new thread| tform["New thread form"]
  tform -->|Post| thread["Thread page"]
  thread -->|replies arrive| board2["Board: thread moves to top"] --> done([Carpool sorted, members only])
```

## UC-6 — Something's wrong

```mermaid
flowchart TD
  thread["Thread page (regular)"] -->|Report on a reply| report["Report form<br/>reason, note"]
  report -->|Send| thanks["Thread page: thanks notice"]
  thanks --> queue["Group reports page (admin)"]
  queue -->|remove reply| removed["Reply reads 'removed by a moderator'"]
  removed -->|remove and ban| members["Members page: banned"]
  members --> site["Site admin page"]
  site -->|suspend account| done([Account suspended across the board])
```

## UC-7 — Something to do this weekend

```mermaid
flowchart TD
  events["Events<br/>next 30 days, by month"] -->|next 7 days| week["Events: next 7 days"]
  week -->|picks an activity| filtered["Events: next 7 days, one activity"]
  filtered -->|opens an event| event["Event page"]
  event --> listed{Unclaimed listing?}
  listed -->|no| cal["Add to calendar"] --> done([Plans made, no sign-in])
  listed -->|yes| out(["Follows the link to the organizer's own page"])
```

## UC-8 — This is my club

```mermaid
flowchart TD
  group["Group page<br/>'Unclaimed listing' banner"] --> signed{Signed in?}
  signed -->|no| signin["Sign in → Welcome"] --> group2["Group page with claim form"]
  signed -->|yes| group2
  group2 -->|writes note, Ask to claim| sent["Group page: claim waiting for review"]
  sent --> admin["Site admin page<br/>claim requests"]
  admin --> check{Note checks out against the club's page?}
  check -->|yes, Approve| owner["Group page: you're the owner<br/>organizer tools, discussion board"]
  check -->|no, Decline| declined(["Group page: claim wasn't approved"])
  owner --> done([Club runs its own group on the board])
```

## UC-9 — Keep the listings fresh

*Approved 8 October 2026.*

```mermaid
flowchart TD
  sched(["Weekly schedule"]) --> agent["Research agent<br/>searches the web per activity and area"]
  agent --> known{Already in the research area?}
  known -->|yes| skip1([Skipped])
  known -->|no| cand["Saved as a candidate<br/>type · activity · area · source link · events"]
  cand --> admin["Site admin page: Candidates<br/>this week's finds, by type"]
  admin --> kind{Community group?}
  kind -->|no: guide, business, venue| keep(["Stays in the research area"])
  kind -->|yes| check{Source page checks out?}
  check -->|no, Skip| skip2(["Marked skipped; not suggested again"])
  check -->|yes, List it| listed["Group page: unclaimed listing<br/>with its upcoming events"]
  listed --> done(["Visible on the board; organizer can claim it (UC-8)"])
```
