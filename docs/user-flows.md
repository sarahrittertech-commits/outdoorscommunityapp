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

## UC-10 — Post a ride series

*Draft, awaiting review.*

```mermaid
flowchart TD
  group["Group page (admin)"] -->|post an event| form["New event form<br/>title · details · start and end dates and times · place · places"]
  form --> repeat{Repeats?}
  repeat -->|no| extras
  repeat -->|weekly on Thursdays until 17 Dec| extras["Picture · sponsors · FAQ"]
  extras -->|Publish| page["Event page<br/>picture · dates · sponsor logo · FAQ · RSVP · places left"]
  page --> series["Series: one event per Thursday"]
  series -->|admin edits series| edited(["Every date still to come is updated"])
```

## UC-11 — Ask before you go

*Draft, awaiting review.*

```mermaid
flowchart TD
  event["Event page<br/>FAQ"] --> found{Answer in the FAQ?}
  found -->|yes| rsvp(["RSVPs"])
  found -->|no| signed{Signed in?}
  signed -->|no| signin["Sign in → Welcome"] --> ask
  signed -->|yes| ask["Ask a question form"]
  ask -->|Send| waiting["Event page: question waiting"]
  waiting --> admin["Group admin answers on the event page"]
  admin -->|Add to the FAQ| faq["Event page: answer in the FAQ"]
  faq --> rsvp
```

## UC-12 — A bike shop on the board

*Draft, awaiting review.*

```mermaid
flowchart TD
  listed["Business page<br/>unclaimed listing"] -->|claim, site admin approves| owner["Business page: you're the owner"]
  owner -->|edit| form["Business form<br/>services · activities · locations · places it operates"]
  form --> page["Business page<br/>offers · locations · places · events"]
  page -->|post an event| event["Event hosted by the business<br/>at one of its locations"]
  sponsor["A group's event (UC-10)"] -->|admin adds sponsor| page
  page --> done(["Found by people looking for rentals, repairs or guides near a place"])
```

## UC-13 — A local chapter of a national club

*Draft, awaiting review.*

```mermaid
flowchart TD
  chapter["Chapter's group page"] -->|edit group: part of| national["National organization page<br/>American Alpine Club · its chapters"]
  visitor(["Visitor who knows the national club"]) --> national
  national -->|picks the nearby chapter| chapter
  chapter --> events(["Chapter's events, RSVP as usual"])
```

## UC-14 — What's near me?

*Draft, awaiting review.*

```mermaid
flowchart TD
  home["Home<br/>Activity · Location · Distance"] -->|Hendersonville, 25 miles| results["Results<br/>events soonest first · groups A–Z · distance on each"]
  results -->|Events page, same filters| events["Events: filtered list"]
  events -->|copies the link| shared(["Friend opens the same filtered list"])
  home --> near["Near you row<br/>next events near the chosen town"]
  near -->|Change| town["Pick another town or zip"] --> near
```

## UC-15 — Explore destinations

*Draft, awaiting review.*

```mermaid
flowchart TD
  home["Home: Explore destinations<br/>map and list"] -->|Climbing| filtered["Map and list: climbing places"]
  filtered -->|searches Brevard| moved["Map centred on Brevard"]
  moved -->|opens Looking Glass Rock| place["Place page<br/>description · groups that meet there · upcoming events"]
  place --> event(["Opens an event or a group"])
```

## UC-16 — Keep our member list private

*Draft, awaiting review.*

```mermaid
flowchart TD
  settings["Group settings (owner)"] --> choice{Who can see the member list?}
  choice -->|Organizers only| saved["Settings saved"]
  choice -->|Members · default| saved
  choice -->|Anyone signed in| saved
  saved --> members["Members tab: shows what the setting allows"]
  saved --> event(["Event page: who's going shows a count, names only if allowed"])
```

## UC-17 — Approve who comes

*Draft, awaiting review.*

```mermaid
flowchart TD
  form["New event form<br/>Approve RSVPs on · 12 places"] -->|Publish| event["Event page: Ask to come"]
  event -->|members ask| manage["Manage RSVPs<br/>requests · going · waitlist · declined"]
  manage -->|approve| going["Going"]
  manage -->|decline| declined["Declined"]
  manage -->|waitlist| waitlist["Waitlist"]
  going -->|someone cancels| opening{Place opens}
  opening -->|admin moves them| fromwait(["Waitlisted rider is going"])
```

## UC-18 — My calendar

*Draft, awaiting review.*

```mermaid
flowchart TD
  home["Signed-in home: calendar<br/>month on computer · week on phone"] -->|Week / Month| home
  home -->|filter: one group, going only| filtered["Calendar: filtered"]
  filtered -->|opens Thursday's ride| event["Event page"]
  event -->|Add to calendar| ics(["Calendar file downloaded"])
```

## UC-19 — Reply to a reply

*Draft, awaiting review.*

```mermaid
flowchart TD
  thread["Thread page"] -->|Reply under a reply| form["Reply form, quoting who it answers"]
  form -->|Post| nested["Reply shown indented under the one it answers"]
  nested --> deeper{Reply to that reply?}
  deeper -->|yes| same(["Shown at the same indent: one level only"])
```

## UC-20 — Message another member

*Draft, awaiting review.*

```mermaid
flowchart TD
  profile["Member's profile"] -->|Message| first["New message form"]
  first -->|Send| request["Their inbox: Requests"]
  request --> decide{Accept?}
  decide -->|Accept| inbox["Conversation in both inboxes<br/>unread count in header"]
  decide -->|Decline| declined(["Sender can't message again"])
  decide -->|Block| blocked(["Blocked; can also report"])
  inbox -->|replies, page by page| inbox
```

## UC-21 — Share trip photos

*Draft, awaiting review.*

```mermaid
flowchart TD
  group["Group page: Photos tab"] -->|Upload| upload["Choose up to 10 photos"]
  upload -->|Post| gallery["Gallery, newest first"]
  gallery -->|open one| full["Photo full size"]
  full -->|author removes| removed(["Gone from the gallery"])
  full -->|organizer removes| modded(["Removed, logged as moderation"])
```

## UC-22 — Save it for later

*Draft, awaiting review.*

```mermaid
flowchart TD
  event["Event page<br/>RSVPs open Tue 14 Oct, 9:00 am"] -->|Save| saved["My stuff: Saved"]
  saved --> opens{RSVPs open}
  opens --> reminder["Reminders: RSVPs are open"]
  reminder -->|opens event| rsvp(["RSVPs, or unsaves"])
```

## UC-23 — What needs my attention

*Draft, awaiting review.*

```mermaid
flowchart TD
  home["Signed-in home: Reminders<br/>join and RSVP requests · tomorrow · nearly full · RSVPs open · new thread · new message"] -->|opens an item| item["The page that needs them"]
  item -->|handled| home
  home --> mine["My communities<br/>next event · latest thread · manage links"]
  mine --> done(["Nothing left needing them"])
```
