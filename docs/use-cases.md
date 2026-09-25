---
sidebar_position: 4
title: Use cases
---

# Use cases

Each use case maps to requirements in
[Functional requirements](./functional-requirements) and to test cases in
[Test cases](./test-cases).

## UC-1 — What's out there?

**Actor:** The newcomer

**Trigger:** Wants to find a hiking group.

**Flow:**

1. Opens the home page. Sees every category with its subcategories and a
   group count beside each. No sign-in prompt.
2. Clicks *Hiking → Day hikes*.
3. Reads an alphabetical list of groups: name, area, member count, next
   event date.
4. Opens a group. Reads the description, the organizers and the list of
   upcoming events.
5. Opens the next event and reads the details.

**Requirements:** FR-BR-1, FR-BR-2, FR-BR-6, FR-BR-7, FR-BR-8

**Succeeds when:** they reach a specific upcoming event in three clicks from
the home page, never having been asked to sign in.

## UC-2 — Join and show up

**Actor:** The newcomer

**Trigger:** Found a group they like in UC-1.

**Flow:**

1. Clicks *Join group*. Is asked to sign in.
2. Enters an email address and receives a sign-in link.
3. Clicks the link, confirms they are 18 or over, accepts the terms and sets a
   display name.
4. Lands back on the group page. The group is open, so they are a member at
   once.
5. Opens the next event and clicks *Going*.

**Requirements:** FR-AC-1, FR-AC-2, FR-AC-3, FR-MB-1, FR-EV-3, FR-EV-4

**Succeeds when:** sign-up to RSVP takes under two minutes and they end on the
page they started from.

## UC-3 — Start a group

**Actor:** The organizer

**Trigger:** Moving a paddling group off Meetup.

**Flow:**

1. Signs in and clicks *Start a group*.
2. Enters name, description, subcategory (*Paddling → Kayaking*), area,
   join policy (*approval required*) and leaves discussions on.
3. Lands on the new group page as its owner.
4. Creates the first event with a date, time and meeting point.
5. Shares the group link with existing members.

**Requirements:** FR-GR-1, FR-GR-2, FR-GR-4, FR-EV-1

**Succeeds when:** the group and its first event are live in under ten
minutes, and the group appears in the Kayaking listing.

## UC-4 — Share the work

**Actor:** The organizer

**Trigger:** A long-time member offers to help run things.

**Flow:**

1. Opens the group's member list.
2. Promotes the member to admin.
3. The new admin approves two pending join requests and posts an event.

**Requirements:** FR-MB-2, FR-MB-4, FR-MB-5, FR-EV-1

**Succeeds when:** the new admin can do everything an admin can, and nothing
an owner alone can (see [roles](./roles-and-permissions)).

## UC-5 — Sort out the carpool

**Actor:** The regular

**Trigger:** A trip is on Saturday and they need a ride.

**Flow:**

1. Opens *My stuff* and sees Saturday's trip in their upcoming RSVPs.
2. Goes to the group's discussion board and starts a thread, "Carpool from
   Brevard for Saturday?".
3. Two members reply. The thread rises to the top of the board as replies
   arrive.

**Requirements:** FR-AC-7, FR-DS-1, FR-DS-2, FR-DS-3

**Succeeds when:** the logistics get sorted without leaving the board, and no
one outside the group can read the thread.

## UC-6 — Something's wrong

**Actor:** The regular, then the organizer, then the site admin

**Trigger:** A member posts an abusive reply.

**Flow:**

1. The regular clicks *Report* on the reply and picks a reason.
2. The group's admins see it in their report queue and remove the reply. It
   now reads "removed by a moderator".
3. The admin removes and bans the member.
4. The same account posted in other groups; the site admin sees the pattern in
   the site queue and suspends it.

**Requirements:** FR-MD-1, FR-MD-2, FR-MD-3, FR-DS-5, FR-MB-7

**Succeeds when:** the content is gone within the group's own moderation, and
the site admin can act across groups when needed.

---

## Journeys the seed data must cover

Launch data should let a reviewer walk every use case above on the live site:

- At least one group in every category, and at least three in one subcategory
  (so a listing looks like a listing)
- An open group and an approval-required group
- A group with discussions off
- Upcoming events and past events
- A group with an owner and two admins
