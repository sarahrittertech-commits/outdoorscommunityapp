---
sidebar_position: 7
title: ADR-0006 Direct messages
---

# ADR-0006 — Direct messages as requests, on plain pages

**Status:** Proposed · **Date:** 8 October 2026

## Context

[ADR-0005](./adr-0005-discussions) chose forum threads over chat and
listed direct messages as out of scope. On 8 October 2026 Sarah brought
direct messages into scope from the Magic Patterns prototype (UC-20):
members need to arrange things privately, such as borrowing a bike rack
or sharing a phone number for a carpool, without posting them in a group.

Private messages carry the most risk of anything on the board:
harassment, spam, and content no one else can see. The design has to keep
those in check without becoming a chat app.

## Options

### Open messaging

Anyone signed in can message anyone. Simple, and how most sites start.
Against it: the board's users are strangers meeting through activities.
Open messaging is exactly how unwanted contact happens.

### Messages as requests

A first message arrives as a request the other person accepts, declines
or blocks. Until they accept, the sender can't send more. This is the
model in the prototype.

### Real-time chat

Live updates, typing indicators, read receipts. Against it: everything in
ADR-0005 still applies. Live connections are a lot of code, and they pull
toward the always-on experience the principles rule out (P4).

## Decision (proposed)

**Messages as requests, on plain pages.** The inbox is an ordinary page
that shows new messages when it loads, like the discussion board. No live
updates, typing indicators, read receipts or online status. The header
shows only how many conversations have unread messages.

The database enforces the request rule, blocks and the 10-requests-a-day
limit (FR-DM-1 to FR-DM-6). Only the two people in a conversation can
read it. The site admin sees a conversation only when it is reported.

## Consequences

**Good:** members can arrange things privately. Unwanted contact stops at
the first message. The model fits the forum-style board and works without
JavaScript.

**Bad:** a new kind of private content to moderate, with reports as the
only window into it. Two new tables and their permission tests. A reply
isn't seen until the other person loads a page, which suits people
planning trips days ahead but not quick back-and-forth.

**What it doesn't change:** ADR-0005 stands for group discussion. This
record narrows its "no direct messages" consequence only.
