---
sidebar_position: 3
title: Personas
---

# Personas

Four people this board is built for — three who use it and one who keeps it
running. Deliberately few.

:::note Audience
This is the general, all-adventure board for Western North Carolina. The
women's outdoor community app will be a clone with its own personas (see
[Cloning](./cloning)).
:::

## 1. The newcomer

**Wants:** to find people to get outside with after moving to the area, or
after a friend group scattered.

**Behaviour:** browses for a while before committing to anything. Reads a
group's description and looks at its recent events to judge whether it is
active and welcoming. Will not create an account just to look.

**What they need from the board:** to browse by activity, see what's
happening soon and judge a group at a glance — all without signing up.

**Design implication:** every public page is readable signed out (P1). A
group listing row has to show the signals that matter: area, member count and
the date of the next event. A group with no upcoming events should look like
it, rather than hiding that.

**Proposed with the 8 October design (drafts):** search by town or zip
and distance, with *Near you* on the home page (UC-14); places to explore
on a map (UC-15); telling clubs, volunteer groups and informal meetups
apart at a glance (UC-24); saving an event before committing (UC-22);
asking organizers a question without joining (UC-11). All without device
location: they pick the town.

## 2. The organizer

**Wants:** to run a group — a Saturday paddling crew, a trail-running club,
a volunteer trail-work group — without paying a Meetup subscription or
fighting the Facebook feed to reach their own members.

**Behaviour:** posts two to eight events a month. Shares the work with one or
two co-organizers. Handles the occasional member who needs to be removed.

**What they need from the board:** create a group in minutes, post events
quickly, see who is coming, share admin duties and moderate without drama.

**Design implication:** roles (owner, admin, member) are first-class, and
everything an organizer does is on the group page, not in a separate
dashboard. "Duplicate event" (Could) exists because organizers post the same
ride every week.

**Proposed with the 8 October design (drafts):** post a season of rides
as one series with a photo, price, sponsors and FAQ (UC-10); approve who
comes and keep a waitlist (UC-17); keep the member list private (UC-16);
answer questions and move answers into the FAQ (UC-11); see join and RSVP
requests in one reminders list (UC-23). **Requested 8 October (drafts):**
confirm a claim with an address at the club's own domain (UC-26); a first
group may wait for the site admin's review (UC-27, decision needed).

## 3. The regular

**Wants:** to know what's coming up in the two or three groups they belong
to, and to sort out logistics — carpools, gear, "is this still on in the
rain?".

**Behaviour:** checks in a couple of times a week. RSVPs, reads the thread
for an upcoming trip, replies once or twice.

**What they need from the board:** a single "my stuff" page listing their
groups and upcoming RSVPs, and a discussion board that is easy to catch up
on.

**Design implication:** "my stuff" is a list, not a feed (P2). Discussion
threads sort by latest reply, the way forums always did, and replies read
top to bottom, oldest first.

**Proposed with the 8 October design (drafts):** a calendar of what
they're going to and saved (UC-18); one reminders list when they sign in
(UC-23); replying to one person in a thread (UC-19); private messages
that start as requests (UC-20); sharing trip photos in the group (UC-21).

## 4. The site admin (Sarah)

**Wants:** the board to stay pleasant and legal without becoming a job.

**Behaviour:** checks the report queue a few times a week.

**What the site admin needs from the board:** one queue of reports that group admins
didn't resolve, the power to remove content, suspend accounts and archive
groups, and a record of what was done.

**Design implication:** moderation is built in from the start (FR-MD-*).
Group admins handle their own groups first; the site admin is the backstop.

**Added since launch:** reviewing the research agent's candidates each
week (UC-9) and claims on unclaimed listings (UC-8). **Proposed with the 8
October design:** reported private messages (UC-20) and reported photos
(UC-21) join the queue, which makes moderation a bigger job; the places
list for the map is maintained by the site admin (UC-15). **Requested 8
October (drafts):** claims show whether the claimant confirmed an address
at the group's domain (UC-26); if approval is chosen, first groups wait in
a *New groups* queue (UC-27).

---

## Proposed: the business owner (UC-12, draft)

**Wants:** people looking for canoe rental, repairs or a climbing guide
near a place to find them, and credit for sponsoring local groups.

**In scope since 8 October 2026:** the business claims its page with its
own email, adds staff as admins, and runs events through a group it
links (FR-BZ-1 to FR-BZ-7). It never sells, books or ranks above groups.

---

## Who this board is not for

- Commercial outfitters and guide services selling trips. No payments, no
  ticketing, no promotion. (Business pages without payments or booking
  are in: UC-12.)
- People looking for trail conditions, maps or route beta. AllTrails, Strava
  and the bike map serve that.
- Large clubs that need membership dues, waivers or rosters. Out of scope.
- Anyone under 18.
