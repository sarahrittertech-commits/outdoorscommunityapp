---
sidebar_position: 6
title: ADR-0005 Discussions
---

# ADR-0005 — Forum-style discussion threads, not real-time chat

**Status:** Proposed · **Date:** 25 September 2026

## Context

Groups need somewhere to talk: carpools, gear questions, "is this still on
in the rain?", trip reports. The brief mentions Meetup, Facebook groups and
Discord — which represent three different models of group conversation.

- **Discord:** live chat channels. Messages scroll past; you catch up by
  reading backwards.
- **Facebook groups:** posts with comments, ordered by an algorithm.
- **Classic forums:** threads with replies, the most recently active thread on
  top, replies in order.

The choice shapes the data model, the moderation load and how much code the
board needs.

## Options

### Real-time chat channels

Feels alive and matches Discord. Against it: needs live connections, typing
state, unread tracking and presence — a large amount of code. Chat is hard to
catch up on for someone who checks in twice a week, which is most members of
an outdoor group. Moderating a fast-moving stream is harder. And chat pulls
toward exactly the always-on, notification-driven experience the principles
rule out (P4).

### Posts with comments, ranked

Familiar from Facebook. Against it: ranking is a feed by another name (P2).
Unranked, it's just forum threads with different labels.

### Forum threads

Threads with titles, flat replies in order, the most recent activity on top,
pinned threads first. Built with ordinary pages and forms — no live
connections. Easy to catch up on, easy to moderate, easy to search. It is
also the most "old internet" of the three.

## Decision

**Forum-style threads.** Plain pages, ordinary forms, no live updates. A
member sees new replies when they load the page, the way forums always
worked.

## Consequences

**Good:** far less code. Works without JavaScript (TR-PE-2). Async
conversation suits people planning trips days ahead. Moderation is
per-post and calm. The data model is two simple tables.

**Bad:** no live back-and-forth. A group that wants to chat in real time will
use a group text, and that's acceptable.

## Revisit if

Members consistently ask for live updates on busy threads. Supabase Realtime
could then refresh an open thread when a reply arrives, as an enhancement on
top of the same tables — without becoming chat.
