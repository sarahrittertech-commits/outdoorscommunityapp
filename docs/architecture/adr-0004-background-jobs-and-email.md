---
sidebar_position: 5
title: ADR-0004 Background jobs and email
---

# ADR-0004 — No n8n: scheduled Edge Functions and Resend for email

**Status:** Proposed · **Date:** 25 September 2026

## Context

The board has very little background work:

- Sign-in link emails (sent by Supabase Auth)
- Event reminders 24 hours ahead (FR-NT-4), on a schedule
- A handful of "something happened" emails: join request, approval,
  cancellation (FR-NT-2, 3, 5)

The dashboard uses n8n Cloud for scheduling and routing across several
ingestion pipelines. The question is whether this project should too.

Separately, Supabase's built-in email service only delivers to members of
the project's own team, and only a couple of messages an hour. Real users
cannot sign in without a custom email provider.

## Options

### n8n Cloud (existing subscription)

Visual workflows, already set up. Against it: logic spread across two places
(the repository and n8n), not versioned with the code, not covered by the
repository's tests. The dashboard needed a dedicated rule to stop personal
data landing in n8n's execution logs; this board would need the same. All of
that for two or three jobs.

### Supabase `pg_cron` + an Edge Function

A cron schedule inside the database calls a small function that finds events
starting in 24 hours and sends the reminders. Lives in the repository, runs
next to the data, costs nothing extra on either plan. Event-driven emails are
sent directly by the web app's server actions.

### A Railway cron service

Also workable, but it is a second service to deploy and it needs the
service-role key outside Supabase.

### Email providers: Resend, Postmark, Amazon SES, SendGrid

Resend: simple API, works as Supabase's SMTP server, free tier of 3,000
emails a month (100 a day). Postmark: excellent deliverability, no permanent
free tier. SES: cheapest at volume, fiddliest to set up. SendGrid: its free
tier has been cut back over the years.

## Decision

**No n8n. Scheduled work runs as a Supabase Edge Function triggered by
`pg_cron`; event-driven emails are sent from the web app's server. All email —
including Supabase Auth's sign-in links — goes through Resend from a verified
custom domain.**

## Consequences

**Good:** every piece of logic is in the repository, versioned and testable.
No new subscription. Nothing personal flows through a third-party workflow
tool's logs.

**Bad:** no visual workflow editor. A new vendor (Resend) and a domain are
required before launch.

**Watch:** Resend's free tier stops at **100 emails a day**. Sign-in links
count too. A busy weekend's reminders plus normal sign-ins could reach it. At
that point the choices are the $20/month plan or making reminders opt-in. The
`email_log` table (see [data model](../data-model#notifications-should)) makes
it easy to see how close the board is.

**Guarantee:** each reminder is recorded in `email_log` before the job
finishes, so a job that runs twice sends nothing twice.

## On the existing n8n subscription

This project gives no reason to keep or cancel it. That decision depends only
on whether the dashboard still needs it.

## Revisit if

Background work grows beyond a few scheduled jobs — for example, importing
groups from other platforms or a weekly digest with complex rules.
