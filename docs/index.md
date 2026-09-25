---
sidebar_position: 1
title: Overview
---

# Outdoors Community Board

A community board for outdoor groups that answers one question: **who around
here does the outdoor thing I want to do, and when are they doing it next?**

## Why this project exists

The places outdoor groups live today each get something wrong. Meetup charges
organizers a subscription and pushes paid features. Facebook groups bury
event posts under an algorithmic feed and require a Facebook account to see
anything. Discord is built for live chat among people who already know each
other, not for a newcomer trying to find a Saturday hike.

What people actually need is older and simpler: a board you can read without
signing up, organized by activity, where every group has a page, a calendar
and a place to talk. Craigslist's layout, with the parts of Meetup and
Facebook groups that work.

## What this project is for

This is a **portfolio piece** for PushPopDev. The bike map showed that a small
static app can ship on a deadline; this project shows the next thing up — a
real multi-user product with accounts, roles, permissions enforced by the
database, moderation and a documented set of decisions.

That framing drives the scope:

- **Minimal, finished, public.** The Must requirements, built well, beat a
  longer list built partway.
- **Not a social network.** No feed, no ranking, no likes, no ads. These are
  decisions, recorded in the PRD.
- **Cheap to keep running.** A portfolio piece is looked at months after it
  ships, so it must not quietly break or quietly bill.

## Status

| | |
| --- | --- |
| Phase | Built locally; next: design, then launch setup |
| Target ship date | Not set |
| Owner | Sarah Ritter |
| Repository | [sarahrittertech-commits/outdoorscommunityapp](https://github.com/sarahrittertech-commits/outdoorscommunityapp) |
| Platform | Web (responsive, mobile-friendly) |

## Document set

| Document | What it covers |
| --- | --- |
| [Product requirements](./prd) | Problem, goals, principles, scope, delivery plan, open questions |
| [Personas](./personas) | Who uses it, and what they need |
| [Use cases](./use-cases) | The specific journeys it supports |
| [Functional requirements](./functional-requirements) | Every feature, numbered and prioritized, with acceptance criteria |
| [Technical requirements](./technical-requirements) | Stack, performance, security, privacy, tooling and cost |
| [Roles and permissions](./roles-and-permissions) | Owner, admin, member, visitor: who can do what |
| [Data model](./data-model) | Tables, relationships and the seed category list |
| [Architecture decisions](./architecture/) | Why each part of the stack was chosen |
| [Test cases](./test-cases) | What "working" means before launch |
| [Runbook](./runbook) | Running locally, testing, deploying, operating |
| [Cloning](./cloning) | Making the women's outdoor community app from this codebase |

Still to come, at launch: release notes. Drafts of the privacy policy,
terms and community guidelines are pages in the app.
