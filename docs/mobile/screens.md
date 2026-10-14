---
sidebar_position: 7
title: Screens
---

# Mobile screens

> **Draft** (14 October 2026). Every screen in the app, who sees it and
> which use case it serves. The clickable wireframe
> (`docs/mobile/wireframes.html`) has each one, with a *Member* / *Page
> admin* switch and working filters, trays, folding days and swipe cards,
> on sample Western Carolinas data.

## Member

| Screen | Tab | What's on it | Use case |
| --- | --- | --- | --- |
| Where do you live? | — (first open) | Zip code or town and state; *Find my area* | MUC-1 |
| Pick your area | — | Areas covering the zip, nearest first, with counts | MUC-1 |
| What I do | — (first open), or *Me* | Activities as rows; tray per activity: *I do this* + level, or *I want to try this* | MUC-2 |
| Events | Events | When control, activity chips, summary line, *Filters* and *Sort* trays, days with sticky headings, event cards | MUC-3, MUC-4 |
| Event | (full screen) | Level, facts, about, what to bring, *Add to my calendar*; bottom bar *Going* / *Save* | MUC-3 |
| My week | My week | Week strip with dots, *Previous* / *Next* / *Today*, days with events, filter tray | MUC-5 |
| Groups | Groups | *Mine* with next event and newest thread; *In this area* A–Z with letter index | MUC-5 |
| Group | (pushed) | Name, type, members, *Join*; tabs *Events*, *Discussions*, *Photos*, *About* | MUC-5 |
| Thread | (full screen) | Posts and replies, role labels, reply box pinned at the bottom | MUC-5 |
| Inbox | Inbox | *Messages*, *Requests* | MUC-6 |
| Conversation | (full screen) | Messages, reply box above the keyboard | MUC-6 |
| Message request | tray | Sender's profile card, first message, *Accept* / *Decline* / *Block* | MUC-6 |
| Me | Me | What I do, town and area, profile, saved events, settings | MUC-2 |

## Organizer (page admin or page manager)

Everything a member has, plus:

| Screen | Where | What's on it | Use case |
| --- | --- | --- | --- |
| Needs you | Top of *Inbox* | Join requests (swipe or buttons, *Undo*), RSVP requests, reports | MUC-7 |
| Run this group | Group → *Run this group* | Next event with going and spots; *Manage RSVPs*, *Post an update*, *Post an event*, *Members*, *Invite link* | MUC-7 |
| Manage RSVPs | Run this group, or the event | Tabs *Going*, *Asked*, *Waitlist*, *Not going* with counts | MUC-7 |
| Post an update | tray | Title, message, *Pin* | MUC-7 |
| Post an event | Run this group | *Copy a past event* or *Start blank*; folding sections *What*, *When*, *Where*, *Who can come*, *Cost* | MUC-8 |

## Trays

*Filters*, *Sort*, *Town and area*, *What I do* (per activity), *My week
filter*, *Message request*, *Post an update*, *Sign in*. See
[Design system › Trays](./design-system#trays).

## Not in the app

Creating a group, group settings, rules and join questions, the
directory of every category, the destinations map, the admin pages and
research tools stay on the web; the app links to them where relevant.
