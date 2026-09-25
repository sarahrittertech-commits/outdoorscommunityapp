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
Brevard Saturday Paddlers, or `admin@example.com`, the site admin). The
sign-in link arrives in the local mail catcher at http://127.0.0.1:54324.

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
4. **Authentication → Providers → Email:** enable email sign-in; turn off
   password sign-up if the dashboard offers it.
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
   | `NEXT_PUBLIC_SITE_URL` | `https://<domain>` |

   Never add the service-role key to Railway (TR-SEC-3).
3. Add the custom domain. Set a usage limit and alert (TR-OPS-3).

## Operations

### Deleted accounts

`delete_my_account()` removes a user's personal data at once and marks the
account deleted. The sign-in record in `auth.users` must then be deleted by
a server-side job within 24 hours (TR-PRIV-4). Until that job exists, do it
by hand from the Supabase dashboard (Authentication → Users), or:

```sql
delete from auth.users where id in (select id from public.accounts where deleted_at is not null);
```

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
