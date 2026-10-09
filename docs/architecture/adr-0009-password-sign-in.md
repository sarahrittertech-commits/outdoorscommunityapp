---
sidebar_position: 10
title: ADR-0009 Password sign-in
---

# ADR-0009 — Email and password sign-in

**Status:** Proposed · **Date:** 9 October 2026 · would supersede the
sign-in part of [ADR-0002](./adr-0002-database-and-auth)

## Context

The board signs people in with an emailed one-time link (FR-AC-1): no
password, one form for signing up and signing in. Sarah found that a major
flaw for this audience: people expect to create an account with a
password, and a returning member shouldn't have to wait for an email every
time. She chose open sign-up with a confirmed email and a password, and
password as the only way in (9 October 2026, UC-29).

## Options

### Keep the emailed link (today)

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

## Decision (proposed)

Email and password through Supabase Auth, with **Confirm email on**,
minimum 10 characters, the reset flow, and guessing slowed by Supabase's
limits plus a per-address check in the sign-in action. Sign-in forms stay
plain HTML posting to server actions, so they work without JavaScript and
no captcha is needed yet.

## Consequences

**Good:** the familiar way in; returning members don't wait on email; the
demo member (UC-28) gets simpler, since it can sign in with a password
held in a server secret.

**Bad:** sign-up and reset still send email, so **nothing works for the
public until Resend's SMTP and a domain are set up** (ADR-0004); Supabase's
built-in sender only reaches the project's own team. Leaked-password
checking (Have I Been Pwned) needs Supabase Pro; until then a short common-
password list in the app. Existing accounts (one, Sarah's) set a password
through *Forgot password*. UC-25 (our own sign-in email) changes from
the sign-in link to the confirmation and reset emails.
