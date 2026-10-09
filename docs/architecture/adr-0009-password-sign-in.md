---
sidebar_position: 10
title: ADR-0009 Password sign-in
---

# ADR-0009 — Email and password sign-in

**Status:** Accepted · **Date:** 9 October 2026 (accepted and built the
same day) · supersedes the sign-in part of
[ADR-0002](./adr-0002-database-and-auth)

## Context

The board signed people in with an emailed one-time link (FR-AC-1): no
password, one form for signing up and signing in. Sarah found that a major
flaw for this audience: people expect to create an account with a
password, and a returning member shouldn't have to wait for an email every
time. She chose open sign-up with a confirmed email and a password, and
password as the only way in (9 October 2026, UC-29).

## Options

### Keep the emailed link (what we had)

Nothing to store or leak, nothing to forget, one flow. Against it: every
sign-in waits on an email, which is slow, lands in spam, and fails
completely until custom SMTP is set up; and it surprises people who expect
a password.

### Email and password, email confirmed first (chosen)

Supabase Auth supports it directly: hashed passwords (bcrypt), *Confirm
email*, reset links, rate limits. Sign-in needs no email, so returning
members are never stuck on delivery. Against it: four forms instead of
one (sign up, sign in, forgot, set new password), password-guessing to
slow down, and a reset flow to keep working.

### Both, side by side

Friendliest, but two flows to build, test and explain. Not chosen.

## Decision

Email and password through Supabase Auth, with **Confirm email on**,
minimum 10 characters, the reset flow, and guessing slowed by Supabase's
limits plus a per-address check in the sign-in action. Sign-in forms stay
plain HTML posting to server actions, so they work without JavaScript and
no captcha is needed yet.

**The per-address check lives in server memory, not the database.** A
failed sign-in is anonymous, and the anonymous role never writes
(TR-SEC-2), so an attempts table would need either an anon write policy
or the service-role key in a page request; both are ruled out. The
in-memory counter (`src/lib/sign-in-limiter.ts`) costs nothing and is
exact while Railway runs **one instance**, as it does today. Its limits:
it forgets on a restart or deploy, and if the site ever runs several
instances each counts on its own (5 tries per instance per address).
Supabase Auth's own per-IP limits still apply on top either way. If the
site scales out, move the counter to Supabase (an Edge Function holding
its own key) or a shared store.

**Set a new password only straight after the reset link.** The callback
sets a one-hour, HTTP-only cookie holding the user's id when a reset link
signs them in; the reset page and action require it. An ordinary session
can only change the password from the profile page, with the current
password (checked on a separate, cookie-less client so the visitor's own
session is untouched). Either change signs out every other session.

## Consequences

**Good:** the familiar way in; returning members don't wait on email; the
demo member (UC-28) gets simpler, since it can sign in with a password
held in a server secret.

**Bad:** sign-up and reset still send email, so **new accounts and resets
don't work for the public until Resend's SMTP and a domain are set up**
(ADR-0004), though existing accounts sign in without email; Supabase's
built-in sender only reaches the project's own team. Leaked-password
checking (Have I Been Pwned) needs Supabase Pro; until then a short common-
password list in the app. Existing accounts (one, Sarah's) set a password
through *Forgot password*. UC-25 (our own sign-in email) changes from
the sign-in link to the confirmation and reset emails.
