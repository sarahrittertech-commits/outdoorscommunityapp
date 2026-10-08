---
sidebar_position: 2.5
title: Feature map
---

# Feature map: what's live, what's new

One page that separates the branded app as it runs today from the new
features proposed in the 8 October Magic Patterns design. Live features
link to their requirements; new ones link to their draft use case. Nothing
under *New features* is built.

Last updated 8 October 2026.

## Live in the branded app

Running at https://branchoutapp-production.up.railway.app/, with every
permission enforced and tested in the database.

| Area | What it does | Use case | Requirements |
| --- | --- | --- | --- |
| Home and browsing | Ridgeline hero with activity and keyword search, activity drawings, *Coming up* event cards; *Browse all* directory; category and subcategory listings | UC-1 | FR-BR-1 to FR-BR-3, FR-BR-9 |
| Events | Events page with activity and time-window filters, grouped by month; event pages; add to calendar | UC-7 | FR-BR-4, FR-BR-7, FR-EV-7 |
| Communities | One table of every group, A to Z, filterable by activity | — | FR-BR-10 |
| Search | Keyword search over groups and events | — | FR-BR-5 |
| Accounts | Email sign-in link, 18+ and terms, profile, *My stuff*, delete account, public profiles | UC-2 | FR-AC-1 to FR-AC-7 |
| Groups | Start, edit, archive; open or approval joining with a question; rules; discussions on or off; limit of 3 | UC-3 | FR-GR-1 to FR-GR-7 |
| Membership and roles | Join, request, leave; owner, admin, member; approve, remove, ban; transfer ownership | UC-2, UC-4 | FR-MB-1 to FR-MB-9 |
| Events and RSVPs | Post, edit, cancel; going or not going; places and "full"; who's going; past events | UC-2, UC-3 | FR-EV-1 to FR-EV-8 |
| Discussions | Threads and flat replies, pin, lock, remove, edit and delete own | UC-5 | FR-DS-1 to FR-DS-7 |
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
(see the PRD's open questions).

### Grouping differentiation and photos

| Feature | Status | Use case | Draft requirements |
| --- | --- | --- | --- |
| **Group types:** *Club*, *Meetup*, *Volunteer group*, *Nonprofit*, *Chapter*, with a type icon on lists and group pages, and a type filter | Fits | UC-24 | FR-GR-16, FR-GR-17 |
| **Group cover photo** on the group page and in the Communities list | Fits | UC-24 | FR-GR-14 |
| **Event photo**, one per event or series | Fits | UC-10 | FR-EV-12 |
| **Group photo galleries**, members-only by default, removable and reportable | In scope | UC-21 | FR-GR-12, FR-GR-13 |
| **Chapters** of national organizations (for example the American Alpine Club) | Decision needed | UC-13 | FR-GR-15 |

### Finding things

| Feature | Status | Use case | Draft requirements |
| --- | --- | --- | --- |
| **Location and distance search** by town or zip, with distance on results and shareable filtered links | Fits | UC-14 | FR-BR-12, FR-BR-13, FR-BR-15 |
| **Near you** row on the home page | Fits | UC-14 | FR-BR-14 |
| **Destinations map** and place pages | Fits | UC-15 | FR-BR-16 to FR-BR-18, ADR-0007 |

### Events

| Feature | Status | Use case | Draft requirements |
| --- | --- | --- | --- |
| **Repeating series** | Decision needed | UC-10 | FR-EV-11 |
| **Price** shown as text, never payment | In scope | UC-10 | FR-EV-13 |
| **Sponsors**: a *Sponsored by* section with logos below the event details, event page only | In scope | UC-10 | FR-EV-14 |
| **FAQ** and **RSVPs open at** | Fits / In scope | UC-10 | FR-EV-19, FR-EV-20 |
| **Ask a question** and answer into the FAQ | Fits | UC-11 | FR-EV-21, FR-EV-22 |
| **Approve RSVPs**, **waitlist**, **Manage RSVPs** page | Fits / In scope | UC-17 | FR-EV-15 to FR-EV-17 |
| **Save for later** | In scope | UC-22 | FR-EV-18 |

### Members

| Feature | Status | Use case | Draft requirements |
| --- | --- | --- | --- |
| **Member list privacy** | Fits | UC-16 | FR-MB-10 |
| **Calendar** on the signed-in home page | Fits | UC-18 | FR-AC-9 |
| **Reminders** list and unread-message count | In scope | UC-23 | FR-AC-10 |
| **Replies to replies**, one level | Fits | UC-19 | FR-DS-9 |
| **Direct messages** that start as requests | In scope | UC-20 | FR-DM-1 to FR-DM-6, ADR-0006 |

### Businesses

| Feature | Status | Use case | Draft requirements |
| --- | --- | --- | --- |
| **Business pages** owned by the business email account, with their own admins; services, locations and places they operate; a linked group (separate admins) that hosts their events; events they sponsor | In scope | UC-12 | FR-BZ-1 to FR-BZ-7 |

## Still out of scope

Feeds and ranking, likes and follower counts, ads and sponsored placement,
taking payments or tickets, real-time chat, push notifications to phones,
photo walls on browse pages, and users under 18. See the PRD's
*Explicitly out of scope*.
