---
sidebar_position: 4
title: Use cases
---

# Use cases

Each use case maps to requirements in
[Functional requirements](./functional-requirements) and to test cases in
[Test cases](./test-cases). Each has a screen-by-screen diagram in
[User flows](./user-flows).

## How a feature gets from idea to build

1. **Use case (here).** Who, what starts it, and the main path only: the
   steps when everything goes right.
2. **User flow.** The screens and decisions along that path, as a diagram.
3. **Review.** Sarah reads both and says go, or changes them.
4. **Functional requirements.** The alternative paths and edge cases
   (signed out, full, banned, archived, unclaimed…), each with an
   *accepted when*.
5. **Build,** with a test for every permission rule.

No build starts before step 3. UC-1 to UC-6 were written before this
process; UC-7 and UC-8 were written after the features were built, to
close that gap. UC-14 to UC-23 come from the 8 October Magic Patterns
design. UC-25 to UC-27 were requested by Sarah on 8 October and drafted on
9 October.

## UC-1 — What's out there?

**Actor:** The newcomer

**Trigger:** Wants to find a hiking group.

**Flow:**

1. Opens the home page. Sees a search box, the activities as line drawings
   and the next few events. No sign-in prompt.
2. Clicks the *Hiking & Backpacking* drawing.
3. Reads an alphabetical list of hiking groups: name, area, member count,
   next event date. Narrows it to *Day hikes*.
4. Opens a group. Reads the description, the organizers and the list of
   upcoming events.
5. Opens the next event and reads the details.

**Requirements:** FR-BR-9, FR-BR-3, FR-BR-2, FR-BR-6, FR-BR-7, FR-BR-8

**Succeeds when:** they reach a specific upcoming event in three clicks from
the home page, never having been asked to sign in.

## UC-2 — Join and show up

**Actor:** The newcomer

**Trigger:** Found a group they like in UC-1.

**Flow:**

1. Clicks *Join group*. Is asked to sign in.
2. Creates an account with an email address and a password, and confirms
   the address from the emailed link (UC-29).
3. Confirms they are 18 or over, accepts the terms and sets a display name.
4. Lands back on the group page. The group is open, so they are a member at
   once.
5. Opens the next event and clicks *Going*.

**Requirements:** FR-AC-17 to FR-AC-19, FR-AC-2, FR-AC-3, FR-MB-1, FR-EV-3, FR-EV-4

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

**Requirements:** FR-MD-1, FR-MD-2, FR-MD-3, FR-MD-8, FR-DS-5, FR-MB-7

**Succeeds when:** the content is gone within the group's own moderation, the
site admin can act across groups when needed, and the regular who reported it
is never identified to the organizer or the member — including to an
organizer who is the one reported.

## UC-7 — Something to do this weekend

**Actor:** The newcomer

**Trigger:** Has a free Saturday and wants to try something outdoors.

**Flow:**

1. Opens *Events* from the header. Sees upcoming events for the next 30
   days, soonest first, grouped by month.
2. Picks *next 7 days*, then an activity in the side filter.
3. Opens an event and reads when, where and who hosts it.
4. Adds it to their calendar.

**Requirements:** FR-BR-4, FR-BR-7, FR-EV-7, FR-BR-8

**Succeeds when:** they find a specific event this weekend in their
activity without signing in.

*Written after the Events page was built.*

## UC-8 — This is my club

**Actor:** The organizer, then the site admin

**Trigger:** Finds their club already on the board as an *unclaimed
listing*, added from its public web page.

**Flow:**

1. Opens the group page. Reads that it is an unclaimed listing and that
   nobody runs it on the board yet.
2. Signs in, and writes a short note on how they're connected to the club
   and how to check (their role on the club's website).
3. The site admin sees the claim in the admin queue, checks the note
   against the club's own page and approves it.
4. The organizer opens the group page and is now its owner: they can edit
   it, post events and open the discussion board.

**Requirements:** FR-GR-9, FR-GR-10, FR-AC-17, FR-AC-2

**Succeeds when:** a real organizer takes over their listing in one visit
plus one admin review, and nobody else can take it over.

*Written after the claim feature was built.*

## UC-9 — Keep the listings fresh

> **Approved 8 October 2026,** with these decisions:
> - The agent is a weekly scheduled Claude Code session. Changed 8 October
>   2026: it has no database access of its own and saves finds through a
>   small Edge Function that can only add candidates.
> - Review happens in a *Candidates* section on the admin page, with
>   *List it* and *Skip*.
> - Sources: public web search and public pages that allow reading. No
>   signing in to Facebook or anywhere else, no scraping behind sign-ins.
> - Everything is listed on this board, women-only and youth groups
>   included, with *affinity tags*: Women, Youth, BIPOC, LGBTQIA+.

**Actor:** The site admin, helped by a scheduled research agent

**Trigger:** Once a week, on a schedule.

**Flow:**

1. The research agent runs. For each activity and subcategory on the
   board, it searches the public web in Western North Carolina and, in
   turn, a wider ring across the Southeast, for groups and their upcoming
   events, plus guides, businesses and venues.
2. It saves each new find as a *candidate* in the private research area:
   name, type, activity, area, the public page it came from, and its
   upcoming events with dates and times. It skips anything already known.
3. The site admin opens *Candidates* on the admin page and sees the
   week's new finds, grouped by type, each with its source link.
4. For each community group, they check the source page and choose
   *List it* or *Skip*. Listed groups and their upcoming events appear on
   the board as unclaimed listings (UC-8). Guides, businesses and venues
   stay in the research area for later decisions.

**Requirements:** FR-RS-1 to FR-RS-6, FR-RS-8, FR-RS-9, FR-GR-9, FR-GR-11

**Succeeds when:** new local groups and events reach the board every week,
no new group reaches the board without the site admin's yes, and no contact
details or private notes are ever stored or shown.

## UC-10 — Post a ride series

> **Draft, awaiting review.** Nothing is built until Sarah approves this
> use case and its [user flow](./user-flows#uc-10--post-a-ride-series).

**Actor:** A group admin

**Trigger:** The group rides every Thursday evening from September to
December and wants it on the board.

**Flow:**

1. From the group page, chooses *Post an event*.
2. Enters the title, the details people need, the start date and time,
   the end date and time (an event can run over several days), the meeting
   place and how many places there are.
3. Sets it to repeat: weekly, on Thursdays, until 17 December 2026.
4. Adds a picture, and the price if there is one (*free*, or *$10 trail
   fee*). The board shows the price; it never takes payment.
5. Adds the shop that sponsors the rides: its name, logo and website
   (a business or group on the board, when it has a page), so its logo
   shows in a *Sponsored by* section below the event details and links
   to the sponsor.
6. Adds a few questions and answers (*Do I need lights? Is there a no-drop
   pace?*).
7. Publishes. Each Thursday is its own event in the series, and the page
   shows the picture, dates, time, place, details, then the *Sponsored
   by* logos, the FAQ, an RSVP button and how many places are left.
8. Later, edits the series once to change the meeting place for every
   date still to come. Only the group's owner and admins can edit.

**Already built:** steps 1 and 2, RSVP, places left, events belonging to a
group, editing by group admins only.
**New:** repeating series, pictures, price, sponsors, FAQ. Optional
*signup opens* time: until then the page says "RSVPs open Tue 14 Oct,
9:00 am" and the RSVP button is closed.

**Requirements:** to be written after review (drafts FR-EV-11 to FR-EV-14,
FR-EV-19, FR-EV-20).

**Succeeds when:** a season of rides is posted in one go, people RSVP to
the Thursday they're coming, and one edit changes every date still to come.

## UC-11 — Ask before you go

> **Draft, awaiting review.**

**Actor:** The newcomer, then a group admin

**Trigger:** Wants to try the Thursday ride but isn't sure a gravel bike
is fine.

**Flow:**

1. Opens the event page and reads the FAQ. Their question isn't there.
2. Signs in and chooses *Ask a question*. Writes it.
3. The group's admins see it on the event page and answer it.
4. The admin ticks *Add to the FAQ*, so the next person finds the answer.
5. The newcomer sees the answer on the event page and RSVPs.

**Requirements:** to be written after review (drafts FR-EV-21, FR-EV-22).

**Succeeds when:** a newcomer gets an answer from the people running the
event without having to join the group first.

## UC-12 — A bike shop on the board

> **Draft, awaiting review.** Sarah decided on 8 October 2026 that
> businesses are on the board: a business page is owned by an account
> signed in with the business's email, has its own admins, and can run a
> group whose admins are separate. Businesses host events only through
> their group.

**Actor:** A business owner (an outfitter, a shop, a guide company), then
the site admin

**Trigger:** Headwaters Outfitters rents canoes from two shops and hosts
fly-tying demonstrations; it sponsors a local group's paddles.

**Flow:**

1. Signs in with the business's own email (*info@headwatersoutfitters.com*),
   finds the business already listed (from the research agent) or asks to
   add it, and claims it the way a group is claimed (UC-8). The site admin
   checks the email matches the business's website and approves.
2. Fills in what it offers: services (canoe rental, shuttles, repairs),
   the activities they fit (canoeing, fly fishing), its locations (both
   shops) and the places it operates (for a guide company: Looking Glass
   Rock, Linville Gorge).
3. Adds two staff members, each signed in with their own email, as
   admins of the business page.
4. Starts a group, *Headwaters Fly-Tying Nights*, and links it to the
   business page. The group's owner and admins are whoever runs it; they
   don't have to be the business page's admins.
5. The group posts a fly-tying demonstration at one of the shops, as any
   group posts an event.
6. Is added as a sponsor by another group's admin on that group's event
   (UC-10); its logo shows in the *Sponsored by* section of that event
   page.
7. Its page shows what it offers, its locations, the places it operates,
   its group and that group's upcoming events, and the events it sponsors.

**Requirements:** FR-BZ-1 to FR-BZ-7 (draft).

**Succeeds when:** a person looking for canoe rental or a climbing guide
near a place finds the business, and its listing never outranks or
crowds out community groups.

## UC-13 — A local chapter of a national club

> **Draft, awaiting review.**

**Actor:** A chapter organizer

**Trigger:** The American Alpine Club is national; its Blue Ridge
chapter runs local events.

**Flow:**

1. Starts or claims the group for the local chapter.
2. Links it to the national organization (American Alpine Club), which
   has its own page listing all its chapters on the board.
3. Posts the chapter's events as usual.
4. A visitor on the national organization's page sees every chapter, and
   picks the one near them.

**Requirements:** to be written after review (draft FR-GR-15).

**Succeeds when:** someone who knows the national club finds their local
chapter in one click.

## UC-14 — What's near me?

> **Built 9 October 2026,** on Sarah's direction, ahead of review. See the note on FR-BR-12 to FR-BR-18 for what differs from the draft.

**Actor:** The newcomer

**Trigger:** Just moved to Hendersonville and wants something to do within
half an hour.

**Flow:**

1. On the home page, picks an activity, types *Hendersonville* (or a zip
   code) in *Location* and picks *Within 25 miles*.
2. Sees the results: events soonest first and groups A to Z, each with its
   distance.
3. Narrows the Events page the same way, then shares the link with a
   friend; the link opens the same filtered list.
4. Back on the home page, the *Near you* row now shows the next few events
   near Hendersonville, and *Change* switches the town.

**Requirements:** to be written after review (drafts FR-BR-12 to FR-BR-15).

**Succeeds when:** someone finds what's within reach of the town they
choose, without the board ever asking for their device's location.

## UC-15 — Explore destinations

> **Built 9 October 2026,** on Sarah's direction, ahead of review. See the note on FR-BR-12 to FR-BR-18 for what differs from the draft.

**Actor:** The regular

**Trigger:** Wants a new place to climb this season.

**Flow:**

1. On the home page, opens *Explore destinations*: a map with a list
   beside it.
2. Picks *Climbing*. The map and list show climbing places: Looking Glass
   Rock, Rumbling Bald, Linville Gorge.
3. Searches *Brevard* to move the map there.
4. Opens Looking Glass Rock: a short description, the groups that meet
   there and the upcoming events held there.

**Requirements:** to be written after review (drafts FR-BR-16 to FR-BR-18).

**Succeeds when:** a place leads to the people and events there, and the
list works on its own for anyone who can't use the map.

## UC-16 — Keep our member list private

> **Approved and built 9 October 2026.** The page admin or a page manager
> sets it, in the group's settings.

**Actor:** A group owner

**Trigger:** A women's riding group wants members' names hidden from
non-members.

**Flow:**

1. Opens the group's settings and finds *Who can see the member list*.
2. Chooses *Organizers only* (the other choices: *Members*, the default,
   and *Anyone signed in*).
3. A member now sees only the organizers on the members tab; on event
   pages, *who's going* shows a count but no names.

**Requirements:** FR-MB-10.

**Succeeds when:** the choice holds everywhere names could appear, enforced
by the database, not just hidden on the page.

## UC-17 — Approve who comes

> **Draft, awaiting review.**

**Actor:** A group admin

**Trigger:** A technical trail day has 12 places and needs riders with the
right experience.

**Flow:**

1. While posting the event, turns on *Approve RSVPs* and sets 12 places.
2. Members ask to come; each request waits.
3. On *Manage RSVPs*, sees requests, going, waitlist and declined. Approves
   ten, declines one and waitlists one.
4. When someone going cancels, the admin moves the waitlisted rider to
   going.

**Requirements:** to be written after review (drafts FR-EV-15 to FR-EV-17,
replacing FR-EV-10).

**Succeeds when:** the organizer decides who comes, and the place count is
always right.

## UC-18 — My calendar

> **Draft, awaiting review.**

**Actor:** The regular

**Trigger:** Signs in on Monday to see the week ahead.

**Flow:**

1. The signed-in home page shows a calendar: the month on a computer, one
   week on a phone, with a *Week / Month* switch.
2. It shows the events they're going to and the ones they saved, and can
   be filtered to one group or to *going only*.
3. Opens Thursday's ride from the calendar.

**Requirements:** to be written after review (draft FR-AC-9).

**Succeeds when:** a member sees their outdoor week at a glance and can
still add any event to their own calendar (FR-EV-7).

## UC-19 — Reply to a reply

> **Approved and built 9 October 2026.** Changes FR-DS-2 (flat replies).
> Role labels use the site's names: *page admin* and *page manager*.

**Actor:** The regular

**Trigger:** In a carpool thread, wants to answer one person's question,
not the whole thread.

**Flow:**

1. Chooses *Reply* under that person's reply.
2. Writes the answer; it appears indented under the reply it answers.
3. Anyone reading the thread sees the exchange together. Organizers' posts
   carry a *page admin* or *page manager* label.

**Requirements:** FR-DS-9 (changes FR-DS-2)

**Succeeds when:** side conversations stay readable without becoming
endless nesting.

## UC-20 — Message another member

> **Draft, awaiting review.** Brought into scope on 8 October 2026; see
> the PRD's decisions and [ADR-0006](./architecture/adr-0006-direct-messages).

**Actor:** The regular, then another member

**Trigger:** Wants to ask the ride leader privately about borrowing a
bike rack.

**Flow:**

1. From the ride leader's profile, chooses *Message*.
2. Writes a first message. It arrives as a *request*.
3. The ride leader sees it under *Requests* and chooses *Accept* (or
   *Decline*, or *Block*).
4. Once accepted, the two write back and forth in their inbox. The header
   shows how many conversations have unread messages.

**Requirements:** to be written after review (drafts FR-DM-1 to FR-DM-6).

**Succeeds when:** members can arrange things privately, nobody can be
messaged repeatedly without saying yes, and abuse can be blocked and
reported.

## UC-21 — Share trip photos

> **Draft, awaiting review.** Brought into scope on 8 October 2026.

**Actor:** A member

**Trigger:** Back from Saturday's paddle with good photos.

**Flow:**

1. Opens the group's *Photos* tab and uploads three photos.
2. Other members see them in the gallery and open one full size.
3. The member removes one later; an organizer removes one that breaks the
   group's rules.

**Requirements:** to be written after review (drafts FR-GR-12 to FR-GR-14).

**Succeeds when:** a group keeps a simple record of its trips, visible to
members, with nothing algorithmic about it.

## UC-22 — Save it for later

> **Approved and built 9 October 2026.** Brought into scope on 8 October
> 2026. Steps 1 and 2 are built; step 3 waits on UC-10 (RSVP opening time)
> and UC-23 (reminders).

**Actor:** The newcomer

**Trigger:** Sees a clinic in November but signups haven't opened.

**Flow:**

1. On the event page, chooses *Save*.
2. *My stuff* now lists it under *Saved*, separate from *Going*.
3. The event page says when RSVPs open (UC-10). When they do, the saved
   event appears in their reminders (UC-23).

**Requirements:** FR-EV-18.

**Succeeds when:** a member can keep track of an event without RSVPing,
and nobody else can see what they saved.

## UC-23 — What needs my attention

> **Draft, awaiting review.** Brought into scope on 8 October 2026.

**Actor:** A group organizer who is also a regular member

**Trigger:** Signs in after a few days away.

**Flow:**

1. The signed-in home page shows *Reminders*: two join requests, one RSVP
   request, an event they're going to tomorrow, a saved event that's nearly
   full, a saved event whose RSVPs just opened, a new thread in their group
   and one new message.
2. Opens each item; handled items drop off the list.
3. *My communities* below shows each group's next event and latest thread,
   with management links for the groups they run.

**Requirements:** to be written after review (draft FR-AC-10).

**Succeeds when:** everything that needs the person is in one plain list
when they choose to look, with no emails or phone alerts they didn't ask
for.

## UC-24 — Tell groups apart

> **Approved and built 9 October 2026.** From the 8 October design (grouping
> differentiation and photos). Built narrowed: the page admin or a page
> manager uploads the cover photo in group settings (no gallery to pick
> from until UC-21), and the type filter is on Communities only.

**Actor:** The newcomer

**Trigger:** Browsing Communities, can't tell a dues-paying club from a
free Saturday meetup or a volunteer trail crew.

**Flow:**

1. On Communities, each group shows its photo, a type icon and label
   (*Club*, *Meetup*, *Volunteer group*, *Nonprofit*, *Chapter*) and its
   activity icons.
2. Filters to *Volunteer group* to find trail work they can just show up
   to.
3. Opens a group: its page shows the same photo and type under the name.
4. The group's page admin or a page manager set the type and photo in
   group settings.

**Requirements:** FR-GR-14 (narrowed), FR-GR-16 and FR-GR-17, in
the Groups table of the functional requirements.

**Succeeds when:** a newcomer can tell what kind of group it is, and
whether it's active, before opening it.

## UC-25 — A sign-in email that sounds like us

> **Draft, awaiting review.** Requested by Sarah on 8 October 2026.
> **Depends on the domain** (PRD open question): the email can only come
> from Branch Outdoors once a domain is chosen and verified with Resend
> ([ADR-0004](./architecture/adr-0004-background-jobs-and-email)). Until
> then, sign-in emails keep Supabase's generic wording and sender.

**Actor:** The newcomer

**Trigger:** Enters their email address on the sign-in page for the
first time.

**Flow:**

1. Clicks *Send me a link*. The page says to check their email.
2. Receives an email from Branch Outdoors at the board's own address,
   subject *Your Branch Outdoors sign-in link*. It reads like a short
   note: a welcome line for a first sign-in, the link, how long it works,
   and "If you didn't ask for this, ignore it." No images, no
   marketing, no tracking.
3. Clicks the link and lands on the Welcome page (18+, terms, display
   name), as today.

**Requirements:** to be written after review (drafts FR-AC-11, FR-AC-12).

**Succeeds when:** a newcomer recognizes the email as coming from the
board they just used, and it reads as plainly as the site does.

## UC-26 — Prove it's my club

> **Draft, awaiting review.** Requested by Sarah on 8 October 2026.
> Extends UC-8 and FR-GR-10. **Depends on the domain** and Resend, like
> UC-25: the confirmation link is an email the board sends.

**Actor:** The organizer, then the site admin

**Trigger:** Is claiming their club's unclaimed listing (UC-8), and has
an email address at the club's own website domain.

**Flow:**

1. On the claim form, writes their note as today and, in the optional
   *Confirm with a club email* field, enters their address at the club's
   domain (the listing's website is *brevardpaddlers.org*; they enter
   *rides@brevardpaddlers.org*).
2. Sends the claim. The page says a confirmation link has gone to that
   address and the claim is waiting for review.
3. Opens that mailbox and clicks the link. A page confirms it: "Confirmed
   at brevardpaddlers.org."
4. The site admin sees the claim in the admin queue with *Confirmed at
   brevardpaddlers.org* beside it, reads the note and approves.
5. The organizer is the group's owner, as in UC-8.

**Requirements:** to be written after review (drafts FR-GR-18 to
FR-GR-20).

**Succeeds when:** the site admin can tell at a glance that the claimant
controls an address at the club's own domain, and still makes the
decision themselves.

## UC-27 — Start your first group

> **Draft, awaiting review. Decision needed.** Requested by Sarah on 8
> October 2026. Answers the PRD open question *Who can create groups*
> and would replace FR-GR-8 (Could). Written for the recommended option,
> **approve only a person's first group**; the alternatives and their
> costs are in [Functional requirements](./functional-requirements#group-creation-approval-uc-27).

**Actor:** The organizer, then the site admin

**Trigger:** Has never run a group on the board, and starts one.

**Flow:**

1. Signs in, clicks *Start a group* and fills in the form as in UC-3.
   The form says first groups are checked by the site admin before they
   are listed.
2. Lands on the new group's page, marked *Waiting for review*. Only they
   and the site admin can see it.
3. The site admin sees it under *New groups* on the admin page, checks it
   is a real outdoor group, and approves it.
4. The group is listed in its subcategory, open to join, and the
   organizer posts the first event.
5. Later, the same organizer starts a second group. It is listed at once,
   with no review.

**Requirements:** to be written after review (drafts FR-GR-8, FR-GR-21,
FR-GR-22).

**Succeeds when:** no one's first group reaches the listings without the
site admin's yes, and an organizer who has been checked once is never
held up again.


## UC-28 — Look around as a member

> **Draft, awaiting review. Decision needed.** Requested by Sarah on 9
> October 2026, after the Magic Patterns prototype's *demo member* button.
> The prototype simulated sign-in; the live board signs people in by email
> link only, so a demo needs a real account. Written for the recommended
> option, a **read-only demo member** on the live board; the alternatives
> are below.

**Actor:** The reviewer (a hiring manager or a peer looking at the
portfolio)

**Trigger:** Wants to see the signed-in side of the board (a group's
discussions and member list, who's going, My stuff) without giving an
email address.

**Flow:**

1. On the sign-in page, under the email form, picks *Look around as a
   demo member*.
2. Is signed in as **Demo member**, a member of a few demo groups, with
   a band on every page: *You're looking around as a demo member. Nothing
   you do here is saved.*
3. Opens a group's discussions, its member list, an event's *who's going*
   and My stuff.
4. Tries to RSVP or post: the button explains that the demo can look but
   not change anything, with a link to sign in for real.
5. Signs out, or the demo session ends after an hour.

**Requirements:** to be written after review (drafts FR-AC-14 to
FR-AC-16).

**Succeeds when:** a reviewer sees every signed-in page in under a minute
without an email, and the demo account can never post, join, RSVP,
report or message, on any page or through the API.

**Options and their cost:**

| Option | What it means | Cost and risk |
| --- | --- | --- |
| **Read-only demo member on the live board** (recommended) | One demo account, a member of a few demo groups on the live board. The database treats it like a suspended account: it can read what a member reads, never write. | Small: one setting on the account, one check in `can_write()`, one button. Demo groups have to be real-looking but clearly marked *demo*, or the demo sees real members' discussions, which it must not. |
| A separate demo board | A second copy of the site with its own database, filled with sample groups and people, reset every night. Anyone can do anything there. | A second Railway service and a second Supabase project (the free plan allows two active projects; Sage Women uses the other), plus a nightly reset job. Two sites to keep deployed. |
| Writable demo on the live board | The prototype's behaviour: the demo can post and RSVP. | Not recommended. Anyone on the internet could post on the real board as "Demo member"; the site admin would moderate it daily. |


## UC-29 — Sign up with an email and a password

> **Approved and built 9 October 2026.** Requested by Sarah the same day:
> people should sign up with an email address they confirm and a password
> they choose, instead of the emailed one-time link (FR-AC-1, a Must, and
> ADR-0002). Decided with Sarah the same day: **open sign-up with email
> confirmation** (not invite-only) and **password only** (no emailed link
> as a second way in). See [ADR-0009](./architecture/adr-0009-password-sign-in).

**Actor:** The newcomer, later the regular

**Trigger:** Wants to join a group (UC-2) and has no account yet.

**Flow:**

1. Clicks *Join group* and is sent to *Sign in*, which has a *Create an
   account* link.
2. Enters an email address and clicks *Email me the link*. Sees *Check
   your email*.
3. Opens the email and clicks *Confirm my email*. Lands on *Create your
   password*, types a password and then types it again to confirm (Sarah,
   9 October: the password is chosen after the email, not before). Then the
   welcome page: confirms they are 18 or older, accepts the terms and sets a
   display name (FR-AC-2, FR-AC-3).
4. Lands back on the group page and joins.
5. Next week, signs in with the same email and password from *Sign in*.
6. Months later, has forgotten the password: clicks *Forgot password*,
   gets an email, sets a new one and is signed in.

**Requirements:** FR-AC-17 to FR-AC-21 (replacing FR-AC-1), FR-AC-2,
FR-AC-3

**Succeeds when:** nobody can use an account whose email they haven't
confirmed, a returning member signs in without waiting for an email, and
a forgotten password is never a dead end.


## UC-30 — Post an event people want to come to

> **Approved and built 9 October 2026.** Requested by Sarah on 9 October 2026 after
> testing *Post an event*: no photo, no price, every event forced to take
> RSVPs, and one text box for everything. Decided with her the same day:
> RSVPs are optional; with RSVPs, a place limit and an optional waitlist;
> without, an optional sign-up link; a required Description plus optional
> Details; Free or Paid, with the registration fee and the total cost as
> text. Narrows the event parts of UC-10 and UC-17 to these; series, FAQ,
> sponsors, RSVP approval and opening times stay drafts.

**Actor:** A group organizer (owner or admin)

**Trigger:** The group has a ride coming up and wants people to find it
and come.

**Flow:**

1. From the group page, chooses *Post an event*.
2. Enters the title, dates and place as today, then a **Description**
   (what the event is and who it's for) and, optionally, **Details** (what
   to bring, pace, difficulty).
3. Adds a **photo** of the ride, with a short description of the picture
   for people who can't see it.
4. Marks it **Paid**, and enters the registration fee (*$25 registration*)
   and the total cost (*about $60 with bike rental*). The board shows both;
   it never takes payment.
5. Ticks **Take RSVPs on Branch Outdoors**, sets **20 places** and ticks
   **Waitlist when full**.
6. Publishes. The page shows the photo, the description, the price, the
   details and the RSVP buttons with places left.
7. When it fills, members join the waitlist in order. When someone drops
   out, the organizer moves the next person to *going* from the event page.

**Alternatives** (in the requirements): a free event; an event without
RSVPs that links to the organizer's own sign-up page instead.

**Requirements:** FR-EV-23 to FR-EV-28 (FR-EV-12, FR-EV-13 and FR-EV-16
narrowed to these; FR-EV-10 replaced). Tests PT-50 to PT-59.

**Succeeds when:** an event page answers *what is it, what does it cost,
can I come, how do I sign up* without anyone leaving the page or asking.

---

## UC-31 — Bring people into the group

> **Approved and built 9 October 2026**, with the recommended choice for
> each decision. Email invites (steps 1 and 2 by email) are built but wait
> on the board's email setup; until then the invite link is the way in.
> Requested by Sarah on 9 October 2026: a group has one main admin and up
> to two page managers who help run it; only the main admin transfers
> ownership; members can be invited by email, one address or many; and a
> link can be generated to send to people to join. Written with the
> recommended choice for each open decision.
>
> Already built: the owner (shown here as *page admin*), admins (*page
> managers*) who post events, moderate discussions and manage members,
> promotion by the owner, and ownership transfer by the owner only.

**Actor:** The page admin (the group's owner), then a page manager

**Trigger:** Starting the group on the board and bringing the club's
regulars and co-organizers with them.

**Flow:**

1. On the group's *Members* page, under *Page managers*, picks a member
   and makes them a page manager, or types the email of a co-organizer who
   isn't on the board yet. A group has at most two page managers.
2. Under *Invite people*, pastes the club's mailing list (commas or new
   lines, up to 25 addresses) and sends. Each address gets one email:
   *You're invited to join Blue Ridge Dirt Skrrts on Branch Outdoors*,
   with a join link.
3. Under *Invite link*, clicks *Create a link*, copies it and shares it in
   the club's group chat. The link works for 30 days.
4. A rider opens the link. The page says *Blue Ridge Dirt Skrrts is on
   Branch Outdoors*, explains that this is the board the club uses for its
   events and discussions, and offers *Create your account and join*
   (email only) or *Sign in*. She enters her email, follows the link to
   create her password, confirms
   her email, and the link in that email brings her back to the same page;
   she adds her display name and accepts the terms, then presses *Join Blue
   Ridge Dirt Skrrts* and lands on the group page (*Welcome to Blue Ridge
   Dirt Skrrts*) as a member, even though the group asks people to request
   to join. Someone already signed in just sees *Blue Ridge Dirt Skrrts
   invites you* and the Join button.
5. Later, the page admin turns the link off; it stops working at once.

**Requirements:** FR-MB-11 to FR-MB-16.

**Succeeds when:** a club moves its people onto the board in one sitting,
and nobody but the page admin can hand the group to someone else.


## UC-32 — Suggest something to the site admin

> **Approved and built 9 October 2026.** Requested by Sarah the same day: a way
> for people to send the site admin recommendations: a region to cover, a
> feature, a group to invite, or an event to add. Built with the
> recommended choices: signed-in members only, private to the site admin,
> never shown publicly or voted on.

**Actor:** A member, then the site admin

**Trigger:** A member knows a club that isn't on the board yet.

**Flow:**

1. From the footer or *My stuff*, opens *Suggest something*.
2. Picks what kind: *A region to cover*, *A feature*, *A group to invite*,
   *An event to add*, or *Something else*.
3. Writes a short title and the details, and adds a link if there is one
   (the group's website, the event page).
4. Sends it and sees *Thanks, the site admin reads every suggestion.* It is
   listed under *My suggestions* with its status.
5. The site admin sees it under *Suggestions* on the admin page, newest
   first, filtered by kind, and marks it *Planned*, *Done* or *Declined*,
   with an optional note back to the member.

**Requirements:** FR-AD-4 to FR-AD-7.

**Succeeds when:** every suggestion reaches the site admin in one place,
and the member can see what happened to it.

---

## Journeys the seed data must cover

Launch data should let a reviewer walk every use case above on the live site:

- At least one group in every category, and at least three in one subcategory
  (so a listing looks like a listing)
- An open group and an approval-required group
- A group with discussions off
- Upcoming events and past events
- A group with an owner and two admins
- Unclaimed listings with upcoming events (UC-8), from the
  [listings import](./runbook#seeding-real-groups)
