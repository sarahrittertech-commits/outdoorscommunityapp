---
sidebar_position: 4
title: ADR-0003 Hosting
---

# ADR-0003 — Host on Railway

**Status:** Proposed · **Date:** 25 September 2026

## Context

The Next.js app ([ADR-0001](./adr-0001-web-platform)) needs a server to run
on. Supabase hosts the database but cannot run a Next.js server.

The dashboard's front end is already deployed on Railway from GitHub, on a
Hobby subscription that is being paid regardless.

## Options

### Railway (existing Hobby plan)

$5/month including $5 of usage, already paid. Deploys from GitHub on every
push to `main`, the same flow the dashboard uses. Always on: no cold starts,
no sleeping. Usage limits can be set so the bill can't run away.

Against it: not tuned for Next.js the way Vercel is — no automatic preview
deployment per pull request without extra setup, and image optimization runs
on our own small server.

### Vercel (Hobby, free)

Made by the Next.js team; the smoothest possible Next.js hosting, with
preview deployments for every pull request. Against it: the free plan is for
non-commercial use only, and it is another account and another free tier to
track. A portfolio piece qualifies as non-commercial today, but if the board
ever took off, the move to the $20/month Pro plan would be forced.

### Netlify, Render, Fly.io

All workable. None offers anything here that Railway or Vercel doesn't, and
each is a new vendor.

## Decision

**Railway.**

It is already paid for and already understood, it never sleeps, and it adds
no new vendor. Vercel's advantages are real but mostly matter to teams
reviewing each other's pull requests; a solo build gets less out of them.

## Consequences

**Good:** no new account or bill. Same deploy process as the dashboard.
Always-on service, so the portfolio link is always fast.

**Bad:** no per-pull-request previews out of the box. Next.js must be built in
standalone mode for a small container.

**Mitigation:** test locally against the local Supabase stack before merging;
CI blocks deploys that fail tests (TR-TEST-5). Set a Railway usage limit and
alert (TR-OPS-3).

## Account

Confirmed 25 September 2026: the Railway Hobby subscription is on Sarah's
own account, so this project runs as a new service there and adds no new
subscription.

## Revisit if

Next.js features stop working properly off Vercel, or pull-request previews
become necessary (for example, if a collaborator joins).
