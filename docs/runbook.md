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
   export is safe. To add a newer export **without touching what's already
   loaded**, use `--append`: only rows whose id and name aren't there yet
   are inserted, nothing is changed or deleted, and each row's market goes
   at the start of its notes. Running it twice adds nothing the second time.

   ```bash
   node scripts/research/load.mjs --append ~/research-export > ~/research.sql
   ```
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

### Gemini sweep (the inexpensive one, from 12 October 2026)

**Revised 12 October 2026, still switched off until Sarah runs it.**
Google approved paid API access the same day. Before the first run the
sweep was rebuilt after a day of invented AI data (whole event files with
made-up websites):

- **Gemini never supplies dates.** It names organizations and the page
  where each posts its events (`events_url`), at most 12 per run, "fewer
  is fine, never guess".
- **Activity passes, live regions only.** `areas.json` lists the live
  regions' hubs (deep before wide; the other target towns wait under
  `later`) and seven activity passes: cycling, running, hiking and trail
  stewardship, paddling and fishing, climbing and snow, nature, affinity.
- **Proof of search.** Gemini's answer carries the sites Google actually
  returned; each find records whether its site was among them.
- **Invented-batch alarm.** If most suggested sites don't load at all, the
  run sends nothing.
- **Dates only from the organizer's page,** read by the script: its
  schema.org event data, or on its own WordPress site the public listing
  of The Events Calendar (`/wp-json/tribe/events/v1/events`). Events
  without a start time are kept as date-only, never published.
- Homepages that don't load or don't name the organization are kept as
  failed with the reason (FR-RS-13).

Cost on the paid tier: one request per run, with Google Search billed per
search after the monthly free allowance (5,000 for Gemini 3 models), at
eight runs a day well inside it. Manual only for now: no schedule until Sarah has seen a test run's cost.
Actions → *Research sweep (Gemini)* → *Run workflow*, with *Dry run* on
(the default) to ask Gemini and check links without saving anything; each
run logs its tokens and Google searches. Hard cap on spending: lower the
Generative Language API's requests-per-day quota in the Google Cloud
project, and add a billing budget alert (alerts don't stop spending). To
schedule it later, add the cron lines noted in the workflow file.

**Topic search** (12 October 2026): fill in *topic* (for example "fly tying
clinics") and *area* (for example "Western North Carolina") when running
the workflow, instead of the rotation. Every run, topic or not, leaves a
spreadsheet, `research-results.csv`, under the run's *Artifacts*: each
organization with its kind, area, website, events page, whether it checked
out, and how many dated events its page published.

`.github/workflows/research-sweep.yml` runs `scripts/research/gemini/sweep.mjs`
every three hours on GitHub's free runners. Each run takes one area and one
search pass from `scripts/research/gemini/areas.json`, in turn (26 areas ×
4 passes: anchors, everyday groups, affinity groups, venues and companies),
and makes **one** Gemini API call with Google Search. The script then opens
every link itself: a find is kept only if its page loads and names it, and
an event only if its own page shows its date. Survivors go to the research
intake as candidates; nothing is listed and the website doesn't change.

It does nothing until two repository secrets exist (GitHub → the repo →
Settings → Secrets and variables → Actions):

1. `GEMINI_API_KEY`: a free key from Google AI Studio
   (aistudio.google.com → Get API key). The free tier is separate from the
   Gemini app's Deep Research allowance. Google may use free-tier prompts to
   improve its products; the sweep only sends public information.
2. `RESEARCH_AGENT_TOKEN`: the same value as the Supabase secret of that name
   (see *Weekly research agent* below).

Optional: a repository *variable* `GEMINI_MODEL` if Google renames the
model (default `gemini-3.8-flash`; on 12 October 2026 Google answered 404 for `gemini-2.5-flash` on new keys, since the 2.5 models are kept only for accounts that already used them). To try it once by hand: Actions →
*Research sweep (Gemini)* → *Run workflow*, or locally with
`node scripts/research/gemini/sweep.mjs --dry --run 0` (sends nothing).
Edit `areas.json` to change the list. A run that hits the free quota stops
quietly and the next one tries again.

### Area sweep (from 12 October 2026)

A Claude routine on claude.ai, *Branch Outdoors area sweep*, can run every two
hours (more thorough than the Gemini sweep, but it uses Claude credits) and follows `scripts/research/area-sweep.md`: Sarah's list of target
areas, two per run, saved as candidates only. It needs the same
`RESEARCH_AGENT_TOKEN` and the same permission as the weekly agent (below).
Pause it from claude.ai when the list is done or the review queue is too
long. It was created on 12 October 2026 switched **off**: before turning it
on, add the allow rule in step 5 below and remove every connector from the
routine (claude.ai attached all of the account's connectors, Supabase
included, and the API couldn't detach them).

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
5. Let the routine call the intake. The 9 October run was stopped by
   claude.ai's auto-mode safety check, which read the authenticated `curl`
   to Supabase as possible data exfiltration. In claude.ai → Code → the
   routine's environment (or the account's auto-mode settings), add an
   allow rule for POSTs to
   `https://rxszqxwpgbrdytbkyxwp.supabase.co/functions/v1/research-intake`.
   Only Sarah can change these permissions.

If the token leaks, change it in both places; the old one stops working at
once.

## Listing guides, shops and venues (UC-12, UC-37)

The research keeps guide services and shops (`kind` *guide* or
*business*) instead of offering them as groups. They wait on the site
admin page under **Guides and shops**: check the source link, pick the
region and press *List it*, or *Skip*. A listed one appears at
`/guides-and-shops` and `/b/<slug>`, never among the communities. To
take one down, open its page signed in as the site admin and press
*Remove this listing*. Listings carry no prices, hours or contact
details; those stay on the business's own site.

Since 12 October 2026 a listing can have events (UC-37). Research finds
with `kind` *guide*, *business* or *venue* carry `events` like group
finds; they publish when the listing is made, and later finds for a
listed host add new ones (`research.add_candidate`). Each shows at
`/h/<id>` and in Events marked with its host. Signed in as the site
admin, *Remove this event* on that page takes one down.

## Opening a region

How a new region goes from research to the board (UC-35, FR-RG-9,
[ADR-0010](./architecture/adr-0010-regions)). Six regions opened this way
on 11 October 2026.

1. **Pick the hubs.** One or more hub towns, a radius (100 miles unless the
   area says otherwise), a name and a short name for the header. If two
   hubs' areas mostly overlap (Denver and Boulder, Seattle and Bellingham),
   make them one region.
2. **Add the region in one change:**
   - a migration inserting the `regions` row: slug, name, time zone,
     centre, radius, state, `status` (`coming_soon` while groups are
     still being reviewed, then `live`), order and hub towns;
   - the region in `src/config/regions.ts` (short name, hubs, centre and
     zoom, hero line, example town and meeting place);
   - its towns in `src/config/towns.ts`, each naming the region, with
     coordinates to two decimals;
   - its zip codes in `src/config/zips.ts`: 5-digit codes for the towns
     that matter most, or 3-digit prefixes mapped to a nearby town.
   `npm test` checks that every town and zip belongs to a region that
   exists.
3. **Research the area** with the Gemini prompt in
   `scripts/research/gemini-prompt.md`, one city at a time, then **load
   the research** with
   `node scripts/research/load.mjs --append <folder>` (see *Seeding real
   groups*). It only adds rows that aren't there yet.
4. **Make candidates** of the community groups that have a website, and
   review them on the admin page: *List* into the region, or *Skip*.
5. **Bias check (FR-RS-12):** before going live, make sure the research
   included the affinity pass (women's, queer and LGBTQ+, BIPOC, adaptive,
   youth and family groups) and that every group on the city's
   known-groups list is either a candidate or a listing. Count them:
   `select count(*) filter (where cardinality(affinity_tags) > 0), count(*) from public.groups where region_id = (select id from public.regions where slug = '<slug>');`
   Note the count here when the region opens.
6. **Go live:** a migration setting the region's `status` to `live`. It
   then shows under *change* for everyone.

**Moving existing groups into a region.** `scripts/regions/assign-regions.mjs`
matches each group's area to the town list: given the groups as JSON on
stdin it prints one guarded `update` per group to move (read it before
running it); with `--values` it prints a single statement. Watch for plain
town names used in more than one state (Burlington, Monroe, Clinton,
Louisville, Charleston).

Opened so far: the six launch regions and, the same evening, `wasatch`
(Salt Lake City; migration `20261011000003_region_wasatch.sql`). At
opening the Wasatch had no listed groups; its research (about 55
organizations, mostly bike shops) still needs the affinity pass (FR-RS-12).

Then `reno-tahoe` (Reno and Lake Tahoe; migration
`20261011000005_region_reno_tahoe.sql`): 21 towns from Susanville and
Fernley to Carson City, South Lake Tahoe, Truckee and Grass Valley, zip
prefixes 894, 895, 897 and 961. Its first research included an affinity
pass.

Then `sedona-flagstaff` (Sedona and Flagstaff; migration
`20261011000006_region_sedona_flagstaff.sql`): Arizona time (no daylight
saving), 21 towns across the Verde Valley, Flagstaff, Williams, the Grand
Canyon's South Rim, Prescott and Payson; zip prefixes 860 and 863, with
Sedona's and the Verde Valley's own codes listed so they don't fall to
Prescott. Its research included an affinity pass.

Then `upstate-sc` (Greenville and the Upstate; migration
`20261012000006_region_upstate_sc.sql`): Eastern time, 23 towns from
Greenville and Travelers Rest to Clemson, Lake Jocassee, Anderson,
Spartanburg and Greenwood; zip prefixes 293 and 296, with the smaller
towns' own codes listed so they don't all fall to Greenville. It sits
about 50 miles from Asheville, so a group near the state line goes in
whichever region its meetups are in.

Then `durango-san-juans` (Durango and the San Juans; migration
`20261012000007_region_durango_san_juans.sql`): Mountain time, 21 towns
from Durango to Silverton, Ouray, Telluride, Cortez, Pagosa Springs,
Montrose and Farmington, NM; zip prefixes 813 and 874, with the towns in
other prefixes (Pagosa, Silverton, Ouray, Telluride) listed by their own
codes.

To check a region's reach before opening it:
`select name, hub_towns, radius_miles, status from public.regions order by sort_order;`

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
5. **Optional, for links that open in any browser:** change the *Confirm
   signup* and *Reset password* templates as *Email links that work in any
   browser* below says (the `{{ .RedirectTo }}` versions). Don't point
   *Confirm signup* at a fixed `next=/`: that skips creating a password.
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

### Invites (UC-31)

The invite link works with no setup. Email invites (FR-MB-12, FR-MB-13)
are built but switched off with `emailEnabled: false` in
`src/config/site.ts`; while off the forms show disabled and nothing is
stored. To switch them on:

1. Finish *Resend* above (a verified sending domain).
2. Write the sender (not built yet): a scheduled Edge Function, run with
   the service role, that picks up `invites.email_invites` rows with no
   send recorded, sends one plain email each with the link
   `<site url>/join/<token>` (manager invites say they are for that
   address only), and records the send in `email_log`.
3. Schedule `select public.purge_old_invites();` daily (pg_cron or the
   same scheduled function). It deletes invites older than 30 days, which
   is the promise FR-MB-13 makes about addresses. Run it by hand until then
   if any invites were stored.
4. Set `emailEnabled: true` and deploy.

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

## Email links that work in any browser (UC-29)

Supabase's default email links only work in the browser that asked for
them, and email scanners (Outlook Safe Links, Gmail previews) can use them
up before the person clicks. The app's `/auth/confirm` page fixes both: the
link opens a page with a **Continue** button, and the link is used only when
the button is pressed. For the emails to point there, change two templates
in the Supabase dashboard, **Authentication → Emails → Templates**:

- **Confirm signup**, replace the link with:
  `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup">Confirm my email and create my password</a>`
- **Reset password**, replace the link with:
  `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Set a new password</a>`

`{{ .RedirectTo }}` is the app's `/auth/callback?next=…` address, which
is already in the allowed redirect URLs; the callback hands token_hash
links to `/auth/confirm` without using them. Until the templates are
changed, links still work, but only when opened in the same browser that
requested them.

## Sample data (10 October 2026)

For testing, production has one clearly labelled sample group,
**[Sample] Trail Test Crew** (`/g/sample-trail-test-crew`): slritter@gmail.com
("Sam (sample admin)") is its page admin and sarahrittertech@gmail.com a
member. It has four `[Sample]` events (free with a waitlist, paid, organizers
approve RSVPs with an FAQ and a sponsor, RSVPs open later), a thread with a
nested reply, and one message request from Sam to Sarah. Sam must finish the
welcome step (18+, terms) before posting. To remove all of it, run in the
Supabase SQL editor:

```sql
begin;
delete from public.conversations c
 using auth.users a, auth.users b
 where a.id = c.starter_id and b.id = c.recipient_id
   and a.email = 'slritter@gmail.com' and b.email = 'sarahrittertech@gmail.com';
-- Members, events, RSVPs, FAQ, sponsors, threads and replies cascade.
delete from public.groups where slug = 'sample-trail-test-crew';
commit;
```

