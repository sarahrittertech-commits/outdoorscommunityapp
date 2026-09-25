---
sidebar_position: 10
title: Cloning for another board
---

# Cloning for another board

This board is the **local, all-adventure** board for Western North Carolina.
The plan is to build it first and then clone it for the **women's outdoor
community app**. This page is how to do that cheaply, and what it costs.

## The short version

The codebase was built so that a second board is mostly configuration. Only
four things are deployment-specific:

| What | Where | For the women's app |
| --- | --- | --- |
| Name, tagline, description, audience, region, contact | `src/config/site.ts` | New name and wording |
| Region and category list | `supabase/migrations/20260925000005_seed_directory.sql` | Replace the file's contents |
| Legal and community wording | `src/app/{about,guidelines,terms,privacy}/page.tsx` | Rewrite for the audience |
| Colors | the tokens at the top of `src/app/globals.css` | The women's app design |

Everything else — the database schema, every permission rule, the 125
permission tests, the pages and forms — is shared and should not change.

## Recommended: fork with an upstream, not copy-paste

"Clone the codebase" can mean two things with very different long-term
costs:

| Approach | What it means | Consequence |
| --- | --- | --- |
| **Copy** | Duplicate the files into a new repo and carry on separately | Every bug fix and security fix has to be made twice, by hand. The two drift apart within weeks. |
| **Fork with upstream** (recommended) | New repo created from this one, keeping this one as `upstream` | Fixes made here are pulled into the women's app with one `git merge`. Its own changes stay in the four places above, so merges stay clean. |

Both give two separate public repositories for the portfolio. Only the
second keeps them in sync.

### Steps

1. **Finish and ship this board first.** A fork taken early inherits every
   bug twice.
2. Create the new repository on GitHub (empty), then:

   ```bash
   git clone https://github.com/sarahrittertech-commits/outdoorscommunityapp womens-outdoor-app
   cd womens-outdoor-app
   git remote rename origin upstream
   git remote add origin https://github.com/sarahrittertech-commits/<new-repo>.git
   git push -u origin main
   ```

3. Change the four deployment-specific places listed above, in one commit.
4. Update `CLAUDE.md`, `README.md` and `docs/` for the new product. The PRD,
   personas and guidelines will differ; the ADRs, data model and permission
   matrix carry over.
5. Create its own Supabase project and Railway service (see
   [Runbook](./runbook)). **Never share a database between the two boards.**
6. To bring in later fixes from this board:

   ```bash
   git fetch upstream
   git merge upstream/main
   npm run db:test && npm test
   ```

## Decisions to make before cloning

These are product questions for the women's app, not engineering ones, and
they change requirements:

- **Who can join.** Women-only communities usually rely on self-identification
  plus moderation rather than verification. Verification (ID checks) is a
  large, costly and sensitive feature; it would be new requirements, not a
  configuration change.
- **Safety features.** Members-only addresses already exist. The women's app
  may want members-only *events* entirely, or approval-required groups by
  default. Both are small, per-deployment settings if decided up front.
- **Moderation load.** Expect more reports per member. The site-admin queue
  and moderation log are already built; the question is who, besides Sarah,
  acts as site admin.

If any of these become code changes, put them behind a setting in
`src/config/site.ts` and build them **in this repository**, switched off
here. That keeps one codebase and keeps the merge in step 6 clean.

## What a second board costs

Per the portfolio's free-tier rule ([cost position](./technical-requirements#cost-position)):

| Service | Added cost | Note |
| --- | --- | --- |
| Supabase | ≈ $10/month if in the same Pro organization; $25/month if in its own | Pro's included compute covers one small project; each extra project is billed for its own compute. Check current pricing. |
| Railway | A few dollars of usage | A second service on the same Hobby plan. |
| Resend | $0 with a second free account, or $20/month | The free plan allows one sending domain per account. |
| Domain | ≈ $12–20/year | |

Roughly **$12–30/month more** for the second board, depending on the
Supabase choice.
