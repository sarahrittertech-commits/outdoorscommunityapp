---
sidebar_position: 2
title: Use cases
---

# Mobile use cases

> **Draft, awaiting review** (drafted 14 October 2026). Main path only, as
> the web [use cases](../use-cases) are; the alternative paths and edge
> cases are in [Functional requirements](./functional-requirements). Each
> has a diagram in [User flows](./user-flows).

Numbered MUC-1 onwards so they never collide with the web board's UC
numbers. Written for the tool: *activity*, *area* and *group* mean whatever
a board's own settings name them. Examples are Branch Outdoors'.

| # | Use case | Actor | Decisions it needs |
| --- | --- | --- | --- |
| MUC-1 | Set up around where I live | Newcomer | D1 |
| MUC-2 | What I do and what I want to try | Newcomer | D5 |
| MUC-3 | What's on this weekend | Newcomer or regular | — |
| MUC-4 | Try something new | Newcomer | D3, D4, D5 |
| MUC-5 | My week | Regular member | — |
| MUC-6 | Answer my messages | Member or organizer | D2 |
| MUC-7 | Run my group from my phone | Organizer | D2 |
| MUC-8 | Post an event from my phone | Organizer | D4 |

---

## MUC-1 — Set up around where I live

**Actor:** The newcomer

**Trigger:** Opens the app for the first time, from a link a friend sent or
from their home screen.

**Flow:**

1. Sees one question: *Where do you live?* with a field for a **zip code**,
   or a **town and state**. No sign-in asked for.
2. Types *28739*.
3. Sees the areas that cover it, nearest first, each with its hub towns and
   how many groups and upcoming events it lists: *Western Carolinas
   (Asheville, Greenville) · 4 miles*.
4. Picks *Western Carolinas*.
5. Lands on *Events*, showing *This weekend* in that area. The top bar
   names the area and the town (*Hendersonville · Western Carolinas*);
   tapping it changes either.

**Requirements:** FR-MO-LOC-1 to FR-MO-LOC-7

**Succeeds when:** someone who has never used the board sees this
weekend's events near their own town in under 30 seconds, without an
account and without the app asking for their device's location.

## MUC-2 — What I do and what I want to try

**Actor:** The newcomer, just after MUC-1, or any member later from *Me*

**Trigger:** The app offers, once, *Tell us what you do and what you'd
like to try* (skippable).

**Flow:**

1. Sees the board's activities as a list of rows, each with its line
   drawing and name.
2. Marks **Hiking** and **Camping** as *I do this*, and picks a level for
   each: *Getting comfortable* for hiking, *New to it* for camping.
3. Marks **Climbing** as *I want to try this*.
4. Taps *Done*. Their *Events* tab now has two quick filters at the top,
   *My activities* and *Try something new*, beside *Everything*.
5. If they sign up later, the choices are saved to their profile's
   activities section (which they can show or hide, as today); until then
   they stay on the phone only.

**Requirements:** FR-MO-INT-1 to FR-MO-INT-6 (*also web*: the profile's
activities gain *do / want to try* and a level)

**Succeeds when:** a newcomer can say what they do and what they want to
try in under a minute, and the app never asks again unless they open it
from *Me*.

## MUC-3 — What's on this weekend

**Actor:** The newcomer or a regular

**Trigger:** It's Thursday evening; they want something to do on Saturday.

**Flow:**

1. Opens *Events*. At the top: **This weekend · This week · Coming up**
   (This weekend is chosen on Thursday to Sunday, This week otherwise), and
   below it a row of activity chips: *Everything*, *My activities*, *Try
   something new*, then each activity.
2. Below, one line says what the list is: *14 events · this weekend · within
   25 miles of Hendersonville · soonest first*.
3. The list is grouped by day (*Saturday 17 October*, *Sunday 18
   October*); each day's heading stays at the top while its events scroll
   under it, and folds closed when tapped.
4. Taps the **Paddling** chip; the list narrows to 3 events.
5. Opens **Filters**: a tray slides up from the bottom with *Distance*,
   *Time of day*, *Level*, *Cost* and *Hosts*. Picks *Within 50 miles* and
   *Free*; the tray's button reads *Show 5 events*. Taps it; the tray
   closes.
6. Opens **Sort** and picks *Nearest first*.
7. Taps an event card. The event opens full screen: when, where, host,
   level, cost, spots left; *Going* and *Save* sit in a bar at the bottom.
8. Taps *Save*, then *Add to my calendar*.

**Requirements:** FR-MO-NAV-1 to FR-MO-NAV-6, FR-MO-FND-1 to FR-MO-FND-12

**Succeeds when:** they find a specific event this weekend, in their
activity and within their distance, in four taps from opening the app,
without signing in; and the line above the list always says exactly what
they're looking at.

## MUC-4 — Try something new

**Actor:** The newcomer who said in MUC-2 they want to try climbing

**Trigger:** Wants a first climbing day with people who'll show them how.

**Flow:**

1. Taps the **Try something new** chip on *Events*.
2. The line above the list reads *Intro events · Climbing · within 25
   miles of Hendersonville · next 30 days*. The list shows events marked
   *Intro: first-timers welcome* in the activities they want to try,
   soonest first, and events from groups listed under *Beginners welcome*.
3. Each card shows the level tag and the cost.
4. Sees *Intro to Outdoor Climbing, Sat 24 Oct · NC BIPOC Climbers ·
   Free*. Opens it, reads *What to bring*, taps *Going*.
5. Below the events, a short section, *Groups that welcome beginners in
   Climbing*, lists the area's groups in that activity whose next event is
   an intro event, A to Z.

**Requirements:** FR-MO-TRY-1 to FR-MO-TRY-6; FR-MO-EVL-1 to FR-MO-EVL-3
(*also web*: the event level)

**Succeeds when:** someone who has never done an activity finds an
upcoming intro event for it near them in two taps, and two people with the
same settings see the same list (P2).

## MUC-5 — My week

**Actor:** A regular member of two groups

**Trigger:** Monday morning, on the bus.

**Flow:**

1. Opens the **My week** tab. A strip of seven days sits at the top, today
   first, each with a dot for each event they're going to or saved (dots
   are a count of their own plans, not alerts).
2. Below, the days are listed with their events; each card says *Going*,
   *Saved* or *Asked to go*.
3. Swipes the strip to next week, then back; taps *Today* to return.
4. Opens Thursday's ride, changes *Going* to *Not going*. The card updates
   and the place frees up.
5. Opens **Groups**, then *Blue Ridge Dirt Skrrts*: the group's next events
   and its latest threads. Opens *Carpool for Saturday*, reads the replies,
   and replies from the box pinned at the bottom of the screen.

**Requirements:** FR-MO-CAL-1 to FR-MO-CAL-6, FR-MO-GRP-1 to FR-MO-GRP-5

**Succeeds when:** a member sees their outdoor week at a glance, changes an
RSVP in two taps, and replies in a group thread without leaving the app.

## MUC-6 — Answer my messages

**Actor:** A member or organizer

**Trigger:** The *Inbox* tab shows *3*.

**Flow:**

1. Opens **Inbox**. At the top, for organizers only, *Needs you* (MUC-7).
   Below, **Messages**: conversations, newest first, unread ones in bold;
   then **Requests**: people who want to message them for the first time.
2. Opens a conversation; the messages read top to bottom, the reply box is
   pinned above the keyboard.
3. Writes a reply and sends it. It appears at once.
4. Goes back to *Requests*, opens one, reads the sender's profile card, and
   taps *Accept* (or *Decline*, or *Block and report*).

**Requirements:** FR-MO-MSG-1 to FR-MO-MSG-6

**Succeeds when:** a reply takes two taps from opening the app, and
nothing about messages reaches the phone outside the app (D2).

## MUC-7 — Run my group from my phone

**Actor:** A page admin or page manager

**Trigger:** At the trailhead on Saturday, 20 minutes before the ride; or
on the couch on Sunday evening.

**Flow:**

1. Opens **Inbox**. *Needs you* lists, newest first: *2 join requests ·
   Blue Ridge Dirt Skrrts*, *1 RSVP request · Sunset ride, Thu*, *1 report
   · thread "Gear swap"*.
2. Opens the join requests: a card per person with their name, profile
   card, and their answer to the group's join question. Taps *Approve* on
   one and *Decline* on the other; each card slides off. (Swiping a card
   right or left does the same; the buttons are always there.)
3. Opens **Groups**, then the group, then **Run this group**: the next
   event with *14 going · 6 spots left*, *Manage RSVPs*, *Post an update*,
   *Post an event*, *Members*.
4. Opens *Manage RSVPs* for Saturday's ride: *Going*, *Asked*, *Waitlist*
   as tabs. Approves one asked RSVP.
5. Taps *Post an update*, writes *We're at the upper lot, not the lower
   one*, and posts it as a pinned thread.
6. Back in *Needs you*, opens the report and chooses *Remove post* or
   *Keep it*.

**Requirements:** FR-MO-ORG-1 to FR-MO-ORG-9

**Succeeds when:** an organizer clears every request and report for their
groups from the phone, and can reach Saturday's attendee list in three
taps from opening the app.

## MUC-8 — Post an event from my phone

**Actor:** A page admin or page manager

**Trigger:** Wants to put next Thursday's ride on the calendar.

**Flow:**

1. From **Run this group**, taps *Post an event*. The first choice is
   **Copy a past event** (the last five, newest first) or **Start blank**.
2. Copies *Thursday sunset ride*. The form opens filled in, one section at
   a time: *What* (title, activity, level, description), *When* (date and
   time pickers), *Where* (place, address and who sees it), *Who can come*
   (capacity, RSVP approval, waitlist), *Cost*.
3. Changes only the date. Each section shows a one-line summary when
   folded, so the whole event can be checked on one screen.
4. Taps *Post event*. The event opens as members will see it.

**Requirements:** FR-MO-PST-1 to FR-MO-PST-6

**Succeeds when:** an organizer posts a repeat event in under a minute, and
the same checks apply as on the web (FR-EV, Zod on the server, RLS).
