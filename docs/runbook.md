---
sidebar_position: 11
title: Runbook
---

# Runbook

How to run the board locally, test it, and deploy it.

## Local development

### With Docker (normal path)

```bash
npm install
npx supabase start          # Postgres, Auth, Storage, and a mail catcher; applies migrations and seed.sql
cp .env.example .env.local  # paste the API URL and anon key that `supabase start` printed
npm run dev                 # http://localhost:3000
```

Sign in as any seed user (for example `maya@example.com`, the owner of
Brevard Saturday Paddlers, or `admin@example.com`, the site admin) with the
local seed password `trail-mix-2026` (set in `supabase/seed.sql`, never used
in production). Confirmation and password reset emails for new local
accounts arrive in the mail catcher at http://127.0.0.1:54324.

```bash
npm run db:reset   # rebuild the local database from migrations + seed
npm run db:types   # regenerate src/lib/supabase/database.types.ts after a schema change
```

### Without Docker

The permission tests can run on any Postgres 15+ with pgTAP installed, using
a small stand-in for Supabase's auth schema:

```bash
PGHOST=/tmp PGPORT=5432 PGUSER=postgres npm run db:test:local
```

## Checks

Run before every push; CI runs the same.

```bash
npm run lint
npm run typecheck
npm test            # unit tests (UT-*)
npm run db:test     # permission tests (PT-*), needs `supabase start`
npm run build
```

## Deploying to production

One-time setup, in this order.

### 1. Supabase

1. Create a **new organization** (so upgrading to Pro doesn't affect the
   dashboard's projects) and a project in it.
2. Link and push the schema:

   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push        # applies supabase/migrations; seed.sql is NOT applied
   ```

3. **Authentication → URL configuration:** Site URL = the production URL;
   redirect URLs = `https://<domain>/auth/callback`.
4. **Authentication → Providers → Email** (UC-29, ADR-0009): enable the
   Email provider with **email and password sign-up allowed**, **Confirm
   email ON**, **minimum password length 10**, and *Secure password change*
   off (the app checks the current password itself, FR-AC-21). See
   [Password sign-in settings](#password-sign-in-settings-uc-29).
5. **Authentication → SMTP:** enter Resend's SMTP settings. Without this,
   Supabase only emails the project's own team (see
   [ADR-0004](./architecture/adr-0004-background-jobs-and-email)).
6. Make Sarah's account the site admin after first sign-in:

   ```sql
   update public.accounts set is_site_admin = true
   where id = (select id from auth.users where email = '<sarah's email>');
   ```

7. Before public launch: upgrade to **Pro** (no pausing, daily backups) and
   run the security advisor (TR-SEC-10).

### 2. Resend

Add and verify the sending domain (SPF, DKIM and DMARC records at the domain
registrar), then create the SMTP credentials used in step 1.5.

### 3. Railway

1. New service → deploy from this GitHub repository, `main` branch.
   `railway.json` sets the build and start commands and the health check.
2. Variables (needed at build time as well as runtime):

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | the project's API URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the project's anon (publishable) key |
   | `NEXT_PUBLIC_SITE_URL` | `https://<domain>`. Required: the links in confirmation and reset emails and the redirect after sign-in are built from it, because behind Railway's proxy the server only sees itself as `0.0.0.0:8080`. |

   Never add the service-role key to Railway (TR-SEC-3).
3. Add the custom domain. Set a usage limit and alert (TR-OPS-3).

## Seeding real groups

The board launches with real local groups rather than an empty directory:
they are listed from public information until their organizers claim them.
The source research (organizations, places, events and an activity list)
lives in a private `research` schema in the production database: the API
doesn't expose it, visitors and signed-in users can't see it, and the data
is never committed to this public repository because it holds contact
details and internal notes.

1. Export the research spreadsheet as CSVs (`activities.csv`,
   `organizations.csv`, `places.csv`, `events.csv`) into a folder outside
   the repository.
2. Turn them into SQL and run it in the Supabase SQL editor (or with psql):

   ```bash
   node scripts/research/load.mjs ~/research-export > ~/research.sql
   ```

   It replaces the research tables' contents, so re-running with a newer
   export is safe.
3. Review candidates with `select * from research.organization_fit`. Its
   `board_fit` column is a first sort by organization type — *community
   group*, *business*, *venue*, *not a listing*, *closed* — not a decision.
   Only community groups belong on the board as groups.
4. Add the chosen community groups as **unclaimed listings** (FR-GR-9) by
   running `scripts/research/listings.sql` in the SQL editor. The script
   holds the curated list (research ids, names, activities and short
   neutral descriptions written for the board) and copies only public
   facts from the research: each group's web page, and its upcoming events
   that have a published start time. No contact details, prices or notes.
   It skips anything already there, so it is safe to re-run after loading
   a newer export; events that have passed simply drop out of the listings.
5. When an organizer claims a listing, check their note against the
   group's own page and approve or decline it on the site admin page. The
   claimant becomes the owner and the listing becomes an ordinary group.

### Weekly research agent (UC-9)

A scheduled Claude Code session runs once a week, follows
`scripts/research/agent.md`, and saves what it finds as candidates by
calling the `research-intake` Edge Function, which runs
`research.add_candidate()`. Review them under *Candidates* on the site
admin page: *List it* or *Skip*. To change what it looks for, edit
`scripts/research/agent.md`; the next run picks it up.

The session reads web pages, so it has no database access of its own. It
holds one token (`RESEARCH_AGENT_TOKEN`) that opens the intake, and the
intake can only list what the board knows and add a candidate. The
routine must not have the Supabase connector attached.

Setting it up or changing the token:

1. Make a random token of at least 32 characters (a password manager's
   generator, or `openssl rand -hex 32`).
2. Supabase dashboard → Edge Functions → Secrets: set
   `RESEARCH_AGENT_TOKEN` to it.
3. claude.ai → Code → the cloud environment the routine uses → Edit:
   add the environment variable `RESEARCH_AGENT_TOKEN` with the same value,
   and allow `rxszqxwpgbrdytbkyxwp.supabase.co` under network access.
4. Deploy the function: `npx supabase functions deploy research-intake`
   (its JWT check is off in `supabase/config.toml`; it checks the token).

If the token leaks, change it in both places; the old one stops working at
once.

## Operations

### Password sign-in settings (UC-29)

Email and password replaced the emailed sign-in link on 9 October 2026.
These are dashboard settings, not code, so check them on any new project
(and on the women's clone):

1. **Authentication → Sign In / Providers → Email:** Email provider
   enabled; **Allow new users to sign up** on; **Confirm email** on;
   **Minimum password length** 10; password requirements none (the app
   refuses common passwords itself); *Secure password change* off.
2. **Authentication → URL configuration:** the Site URL is the production
   URL and `https://<domain>/auth/callback` is a redirect URL (the
   confirmation and reset links land there with `?next=`).
3. **Authentication → Rate limits:** leave Supabase's defaults (they limit
   sign-ins and emails per IP address). The app adds a per-address pause:
   5 wrong passwords in 15 minutes pause that address for 15 minutes. It
   is kept in the server's memory, so a deploy or restart clears it, and
   it only covers the whole site while Railway runs one instance
   (ADR-0009).
4. **Authentication → Emails → SMTP:** still needed. Until Resend's SMTP is
   set up, Supabase's built-in sender only reaches the project's own team,
   so the public can sign in to existing accounts but cannot confirm a new
   account or reset a password.
5. **Optional, for links that open in any browser:** in **Authentication →
   Emails → Templates**, point *Confirm signup* at
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/`
   and *Reset password* at
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`.
   The default links work only in the browser that asked for them.
6. **Existing accounts** (created with the old emailed link) have no
   password: use *Forgot password* on the sign-in page to set one.

### Deleted accounts

`delete_my_account()` removes a user's personal data at once and marks the
account deleted. The sign-in record in `auth.users` must then be deleted by
a server-side job within 24 hours (TR-PRIV-4). Until that job exists, do it
by hand from the Supabase dashboard (Authentication → Users), or:

```sql
delete from auth.users where id in (select id from public.accounts where deleted_at is not null);
```

When an owner deletes their account, any group they still own is archived,
its upcoming events are cancelled, and it shows *This group needs an
organizer* with a claim form. Claims on it arrive under *Claim requests* on
the site admin page; approving one makes the claimant the owner and the
group active again. Restoring it any other way is refused.

### Restoring from backup

Supabase Pro keeps daily backups for 7 days: Database → Backups → Restore.
Restoring replaces the whole database.

### Rotating keys

Supabase: Settings → API → rotate. Update the Railway variable, redeploy.

### A report of illegal content

Remove it immediately from the site-admin page (remove the post or the
group), suspend the account, and record the reason. The moderation log keeps
a copy of removed text for the site admin; if law enforcement is involved,
export it from `moderation_actions` before anything else.
