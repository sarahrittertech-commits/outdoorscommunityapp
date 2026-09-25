---
sidebar_position: 1
title: Architecture decisions
---

# Architecture decisions

An architecture decision record captures a choice that was hard to make and
would be expensive to reverse, along with the reasoning at the time. The value
is in the reasoning — six weeks from now the decision will look obvious and the
reason it was difficult will have been forgotten.

Each record has a status:

| Status | Meaning |
| --- | --- |
| **Proposed** | Drafted, not yet confirmed by the owner |
| **Accepted** | Confirmed and in effect |
| **Superseded** | Replaced by a later record, kept for the history |

## Records

| # | Decision | Status |
| --- | --- | --- |
| [0001](./adr-0001-web-platform) | Build a server-rendered web app with Next.js | Proposed |
| [0002](./adr-0002-database-and-auth) | Use Supabase for database, sign-in and files, with permissions in the database | Proposed |
| [0003](./adr-0003-hosting) | Host on Railway | Proposed |
| [0004](./adr-0004-background-jobs-and-email) | No n8n: scheduled Edge Functions and Resend for email | Proposed |
| [0005](./adr-0005-discussions) | Forum-style discussion threads, not real-time chat | Proposed |

:::note All five are Proposed
Drafted on 25 September 2026 before any code. Nothing has been built on them
yet, so this is the cheapest moment to change any of them. 0002 is the one
with the most money attached; 0001 is the one with the most rework attached.
:::

## How this differs from the bike map

The bike map's ADRs all pushed toward *less*: no backend, no accounts, bundled
data, $0 a month. That was right for a static app. This board has accounts,
user-generated content and data that changes every minute, so it genuinely
needs a database, sign-in and a server. The same instinct still applies —
every service must earn its place, and the list of services here is the
shortest one that meets the requirements.
