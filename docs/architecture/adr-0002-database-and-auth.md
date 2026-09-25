---
sidebar_position: 3
title: ADR-0002 Database and auth
---

# ADR-0002 — Use Supabase for database, sign-in and files, with permissions in the database

**Status:** Accepted · **Date:** 25 September 2026

## Context

The board's data is relational through and through: users belong to groups
with a role; groups host events; users RSVP to events; threads belong to
groups. Nearly every rule is "can this person do this to this group's
things?"

It also needs sign-in, somewhere to put cover images and a way to run a
scheduled job.

Supabase is already in the PushPopDev stack from the dashboard, and the
question was raised whether it is still the right choice. Two facts from the
dashboard matter:

- Both existing Supabase projects are **paused** right now — the free tier
  pauses after a week of inactivity. For a portfolio piece that is the worst
  possible failure: it breaks precisely when someone finally looks at it.
- The dashboard accumulated several migrations granting the anonymous role
  write access to get things working quickly. That was a workaround, and it
  should not be repeated.

Neither is a problem with Supabase itself. The first is a plan choice; the
second is a discipline choice.

## Options

### Supabase (Postgres + Auth + Storage + Edge Functions)

Everything needed in one service. Postgres fits the relational shape.
Row-level security lets the database itself enforce the
[permission matrix](../roles-and-permissions), so a bug in the web app cannot
leak a members-only thread. Built-in email sign-in links. Storage for images.
`pg_cron` and Edge Functions cover scheduled email. Already familiar.

Against it: $25/month on Pro to avoid pausing. Row-level security is powerful
but easy to get subtly wrong, so it needs tests.

### Railway Postgres + a sign-in library (Auth.js or Better Auth)

Runs on the Railway account already being paid for; small databases cost a
few dollars of usage; no pausing. Against it: sign-in, sessions, email links,
file storage and scheduled jobs all become code to write and maintain. The
permission rules would live in application code instead of the database,
which is exactly the kind of code that fails silently.

### Neon (serverless Postgres) + Clerk (sign-in)

Neon's free tier sleeps rather than pauses (the first request wakes it in
under a second). Clerk has a polished sign-in experience. Against it: two new
vendors and two new accounts, each with their own free-tier limits to watch,
and the permission rules still end up in application code.

### Firebase

Mature, generous free tier. Against it: a document database, a poor fit for
data this relational, and the security-rules language is less expressive than
SQL for "is this person an admin of the group that owns this thread?"

## Decision

**Supabase, with every permission enforced by row-level security and covered
by a test.**

On the free plan during the build; on **Pro from public launch**, in a new
Supabase organization so the dashboard's projects are unaffected (see
[cost position](../technical-requirements#cost-position)).

This board is a better fit for Supabase than the dashboard was: the dashboard
used it mainly as a database behind pipelines, while this board uses the parts
Supabase is built around — sign-in, row-level security tied to the signed-in
user, and storage.

## Consequences

**Good:** one vendor for data, sign-in, files and scheduled jobs. Permissions
are enforced in one place, below the web app. SQL and Postgres, already
used heavily on the dashboard, are the core skill. The permission tests
become a strong portfolio artifact.

**Bad:** $25/month from launch. A new Supabase organization means another
billing account. Supabase's built-in email only delivers to the project's own
team members, so a separate email service is required
([ADR-0004](./adr-0004-background-jobs-and-email)).

**Rules that come with this decision** (repeated in
[TR-SEC](../technical-requirements#security--tr-sec)):

1. RLS on every table, deny by default.
2. No write policies for the anonymous role, ever; a test enforces it.
3. The service-role key never serves an ordinary page request.
4. Schema changes only through migrations in the repository.

## Revisit if

Supabase changes Pro pricing materially, or the board outgrows a single small
Pro instance. The data is plain Postgres, so moving to Railway Postgres or
Neon is a dump and restore; sign-in would be the part to rebuild.
