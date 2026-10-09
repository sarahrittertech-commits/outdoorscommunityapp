---
sidebar_position: 10
title: Cloning for another board
---

# Cloning for another board

This board is the **local, all-adventure** board for Western North Carolina.
The plan is to build it first and then clone it for the **women's outdoor
community app**. This page is how to do that cheaply, and what it costs.

## The short version

The codebase is built so that a second board is mostly configuration, and
so that merging this board's later work into it never touches its look
(see [ADR-0008](./architecture/adr-0008-brand-separation)).

Three kinds of thing, and only the last two belong to a clone:

|                  | What it covers                                                       | Where                                                                   |
| ---------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **The tool**     | Pages, components, schema, permissions, and the _set_ of color slots | Everything outside the rows below. Shared: a clone takes it as it comes |
| **The brand**    | Colors, logo, favicon, category drawings, brand guide                | `src/brand/` and `src/app/icon.svg`                                     |
| **The audience** | Name and wording, categories, legal copy, PRD, personas              | `src/config/site.ts`, the directory seed, the legal pages, those docs   |

In full, what a clone replaces:

| What                                                                                                                                        | Where                                                                                                 | For the women's app                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Colors                                                                                                                                      | `src/brand/tokens.css`                                                                                | Replace the whole file. Shared code only names slots, so this is the only place a color lives |
| Logo and favicon                                                                                                                            | `src/brand/Mark.tsx` and `src/app/icon.svg`                                                           | Its own mark, keeping the name `Mark` and the `.mark-stem` class. `icon.svg` holds literal colors (a favicon can't read CSS variables), so match them to `tokens.css` by hand |
| Category drawings                                                                                                                           | `src/brand/ActivityIcon.tsx` (keyed by category slug)                                                 | One drawing per new category; unknown slugs fall back to a plain circle                       |
| Sample photos for a couple of groups | `src/brand/activityPhotos.ts` and `public/activities/` | Its own, keyed by its group slugs, or an empty list |
| Brand guide                                                                                                                                 | `docs/brand.md`                                                                                       | Its own palette, with contrast ratios                                                         |
| Name, description, audience, region, contact, home page headline and intro, map tiles and starting point, search example, example town and meeting place for form hints, default join setting | `src/config/site.ts`                                                                                  | New name and wording; `defaultJoinPolicy: "approval"` if groups should start approval-only    |
| Region and category list                                                                                                                    | `supabase/migrations/20260925000005_seed_directory.sql`                                               | Replace the file's contents                                                                   |
| Towns for location search and the map | `src/config/towns.ts` | Its own towns with coordinates, and its default town |
| Legal and community wording                                                                                                                 | `src/app/{about,guidelines,terms,privacy}/page.tsx`                                                   | Rewrite for the audience                                                                      |
| Who the board is for                                                                                                                        | `docs/prd.md`, `docs/personas.md`, `CLAUDE.md`, `README.md`                                           | Its own audience and product context                                                          |
| Seed listings and the research agent's areas                                                                                                | `scripts/research/listings.sql` (the curated groups) and the area list in `scripts/research/agent.md` | Its own research, its own areas                                                               |

Everything else — the database schema, every permission rule, the
permission tests, the pages and forms — is shared and should not change.

**The rule that keeps it true:** shared code never holds a color, only a
slot name. When a feature needs a new color it adds a slot, and every board
gives it a value. `npm test` fails by name if a board is missing one, so a
clone finds out from a check rather than from a page that quietly lost its
background.

**The product documents are not a clone's to replace.** Use cases, user
flows, functional and technical requirements, the data model and the test
cases all merge down from here. A clone reads them as the list of what it
has yet to catch up on.

## Recommended: fork with an upstream, not copy-paste

"Clone the codebase" can mean two things with very different long-term
costs:

| Approach                             | What it means                                                  | Consequence                                                                                                                                            |
| ------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Copy**                             | Duplicate the files into a new repo and carry on separately    | Every bug fix and security fix has to be made twice, by hand. The two drift apart within weeks.                                                        |
| **Fork with upstream** (recommended) | New repo created from this one, keeping this one as `upstream` | Fixes made here are pulled into the women's app with one `git merge`. Its own changes stay in the files above, which are marked so a merge keeps them. |

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
   git config merge.ours.driver true   # once: see below
   ```

   That last line turns on the rule in `.gitattributes` that keeps the
   clone's own brand and audience files when merging from here. Without it
   Git ignores the marks and every merge conflicts on the colors and the
   logo. It is per checkout, so run it again on another machine.

3. Replace the files listed above, in one commit.
4. Update `CLAUDE.md`, `README.md` and `docs/` for the new product. The PRD,
   personas and guidelines will differ; the ADRs, data model, use cases and
   permission matrix carry over.
5. Create its own Supabase project and Railway service (see
   [Runbook](./runbook)). **Never share a database between the two boards.**
6. To bring in later fixes and features from this board:

   ```bash
   git fetch upstream
   git merge upstream/main
   npm run db:test && npm test   # a missing color slot fails here, by name
   ```

   Expect this to bring new use cases and requirements with it. Those are
   the catch-up list, not a change to the clone's own look: the brand files
   are kept as they are, and the merge only asks for a color when the tool
   has added a slot.

## Decisions to make before cloning

These are product questions for the women's app, not engineering ones, and
they change requirements:

- **Who can join.** Women-only communities usually rely on self-identification
  plus moderation rather than verification. Verification (ID checks) is a
  large, costly and sensitive feature; it would be new requirements, not a
  configuration change.
- **Safety features.** Members-only addresses already exist. The women's app
  may want members-only _events_ entirely, or approval-required groups by
  default. Both are small, per-deployment settings if decided up front.
- **Moderation load.** Expect more reports per member. The site-admin queue
  and moderation log are already built; the question is who, besides Sarah,
  acts as site admin.

If any of these become code changes, put them behind a setting in
`src/config/site.ts` and build them **in this repository**, switched off
here. That keeps one codebase and keeps the merge in step 6 clean.

## What a second board costs

Per the portfolio's free-tier rule ([cost position](./technical-requirements#cost-position)):

| Service  | Added cost                                                           | Note                                                                                                                      |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Supabase | ≈ $10/month if in the same Pro organization; $25/month if in its own | Pro's included compute covers one small project; each extra project is billed for its own compute. Check current pricing. |
| Railway  | A few dollars of usage                                               | A second service on the same Hobby plan.                                                                                  |
| Resend   | $0 with a second free account, or $20/month                          | The free plan allows one sending domain per account.                                                                      |
| Domain   | ≈ $12–20/year                                                        |                                                                                                                           |

Roughly **$12–30/month more** for the second board, depending on the
Supabase choice.
