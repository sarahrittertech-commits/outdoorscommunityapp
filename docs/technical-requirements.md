---
sidebar_position: 6
title: Technical requirements
---

# Technical requirements

How the board must be built. The reasoning behind each major choice is in the
[architecture decisions](./architecture/); this page states the requirements
that follow from them.

## Architecture at a glance

```
 Browser                      Railway                         Supabase
 ───────                      ───────                         ────────
 Plain HTML pages,   HTTPS    Next.js app                     Postgres
 small amount of JS ───────►  • renders every page on    ───► • all data
 Forms work without           the server                      • row-level security:
 JavaScript                   • form submissions run as         every permission rule
                                the signed-in user            Auth
                              • validates input (Zod)         • email sign-in links
                                                              Storage
                                                              • group cover images
                                                              Scheduled Edge Function
                                                              • reminder emails ──► Resend
```

The web app never holds more power than the person using it: it asks the
database for data *as that user*, and the database decides what they may see
or change.

## Stack — TR-STK

| ID | Requirement | Record |
| --- | --- | --- |
| TR-STK-1 | Next.js (App Router) with TypeScript in strict mode. | [ADR-0001](./architecture/adr-0001-web-platform) |
| TR-STK-2 | Tailwind CSS for styling. No component library unless the design calls for one. | ADR-0001 |
| TR-STK-3 | Supabase: Postgres for data, Supabase Auth for sign-in, Supabase Storage for cover images. `@supabase/ssr` for server-side sessions. | [ADR-0002](./architecture/adr-0002-database-and-auth) |
| TR-STK-4 | Zod for validating every form and every server action input. | — |
| TR-STK-5 | Hosted on Railway, auto-deployed from the `main` branch on GitHub. | [ADR-0003](./architecture/adr-0003-hosting) |
| TR-STK-6 | Transactional email through Resend, used both as Supabase Auth's SMTP server and for notification emails. | [ADR-0004](./architecture/adr-0004-background-jobs-and-email) |
| TR-STK-7 | Scheduled work (event reminders) runs as a Supabase Edge Function triggered by `pg_cron`. No n8n. | ADR-0004 |
| TR-STK-8 | Keep dependencies few. Every new runtime dependency is justified in the commit that adds it. | — |

## Performance and page weight — TR-PERF

Principle P6: light and fast.

| ID | Requirement | Measured by |
| --- | --- | --- |
| TR-PERF-1 | Every public page is rendered to HTML on the server. No public page shows a loading spinner for its main content. | Viewing page source shows the content |
| TR-PERF-2 | Browse pages (home, listings, group, event) ship no more than **75 KB** of compressed JavaScript. | Build output / Lighthouse |
| TR-PERF-3 | Largest Contentful Paint under **1.5 s** on Lighthouse's mobile profile for the home and listing pages. | Lighthouse in CI or pre-release |
| TR-PERF-4 | Lists paginate with numbered pages. No infinite scroll. | Review |
| TR-PERF-5 | Listing pages are cached briefly (up to 60 seconds) so a burst of visitors doesn't become a burst of database queries. | Response headers |
| TR-PERF-6 | Cover images are resized on upload to at most 1200 px wide and served as WebP. | Storage inspection |

## Progressive enhancement — TR-PE

| ID | Requirement |
| --- | --- |
| TR-PE-1 | With JavaScript switched off, every browse page renders and every link works. |
| TR-PE-2 | Core forms (sign in, join, RSVP, post, report) are ordinary HTML forms that submit and work without JavaScript. JavaScript may improve them, never be required for them. |

This is also a good portfolio talking point: it is rare, and it proves the
server does the real work.

## Findability — TR-SEO

| ID | Requirement |
| --- | --- |
| TR-SEO-1 | Semantic HTML: one `h1` per page, real headings, lists as lists, links as links. |
| TR-SEO-2 | Every public page has a unique title and description and Open Graph tags, so a shared link shows a proper preview. |
| TR-SEO-3 | Event pages include schema.org `Event` structured data. |
| TR-SEO-4 | A generated `sitemap.xml` of active groups and upcoming events; `robots.txt` excludes account, admin and discussion pages. |
| TR-SEO-5 | Archived groups and past events are `noindex` after 90 days. |

## Accessibility — TR-A11Y

| ID | Requirement |
| --- | --- |
| TR-A11Y-1 | WCAG 2.2 level AA. |
| TR-A11Y-2 | Everything works by keyboard, with a visible focus indicator. |
| TR-A11Y-3 | Text contrast at least 4.5:1; links distinguishable from text by more than color. |
| TR-A11Y-4 | Form errors are announced and tied to their field. |
| TR-A11Y-5 | Automated accessibility checks (axe) run against the main pages in CI. |

## Security — TR-SEC

Several of these come directly from what went wrong or nearly went wrong on
the dashboard.

| ID | Requirement |
| --- | --- |
| TR-SEC-1 | Row-level security is switched on for **every** table in every exposed schema. A table without a policy for an action refuses that action. |
| TR-SEC-2 | **No policy grants insert, update or delete to the anonymous role.** Ever. (The dashboard accumulated several `anon_write_*` migrations; this project has a test that fails if one appears.) |
| TR-SEC-3 | The Supabase service-role key is used only in scheduled jobs and site-admin scripts, never in the browser and never to serve an ordinary page request. |
| TR-SEC-4 | Secrets live in Railway environment variables and Supabase Edge Function secrets. Never in the repository, never in client-side code. A secret scanner runs in CI. |
| TR-SEC-5 | Every server action validates its input with a Zod schema before any database call, and refuses on failure. |
| TR-SEC-6 | User content is stored and rendered as plain text. Links are made clickable by the app with `rel="nofollow ugc noopener"`. No user HTML or Markdown-to-HTML. |
| TR-SEC-7 | A Content Security Policy header allows scripts only from the site itself. |
| TR-SEC-8 | Rate limits, enforced in the database so they can't be bypassed: 10 posts per user per 10 minutes; 20 joins or join requests per user per day; 10 reports per user per day; 3 groups created per user per week. Supabase Auth's own limits cover sign-in emails. |
| TR-SEC-9 | Cover image uploads: images only (JPEG, PNG, WebP), 2 MB maximum, re-encoded on upload so no original file is ever served. |
| TR-SEC-10 | Supabase's security advisor reports no errors before each release. |

## Privacy — TR-PRIV

| ID | Requirement |
| --- | --- |
| TR-PRIV-1 | Collect only: email address, display name, optional bio and area, and what the user does on the board (groups, RSVPs, posts). No phone numbers, birth dates or precise location. |
| TR-PRIV-2 | No third-party analytics, advertising or tracking scripts. No cookies other than the sign-in session. (This means no cookie banner is needed.) |
| TR-PRIV-3 | Usage numbers come from counting rows in our own database (FR-AD-3), not from tracking visitors. |
| TR-PRIV-4 | Account deletion (FR-AC-6) removes personal data within 24 hours; posts stay, attributed to "deleted user". |
| TR-PRIV-5 | A privacy policy written in plain language, in the same style as the bike map's. |

## Data — TR-DATA

| ID | Requirement |
| --- | --- |
| TR-DATA-1 | Every schema change is a migration file in `supabase/migrations/`, applied by the Supabase CLI. No changes made by hand in the dashboard. |
| TR-DATA-2 | TypeScript types are generated from the database schema and committed. |
| TR-DATA-3 | All times are stored as UTC timestamps. Each event also stores its IANA time zone (e.g. `America/New_York`) and is always displayed in that zone. |
| TR-DATA-4 | Posts, threads and groups are never hard-deleted by moderation; they change status (removed, archived) so the moderation log stays meaningful. |
| TR-DATA-5 | Categories and subcategories are seed data in a migration (FR-AD-1). |
| TR-DATA-6 | A seed script creates realistic demo groups, events and threads for local development and for the launch walkthrough (see [use cases](./use-cases#journeys-the-seed-data-must-cover)). |

## Testing and CI — TR-TEST

Runs on GitHub Actions on every push and pull request, like the bike map.

| ID | Requirement |
| --- | --- |
| TR-TEST-1 | Lint, type check and unit tests. |
| TR-TEST-2 | Database permission tests (pgTAP, via `supabase test db`) against a local Supabase started in CI, covering every row of the [permission matrix](./roles-and-permissions). |
| TR-TEST-3 | A small set of end-to-end browser tests (Playwright) for UC-1 and UC-2. |
| TR-TEST-4 | Accessibility checks (TR-A11Y-5). |
| TR-TEST-5 | A build must pass all of the above to deploy. |

## Environments and operations — TR-OPS

| ID | Requirement |
| --- | --- |
| TR-OPS-1 | Two environments: **local** (Supabase CLI running on the laptop, seeded) and **production**. No shared staging environment; keeping one alive costs money and attention. |
| TR-OPS-2 | Production Supabase is on the **Pro plan** from public launch: it does not pause and it takes daily backups. |
| TR-OPS-3 | Railway has a usage limit and an email alert set, so a runaway bill is impossible. |
| TR-OPS-4 | Email is sent from a verified custom domain with SPF, DKIM and DMARC records, so it reaches inboxes. |
| TR-OPS-5 | Errors are visible in Railway's and Supabase's logs. No separate error-tracking service at MVP. |
| TR-OPS-6 | A runbook (written at phase 5) covers deploying, restoring from backup, rotating keys and handling a report of illegal content. |

## Existing subscriptions — what this project uses

An audit of the tools already in PushPopDev's stack (from the bike map and
dashboard repositories) and whether this project needs each one.

| Tool | Used here? | Why |
| --- | --- | --- |
| **Supabase** | Yes | Database, auth, file storage and scheduled jobs in one place. See [ADR-0002](./architecture/adr-0002-database-and-auth). |
| **Railway** | Yes | Hosts the Next.js app. Already paid for; same GitHub deploy flow as the dashboard. See [ADR-0003](./architecture/adr-0003-hosting). |
| **GitHub** | Yes | Repository, CI, public commit history. |
| **Magic Patterns** | Yes, for design | Same process as the bike map: design mock in its own repo, build to match. |
| **Claude Code** | Yes, for building | Development only. |
| **n8n Cloud** | **No** | This app has two or three scheduled jobs, not pipelines. See [ADR-0004](./architecture/adr-0004-background-jobs-and-email). |
| **PostHog** | **No** | Conflicts with the no-tracking principle. Counts come from the database. |
| **Claude API, ElevenLabs** | No | No AI or voice features. |
| **Granola, Mem, Microsoft Graph** | No | Dashboard-specific. |
| **Resend** | New (free tier) | The only new service. Needed because Supabase's built-in email only delivers to the project's own team. |

## Cost position

Checked 25 September 2026 against published pricing. Recheck before
committing, because these change.

| Service | Tier | Monthly cost | What happens at the limit |
| --- | --- | --- | --- |
| Supabase — during build | Free | $0 | **Pauses after 7 days without activity.** Both existing PushPopDev projects are paused right now. No backups. 500 MB database, 1 GB storage, 50,000 monthly active users. |
| Supabase — from launch | Pro | $25 | Does not pause. Daily backups. Spend cap on by default, which means usage stops at the included limits rather than billing overage. |
| Railway | Hobby (existing) | $5, includes $5 of usage | Usage over $5 is billed. A small Next.js service is expected to fit, or add a few dollars. Set a usage limit (TR-OPS-3). |
| Resend | Free | $0 | 3,000 emails/month, **100/day**, 1 domain. Sending stops at the cap rather than billing. The daily cap is the one to watch: a 24-hour reminder run for a busy weekend could hit it. Next tier $20/month. |
| Domain | — | ~$1–2 (≈$12–20/year) | — |
| GitHub | Free | $0 | Actions minutes are free for public repositories. |
| **New spend during build** | | **$0** | Railway's $5 is already being paid |
| **New spend from launch** | | **≈ $26–27** | Supabase Pro + domain, plus any Railway usage above the included $5 |

Per the portfolio rule from the bike map — *a free tier is a cost that hasn't
arrived yet* — the one free tier this project deliberately does **not** rely
on at launch is Supabase's, because a paused database means a broken portfolio
piece exactly when someone clicks the link.

**Supabase organization:** the recommendation is to create this project in
a **new Supabase organization**. Plans apply per organization, so upgrading
the existing organization to Pro would also move the two dashboard projects
onto the paid plan, where each additional project can add its own compute
charge. Check Supabase's compute billing before deciding otherwise.

Sources: [Supabase pricing](https://supabase.com/pricing),
[Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing),
[Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[Railway plans](https://docs.railway.com/pricing/plans),
[Resend pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing).
