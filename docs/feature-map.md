---
sidebar_position: 2.5
title: Feature map
---

# Feature map: what's live, what's new

See also [User stories](./user-stories) for the same features as stories
any board can use, and the [feature request log](./feature-requests) for
where each request came from and whether it belongs to the shared tool or
to one board.

One page that separates the branded app as it runs today from the new
features proposed in the 8 October Magic Patterns design or requested by
Sarah the same day. Live features
link to their requirements; new ones link to their draft use case. Rows under *New features* say *Built* where they were built on 9 October
(UC-14 to UC-16, UC-19, UC-22, UC-24, UC-29 to UC-32); the rest are drafts.

Last updated 9 October 2026.

## Live in the branded app

Running at https://branchoutapp-production.up.railway.app/, with every
permission enforced and tested in the database.

| Area | What it does | Use case | Requirements |
| --- | --- | --- | --- |
| Home and browsing | Line-drawn ridgeline hero with activity, town and distance search, activity drawings, *Near you* event cards, *Explore destinations* map and list; *Browse all* directory; category and subcategory listings | UC-1 | FR-BR-1 to FR-BR-3, FR-BR-9 |
| Events | Events page with activity and time-window filters, grouped by month; event pages; add to calendar | UC-7 | FR-BR-4, FR-BR-7, FR-EV-7 |
| Communities | One table of every group, A to Z, filterable by activity | — | FR-BR-10 |
| Search | Keyword search over groups and events | — | FR-BR-5 |
| Accounts | Email and password sign-in with a confirmed email, forgot and change password; 18+ and terms, profile, *My stuff*, delete account, public profiles | UC-2, UC-29 | FR-AC-2 to FR-AC-7, FR-AC-17 to FR-AC-21 |
| Groups | Start, edit, archive; open or approval joining with a question; rules; discussions on or off; limit of 3 | UC-3 | FR-GR-1 to FR-GR-7 |
| Membership and roles | Join, request, leave; page admin, up to two page managers, member; approve, remove, ban; transfer ownership | UC-2, UC-4, UC-31 | FR-MB-1 to FR-MB-9, FR-MB-11 |
| Invites | Invite link (7 days, 30 days or until turned off) that joins people straight in; email invites for members and page managers built but waiting on the board's email setup | UC-31 | FR-MB-12 to FR-MB-16 |
| Events and RSVPs | Post, edit, cancel; going or not going; places and "full"; who's going; past events | UC-2, UC-3 | FR-EV-1 to FR-EV-8 |
| Discussions | Threads and replies, with one level of answers to a reply and role labels; pin, lock, remove, edit and delete own | UC-5, UC-19 | FR-DS-1 to FR-DS-7, FR-DS-9 |
| Moderation | Report anything; group and site queues; suspend; moderation log; rate limits | UC-6 | FR-MD-1 to FR-MD-6 |
| Unclaimed listings and claims | 67 real groups listed from public information; organizers claim them; site admin approves | UC-8 | FR-GR-9, FR-GR-10 |
| Affinity tags | Women, Youth, BIPOC, LGBTQIA+ on group pages and lists, set by owners | UC-9 | FR-GR-11 |
| Research agent | Weekly search for new groups and events; *Candidates* on the admin page with *List it* and *Skip* | UC-9 | FR-RS-1 to FR-RS-9 |

## From the design: visual refresh (built)

A small fix to pages that already exist, so no new use case was needed.
See [Brand](./brand) for the colors.

- The twig-and-text logo in header and footer, smaller on phones; the
  twig as the favicon.
- The slightly bluer UI plum; the Search button in the design's deep
  orange with white text.
- Larger page titles; light purple section bars for months on Events;
  plum underlined filter headings.
- Filters that fold into a card on phones, on Communities and Events.

## New features (drafts, nothing built)

Status: **In scope** means Sarah brought it into scope on 8 October and
it awaits use case review; **Fits** means it fits the product as written
and awaits review; **Decision needed** means a product question is open
(see the PRD's open questions). **Waits on domain** means it can't ship
until the domain is chosen and email sending through Resend is set up.

### Grouping differentiation and photos

| Feature | Status | Use case | Draft requirements |
| --- | --- | --- | --- |
| **Group types:** *Club*, *Meetup*, *Volunteer group*, *Nonprofit*, *Chapter*, with a type icon on Communities and group pages, and a type filter on Communities and Events | Built 9 Oct (migration `20261010000007` to apply) | UC-24 | FR-GR-16, FR-GR-17 |
| **Group cover photo** on the group page and in the Communities list, uploaded in group settings | Built 9 Oct (migration `20261010000007` to apply) | UC-24 | FR-GR-14 (narrowed) |
| **Event photo**, one per event or series | Fits | UC-10 | FR-EV-12 |
| **Group photo galleries**, members-only by default, removable and reportable | In scope | UC-21 | FR-GR-12, FR-GR-13 |
| **Chapters** of national organizations (for example the American Alpine Club) | Decision needed | UC-13 | FR-GR-15 |

### Finding things

| Feature | Status | Use case | Draft requirements |
| --- | --- | --- | --- |
| **Location and distance search** by town or zip, with distance on results and shareable filtered links | **Built 9 Oct** (towns and zip codes from built-in lists, on home, Events and Communities) | UC-14 | FR-BR-12, FR-BR-13, FR-BR-15 |
| **Near you** row on the home page | **Built 9 Oct** | UC-14 | FR-BR-14 |
| **Destinations map** and place pages | **Map built 9 Oct** (towns with events); place pages wait on places | UC-15 | FR-BR-16 to FR-BR-18, ADR-0007 |

### Events

| Feature | Status | Use case | Draft requirements |
| --- | --- | --- | --- |
| **Repeating series** | Decision needed | UC-10 | FR-EV-11 |
| **Price** shown as text, never payment | In scope | UC-10 | FR-EV-13 |
| **Sponsors**: a *Sponsored by* section with logos below the event details, event page only | **Built 9 Oct** (migration `20261010000009` to apply; links to board businesses wait on UC-12) | UC-10 | FR-EV-14 |
| **FAQ** and **RSVPs open at** | **Built 9 Oct** for single events (migration `20261010000009` to apply) | UC-10 | FR-EV-19, FR-EV-20 |
| **Ask a question** and answer into the FAQ | Fits | UC-11 | FR-EV-21, FR-EV-22 |
| **Approve RSVPs**, **waitlist**, **Manage RSVPs** page | **Built 9 Oct** (waitlist with UC-30; migration `20261010000009` to apply) | UC-17 | FR-EV-15 to FR-EV-17 |
| **Save for later** | **Built 9 Oct** (Saved in My stuff and on My calendar; not in reminders yet) | UC-22 | FR-EV-18 |

### Members

| Feature | Status | Use case | Draft requirements |
| --- | --- | --- | --- |
| **Member list privacy** | **Built 9 Oct** (set by the page admin or a manager) | UC-16 | FR-MB-10 |
| **Calendar** on the signed-in home page | **Built 9 Oct** (month or week, going / saved / my groups filters) | UC-18 | FR-AC-9 |
| **Reminders** list and unread-message count | In scope | UC-23 | FR-AC-10 |
| **Replies to replies**, one level | Built 9 October 2026 | UC-19 | FR-DS-9 |
| **Direct messages** that start as requests | In scope | UC-20 | FR-DM-1 to FR-DM-6, ADR-0006 |

### Businesses

| Feature | Status | Use case | Draft requirements |
| --- | --- | --- | --- |
| **Business pages** owned by the business email account, with their own admins; services, locations and places they operate; a linked group (separate admins) that hosts their events; events they sponsor | In scope | UC-12 | FR-BZ-1 to FR-BZ-7 |

### Sign-in, claims and new groups

Requested by Sarah on 8 October; drafted 9 October.

| Feature | Status | Use case | Draft requirements |
| --- | --- | --- | --- |
| **Branded sign-in email**: plain wording from Branch Outdoors instead of Supabase's generic email; no images or tracking | Fits · Waits on domain | UC-25 | FR-AC-11 to FR-AC-13 |
| **Confirm a claim by email** at the group's own website domain; the site admin sees *Confirmed at …* or *Not confirmed* | Fits · Waits on domain | UC-26 | FR-GR-18 to FR-GR-20 |
| **Approval of a person's first group** (recommended of three options: every group, first group only, none) | Decision needed | UC-27 | FR-GR-8, FR-GR-21, FR-GR-22 |

### Posting events

| Feature | Status | Use case | Draft requirements |
| --- | --- | --- | --- |
| **Event form**: required description plus details, a photo, Free or Paid with fee and total cost, optional RSVPs with places and a waitlist, or a sign-up link | Built 9 Oct (migration `20261010000002` to apply) | UC-30 | FR-EV-23 to FR-EV-28 |

### Suggestions

| Feature | Status | Use case | Draft requirements |
| --- | --- | --- | --- |
| **Suggest something** to the site admin: a region, a feature, a group to invite, an event to add; private to the sender and the site admin, 5 a day, *My suggestions* shows the status and note | **Built 9 Oct** (migration `20261010000008` to apply) | UC-32 | FR-AD-4 to FR-AD-7 |

### Accounts

| Feature | Status | Use case | Draft requirements |
| --- | --- | --- | --- |
| **Email and password sign-in**: sign up with a confirmed email and a password; forgot and change password. Replaces the emailed sign-in link | **Built 9 Oct** (now in the live table above) | UC-29 | FR-AC-17 to FR-AC-21, ADR-0009 |

### Demo

| Feature | Status | Use case | Draft requirements |
| --- | --- | --- | --- |
| **Demo member sign-in**, read-only, so reviewers can see the signed-in pages without an email | Decision needed | UC-28 | FR-AC-14 to FR-AC-16 |

## Still out of scope

Feeds and ranking, likes and follower counts, ads and sponsored placement,
taking payments or tickets, real-time chat, push notifications to phones,
photo walls on browse pages, and users under 18. See the PRD's
*Explicitly out of scope*.
