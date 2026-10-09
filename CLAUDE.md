# Branch Outdoors — project context

This file is read automatically at the start of a session. It exists so a
development window starts with full project context without re-explaining it.

## What this is

A web-based community board for outdoor groups. People browse groups by
category and subcategory, join them, RSVP to the events those groups host,
and talk in group discussion boards. Groups are run by an owner and admins,
shown on the site as the *page admin* and up to two *page managers*.

Think Meetup's groups and events, a Facebook group's membership and roles,
and an old forum's discussion threads, presented with the plainness of
Craigslist.

Owner: Sarah Ritter (PushPopDev). Product name: **Branch Outdoors** (chosen
29 September 2026; the women's clone would be *Branch Outdoors Women*). The
domain is not chosen yet. Ship date: **not set** (see the PRD's open questions).

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

All five decisions were **Accepted** on 25 September 2026, when Sarah
directed the build on them.

| Area | Decision | Record |
| --- | --- | --- |
| Web framework | Next.js (App Router), TypeScript, Tailwind, server-rendered | ADR-0001 |
| Database, auth, files | Supabase (Postgres + Auth + Storage), permissions in RLS | ADR-0002 |
| Hosting | Railway, deployed from GitHub | ADR-0003 |
| Background jobs and email | Supabase scheduled Edge Functions + Resend; **no n8n** | ADR-0004 |
| Discussions | Forum-style threads, not real-time chat | ADR-0005 |

## Current state

Live since 29 September 2026: Supabase (project `outdoorscommunityapp`) and
Railway (deploys `main`; https://branchoutapp-production.up.railway.app/).
The full database with every permission rule and its tests, and a Next.js
app covering every Must requirement plus most Shoulds. Production is seeded
with unclaimed listings of real groups (FR-GR-9) that organizers can claim;
a weekly research agent (UC-9, `scripts/research/agent.md`) suggests new
ones for the site admin to list or skip; groups carry affinity tags
(FR-GR-11). See the PRD's "Build status" for what is not built yet and the
[runbook](docs/runbook.md) for operations. UC-29 (sign-in with email and a password), UC-30 (the
event form: description, photo, price, optional RSVPs and a waitlist) and
UC-31 (page admin and up to two page managers, invite link, email invites
waiting on email setup) were approved and built on 9 October 2026; the
emailed sign-in link is gone. Draft use cases awaiting review: UC-10 to
UC-28 and UC-32, mostly from the 8 October Magic Patterns design (UC-25 to UC-28,
drafted 9 October, are Sarah's own requests: branded sign-in email, claim
confirmation by email, new-group approval, a demo member; UC-32, suggestions to the site admin); on that
date Sarah brought direct messages, group photo galleries, event prices,
saving, reminders and waitlists into scope (PRD, *Decisions — 8 October
2026*). [docs/feature-map.md](docs/feature-map.md) separates what's live
from what's new.

The look follows the branch outdoors brand guide (v2, Claude Design),
summarized in [docs/brand.md](docs/brand.md): plum, paper and autumn leaf
colors, Young Serif headings, Atkinson Hyperlegible text, on white. The page
structure follows the Magic Patterns design (home with search, activity line
drawings and event cards; Events and Communities with side filters); the
directory lives at /browse. All colors are tokens at the top of
`src/app/globals.css`.

**This board will be cloned for the women's outdoor community app.** Keep
anything deployment-specific in the places listed in
[docs/cloning.md](docs/cloning.md), and build any women's-app feature here,
behind a setting in `src/config/site.ts`.

```bash
npm install
npx supabase start            # local Postgres/Auth/Storage + seed data (needs Docker)
cp .env.example .env.local    # paste the URL and anon key it prints
npm run dev

npm run lint && npm run typecheck && npm test   # app checks
npm run db:test               # permission tests (needs `supabase start`)
npm run db:test:local         # same tests on plain Postgres, no Docker
```

Next.js here is version 16, which renamed middleware to `proxy.ts` and
changed several APIs. Read `AGENTS.md` and the bundled docs in
`node_modules/next/dist/docs/` before writing Next.js code.

### Layout

```
supabase/migrations/   schema, helper checks, RLS policies, views, directory seed (in that order)
supabase/tests/        pgTAP permission tests; 000-setup.sql builds the fixture cast
supabase/seed.sql      local demo groups, events and threads (never production)
scripts/db/            run the permission tests without Docker
src/config/site.ts     everything deployment-specific
src/proxy.ts           session refresh + Content Security Policy
src/lib/               auth, validation (Zod), time zones, plain-text rendering, .ics
src/app/actions/       every form's server action, grouped by area
src/app/               pages: / browse c/ g/ e/ events communities search post me u/ admin report signin signup forgot-password reset-password welcome
src/components/        listings, forms, notices, plain text
```

Forms are plain HTML posting to server actions and redirect back with a
message code (`?m=` or `?e=`, see `src/lib/messages.ts`). They must keep
working with JavaScript off.

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
- **No build without a reviewed use case and user flow.** Before any
  feature or page change is built, it has a use case in
  `docs/use-cases.md` (actor, trigger, the main path only) and a user flow
  in `docs/user-flows.md` (the screens and decisions along that path).
  Sarah reviews both and says go. The functional requirements then cover
  the alternative paths and edge cases, and only then does code start. If
  a request arrives without them, draft them and stop for review first.
  Small fixes to something already built (a bug, an alignment issue) don't
  need a new use case.

## Full documentation

`docs/` — PRD, personas, use cases, user flows, functional and technical requirements,
roles and permissions, data model, ADRs, test cases, runbook and cloning. Docusaurus front
matter matches the bike map so the PushPopDev docs site can render it.
