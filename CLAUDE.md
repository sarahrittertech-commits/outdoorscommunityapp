# Outdoors Community Board — project context

This file is read automatically at the start of a session. It exists so a
development window starts with full project context without re-explaining it.

## What this is

A web-based community board for outdoor groups. People browse groups by
category and subcategory, join them, RSVP to the events those groups host,
and talk in group discussion boards. Groups are run by an owner and admins.

Think Meetup's groups and events, a Facebook group's membership and roles,
and an old forum's discussion threads, presented with the plainness of
Craigslist.

Owner: Sarah Ritter (PushPopDev). Working name — the product name is not
decided. Ship date: **not set** (see the PRD's open questions).

## Why it exists — read this before suggesting anything

This is a **portfolio piece**. Its job is to show a finished, real multi-user
product: a relational data model, roles and permissions enforced by the
database, moderation, and a clear set of requirements and decisions behind
it.

Consequences that should shape every suggestion made in this repo:

- **Minimal is the goal.** Build the Must requirements to a finished standard
  before touching a Should. Anything at Could gets cut without discussion.
- **The documentation is part of the deliverable.** The requirements, ADRs
  and permission matrix are what a reviewer reads first.
- **The "old internet" feel is a product decision, not a style.** No feeds, no
  ranking algorithms, no ads, no engagement tricks. Push back on features that
  drift toward a social network.
- **Scope creep is the main risk.** Push back on additions rather than
  accommodating them.

## Relationship to other projects

- **Bike Brevard Map** (`brevard-bike-map`) — separate project. Its docs make
  "no shared code with the outdoor community app" an explicit non-goal; that
  holds from this side too. Its documentation format is the standard this repo
  follows.
- **Executive AI Copilot** (`ExecDashCoPilot`) — source of lessons, not code.
  Same database vendor (Supabase) and host (Railway). Its lessons are written
  into the technical requirements (no anonymous write policies, validate every
  input, secrets never in code).

## Stack

All decisions are **Proposed**, not Accepted. Confirm with Sarah before
building on them.

| Area | Decision | Record |
| --- | --- | --- |
| Web framework | Next.js (App Router), TypeScript, Tailwind, server-rendered | ADR-0001 |
| Database, auth, files | Supabase (Postgres + Auth + Storage), permissions in RLS | ADR-0002 |
| Hosting | Railway, deployed from GitHub | ADR-0003 |
| Background jobs and email | Supabase scheduled Edge Functions + Resend; **no n8n** | ADR-0004 |
| Discussions | Forum-style threads, not real-time chat | ADR-0005 |

## Current state

Requirements and architecture only (25 September 2026). No application code,
no Supabase project, no Railway service yet. Visual design starts next in
Magic Patterns, following the same design-repo-then-build pattern as the bike
map.

## Rules that will apply once code exists

These are drawn from the technical requirements; the full list is in
`docs/technical-requirements.md`.

1. **Permissions live in the database.** Every table has row-level security
   switched on and denies by default. The UI hiding a button is never the
   only thing stopping an action.
2. **The anonymous role never writes.** No `anon` insert, update or delete
   policy on any table, ever. (The dashboard accumulated several; do not
   repeat that.)
3. **The service-role key never reaches the browser** and is not used to serve
   ordinary page requests. Pages query Supabase as the signed-in user, so RLS
   applies.
4. **Every form input is validated with Zod on the server** before it touches
   the database.
5. **User content is rendered as text.** No user-supplied HTML, ever.
6. **Schema changes are migrations in `supabase/migrations/`,** and every
   permission rule has a test in `supabase/tests/`.

## Working style

- Small, frequent commits. The commit history is part of the deliverable
  because the repository is public.
- Sarah is a technical product manager, not a systems engineer. Explain
  architectural tradeoffs in terms of consequences and cost, not internals.
- Documentation is versioned with the code: a change that invalidates a
  document updates it in the same commit.

## Full documentation

`docs/` — PRD, personas, use cases, functional and technical requirements,
roles and permissions, data model, ADRs and test cases. Docusaurus front
matter matches the bike map so the PushPopDev docs site can render it.
