---
sidebar_position: 8
title: Data model
---

# Data model

The board's data lives in one Postgres database on Supabase (see
[ADR-0002](./architecture/adr-0002-database-and-auth)). This page describes
the tables in plain terms. The SQL migrations, when they exist, are the
source of truth; a change to them updates this page in the same commit.

:::note Source of truth
The migrations in `supabase/migrations/` are authoritative. This page was
brought in line with them on 25 September 2026.
:::

## How the pieces relate

```
 categories ──< subcategories ──< groups >── regions
                                    │
             ┌──────────────┬───────┼──────────────┬──────────────┐
             │              │       │              │              │
       group_members     events   threads       reports      moderation_actions
       (role, status)       │       │
             │              │       └──< replies
          profiles ─────────┤        (accounts: private twin of profiles)
       (one per user)       ├──< event_rsvps
                            └─── event_private_details (1:1)
```

`──<` means "one to many". A category has many subcategories; a group has
many events; and so on.

Every user has one **profile**. Their membership in each group is one row in
**group_members**, which carries their role in that group. That single table
is what almost every permission rule looks at.

## Directory

### regions

Where groups are. One region at launch (see the PRD's open questions); the
table exists so a second region is data, not a redesign.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `slug` | text, unique | `western-nc` |
| `name` | text | "Western North Carolina" |
| `timezone` | text | IANA zone, default for new events |

### categories and subcategories

The Craigslist-style directory. Managed by migration, not UI (FR-AD-1).

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `category_id` | uuid | subcategories only |
| `slug` | text | unique within its parent |
| `name` | text | |
| `sort_order` | integer | display order; the home page is not alphabetical, it is curated |

## People

### profiles

The public face of a user, readable by everyone, created automatically on
first sign-in. The email address is **not** here: it stays in Supabase's
private `auth.users` table, which the public API cannot read (FR-AC-5).

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | same as the auth user id |
| `display_name` | text, optional | 2–40 characters; null until onboarding, and after deletion ("deleted user") |
| `bio` | text, optional | 280 characters |
| `area` | text, optional | free text, e.g. "Brevard" |
| `created_at`, `updated_at` | timestamp | |

### accounts

Account state, split from `profiles` during the build so it is **not**
public: only the user and the site admin can read it, and nobody can change
it except through the database functions (onboarding, suspend, delete).

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | same as the auth user id |
| `accepted_terms_at` | timestamp, optional | null until FR-AC-2 is done; null means no writes |
| `is_site_admin` | boolean | set by hand in the database only |
| `suspended_at` | timestamp, optional | set means read-only |
| `deleted_at` | timestamp, optional | set means the account is gone |
| `created_at` | timestamp | |

## Groups

### groups

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `slug` | text, unique | URL, e.g. `brevard-paddlers` |
| `name` | text | |
| `description` | text | plain text |
| `rules` | text, optional | FR-GR-5 |
| `subcategory_id` | uuid | where it is listed |
| `region_id` | uuid | |
| `area` | text | town or area, shown in listings |
| `join_policy` | enum | `open`, `approval` |
| `join_question` | text, optional | FR-MB-9 |
| `discussions_enabled` | boolean | FR-GR-4 |
| `cover_image_path` | text, optional | unused, always null (the `group-covers` bucket was dropped; UC-24 will revisit) |
| `status` | enum | `active`, `archived`, `removed` |
| `created_by` | uuid | |
| `created_at`, `updated_at` | timestamp | |
| `is_unclaimed` | boolean | FR-GR-9: an unclaimed listing, added from public information. Only SQL run by the operator sets it. |
| `needs_owner` | boolean | FR-AC-6: its owner deleted their account. The group is archived until a claim is approved. Only database functions set it. |
| `source_url` | text, optional | The organization's own website. Required for a listing. |
| `website` | text, optional | FR-GR-23: the group's own site, http(s) only, set by owner and admins |
| `affinity_tags` | text[] | FR-GR-11: any of `women`, `youth`, `bipoc`, `lgbtqia`; empty by default |

### group_claims

FR-GR-10. A request to take over an unclaimed listing.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `group_id` | uuid | must be an active, unclaimed listing |
| `user_id` | uuid | the claimant; one claim per person per group |
| `note` | text | 10–1000 characters: how they're connected, for the site admin to check |
| `status` | enum | `pending`, `approved`, `declined` |
| `created_at`, `decided_at` | timestamp | |
| `decided_by` | uuid, optional | the site admin who decided |

The claimant and the site admin can read a claim; nobody else can. Only the
site admin decides, through `approve_claim()` and `decline_claim()`.

### group_members

The heart of the permission model.

| Field | Type | Notes |
| --- | --- | --- |
| `group_id` | uuid | part of the key |
| `user_id` | uuid | part of the key |
| `role` | enum | `owner`, `admin`, `member` |
| `status` | enum | `pending`, `active`, `banned` |
| `join_answer` | text, optional | answer to the join question; not readable through the API, organizers read it with `join_answers()` (FR-MB-9) |
| `created_at` | timestamp | when they joined or asked; always the server's clock |
| `updated_at` | timestamp | |

Constraints:

- One row per person per group.
- **Exactly one owner per group:** a unique index on `group_id` where
  `role = 'owner'`, and the group is created together with its owner row in
  one transaction.
- **At most two admins (page managers) per group,** counting open manager
  invites: a trigger on insert and on role changes (FR-MB-11).
- Only `active` rows grant access. `pending` and `banned` rows exist so the
  database can refuse a banned user's rejoin.

`join_log` (internal: row-level security on, no policies, no grants) gets a
row, `user_id`, `group_id`, `created_at`, each time a membership row is
created. The 20-joins-a-day limit counts it, so leaving a group doesn't hand
the join back (TR-SEC-8). Rows older than two days are pruned.

## Events

### events

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `group_id` | uuid | host group |
| `title` | text | |
| `description` | text | FR-EV-23: what it is and who it's for, at most 2,000 characters; the form requires 10 or more |
| `details` | text, optional | FR-EV-23: what to bring, pace, difficulty |
| `starts_at`, `ends_at` | timestamp (UTC) | `ends_at` after `starts_at` |
| `timezone` | text | IANA zone the event is shown in |
| `location_name` | text | "Pisgah Fish Hatchery parking lot" — always public |
| `address_visibility` | enum | `public`, `members` |
| `capacity` | integer, optional | FR-EV-5 |
| `status` | enum | `scheduled`, `cancelled` |
| `created_by` | uuid | |
| `created_at`, `updated_at` | timestamp | |
| `source_url` | text, optional | FR-GR-9: the organizer's own page for a listed event. Only SQL run by the operator sets it. |
| `photo_path`, `photo_alt` | text, optional | FR-EV-24: a file in the `event-photos` bucket, always in this event's own folder `<group_id>/<id>/`; alt text (at most 200) required with a photo |
| `is_paid` | boolean | FR-EV-25: `false` (Free) by default |
| `registration_fee`, `total_cost` | text, optional | FR-EV-25: at most 80 characters each; a paid event needs a registration fee |
| `takes_rsvps` | boolean | FR-EV-26: `true` by default; when `false` the database refuses RSVPs |
| `signup_url` | text, optional | FR-EV-27: http or https only |
| `waitlist_enabled` | boolean | FR-EV-28: only meaningful with a capacity |

### event_private_details

The street address, split into its own table. Row-level security protects
whole rows, not single columns, so an address that only members may see has
to live in a row that only members may read.

| Field | Type | Notes |
| --- | --- | --- |
| `event_id` | uuid | one-to-one with events |
| `address` | text | readable by everyone if the event's `address_visibility` is `public`, otherwise by active members only |

### event_rsvps

| Field | Type | Notes |
| --- | --- | --- |
| `event_id` | uuid | part of the key |
| `user_id` | uuid | part of the key |
| `status` | enum | `going`, `not_going`, `waitlisted` |
| `waitlisted_at` | timestamp, optional | FR-EV-28: set by the database when the person joins the waitlist; the waitlist's order |
| `updated_at` | timestamp | |

The database refuses an RSVP after the event starts, for a cancelled event,
for an event that takes no RSVPs, or one that would push `going` past
`capacity`. Waitlisted people don't count as going. Only an owner or admin
moves someone from the waitlist to going (`move_from_waitlist`, which locks
the event row and needs a free place); while anyone is waiting, members
can't take a freed place themselves.

## Discussions

### threads

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `group_id` | uuid | |
| `author_id` | uuid | |
| `title` | text | |
| `body` | text | plain text, 10,000 characters |
| `is_pinned`, `is_locked` | boolean | |
| `status` | enum | `visible`, `deleted_by_author`, `removed` |
| `reply_count` | integer | kept up to date by the database |
| `last_activity_at` | timestamp | drives the board's sort order |
| `created_at`, `edited_at` | timestamp | |

### replies

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `thread_id` | uuid | |
| `author_id` | uuid | |
| `body` | text | plain text |
| `status` | enum | `visible`, `deleted_by_author`, `removed` |
| `created_at`, `edited_at` | timestamp | |

The database refuses a thread or reply when the group has discussions off, the
thread is locked, or the author is not an active member.

## Moderation

### reports

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `reporter_id` | uuid | |
| `target_type` | enum | `group`, `event`, `thread`, `reply`, `profile` |
| `target_id` | uuid | |
| `group_id` | uuid, optional | set for content inside a group, so the report reaches that group's admins |
| `reason` | enum | `spam`, `harassment`, `unsafe`, `off_topic`, `other` |
| `note` | text, optional | |
| `status` | enum | `open`, `actioned`, `dismissed` |
| `handled_by`, `handled_at` | optional | |
| `created_at` | timestamp | |

### moderation_actions

An append-only log (FR-MD-6). Nobody can edit or delete a row, including the
site admin.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `actor_id` | uuid | who did it |
| `action` | enum | `remove_content`, `ban_member`, `suspend_user`, `archive_group`, `remove_group`, `create_invite_link`, `turn_off_invite_link`, `invite_manager`, `send_invites`, `dismiss_report`, … |
| `target_type`, `target_id` | | what it was done to |
| `group_id` | uuid, optional | |
| `reason` | text | |
| `content_snapshot` | json, optional | the removed text, kept for the site admin only |
| `created_at` | timestamp | |

## Suggestions (UC-32)

### suggestions

Members' suggestions to the site admin (FR-AD-4 to FR-AD-7). Readable only
by the sender and the site admin; never shown publicly, voted on or ranked.
Members insert only `user_id`, `kind`, `title`, `details` and `link`;
`status` and `admin_note` change only through `set_suggestion_status()`,
which only the site admin can call. Nobody updates or deletes a row
directly. Limited to 5 per member per day, with the per-person lock and
server time (`a_limit_guard`, TR-SEC-8).

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `user_id` | uuid, optional | the sender; kept (as a nameless profile) if they delete their account |
| `kind` | enum | `region`, `feature`, `group` (to invite), `event` (to add), `other` |
| `title` | text | 3 to 120 characters |
| `details` | text, optional | up to 2,000 characters |
| `link` | text, optional | http(s) only, up to 500 characters |
| `status` | enum | `new`, `planned`, `done`, `declined` |
| `admin_note` | text, optional | up to 500 characters; the sender reads it under My suggestions |
| `handled_at` | timestamp, optional | when the site admin last set the status |
| `created_at` | timestamp | server time |

## Invites (UC-31)

### group_invite_links

One shareable join link per group (FR-MB-15).

| Field | Type | Notes |
| --- | --- | --- |
| `group_id` | uuid | the key: one link per group; a new link replaces the old one |
| `token` | text | 64 random hex characters (244 random bits) |
| `created_by` | uuid | |
| `created_at` | timestamp | |
| `expires_at` | timestamp, optional | 7 or 30 days on; empty means until turned off |
| `revoked_at` | timestamp, optional | set by *Turn off* |

The token is stored as it is, not hashed, because the page admin and
managers need to see the link again to copy it: it works like a shared
document link. Only they can read the row (RLS), writes go through
`create_invite_link()` and `turn_off_invite_link()`, and the link only ever
makes someone a plain member.

### invites.email_invites

Member and page-manager invites by email (FR-MB-12, FR-MB-13), in a schema
of their own that the API does not expose, because they hold email
addresses (PT-20). Written by `invite_members()` and `invite_manager()`;
the page admin sees open manager invites, without the address, through
`open_manager_invites()`.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `group_id` | uuid | |
| `email` | text | lowercased; used only to send the invite and skip repeats |
| `role` | enum | `member` or `admin` (a manager invite) |
| `token` | text | 64 random hex characters, single use |
| `invited_by` | uuid | |
| `created_at`, `expires_at` | timestamp | member invites 30 days, manager invites 7 |
| `accepted_at`, `cancelled_at` | timestamp, optional | |

**Retention:** `purge_old_invites()` deletes rows older than 30 days. It is
not callable through the API; schedule it with the other jobs once email is
set up (runbook).

The invite page names the group with `invite_preview(token)` (name and
slug only, callable signed out, nothing for a bad code). Both kinds of
invite are used through `join_by_invite(token)`, which checks
the code, the group (active, not a listing), the person (can write, not
banned) and, for a manager invite, that the account's email is the invited
one, then adds an active member row, so the join limit applies.

## Notifications (Should)

### notification_preferences

One row per user per email type they have changed from the default.

### email_log

One row per notification email sent, keyed by user, type and the thing it was
about. It lets the reminder job send **exactly one** reminder per person per
event even if the job runs twice.

## Views for the browse pages

Three read-only views, each running with the reader's own permissions:

- `group_listings` — each group with its category, subcategory, member count
  and next event. Every listing page is one query against it.
- `subcategory_group_counts` — the home page directory with counts.
- `event_listings` — events of **active** groups with their group, category
  and number going. An archived group's own pages read its events from
  `events` (`src/lib/groupEvents.ts`), so they still list them (FR-GR-6).

Member and RSVP counts come from small functions that reveal the *number*
without revealing the rows, so visitors see "12 members" but not who.

## Planned with the 8 October design (drafts, not built)

What the draft use cases UC-10 to UC-28 and UC-32 would add. Field-level detail is
written when each is approved, with its migration and permission tests.

| Table or change | For | Notes |
| --- | --- | --- |
| `events`: `series_id`, `rsvp_opens_at`, `requires_approval`, `place_id` | UC-10, UC-17, UC-15 | A series row holds the repeat rule; each date stays its own event |
| `event_series` | UC-10 | Repeat rule and end date; edits apply to later dates |
| `event_sponsors` | UC-10 | Name, logo path, website, optional business or group it links to |
| `event_faq` | UC-10, UC-11 | Question, answer, order |
| `event_questions` | UC-11 | Asker, question, answer, added-to-FAQ flag; private until answered |
| `event_rsvps.status` gains `requested`, `declined` (`waitlisted` built with UC-30) | UC-17 | Places counted on `going` only |
| `saved_events` | UC-22 | User and event; private to the user |
| `groups`: `group_type`, `cover_photo_path`, `member_list_visibility`, `organization_id` | UC-24, UC-16, UC-13 | Type from a fixed list |
| `group_photos` | UC-21 | Uploader, path, alt text, status |
| `places` | UC-15, UC-12 | Name, kind, activities, coordinates, description; seeded from the research workspace's places |
| `towns` | UC-14 | Bundled US towns and zip codes with coordinates |
| `organizations` | UC-13 | National organizations that chapters link to |
| `conversations`, `messages` | UC-20 | Two participants; request status; blocks |
| `businesses`, `business_admins`, `business_places`, `business_groups` | UC-12 | Owner is the account that claimed it with the business email; admins are people's own accounts; places have role *its location* or *operates at*; linked groups keep their own roles. No events table of its own |

| `group_claims`: `confirmed_domain`, `confirmed_at`, plus a temporary address, link token, expiry and send count | UC-26 | The address and token are cleared once the link is used or the last one expires; only the domain and date stay |
| `groups.review_status`: `pending`, `approved`, `declined`, with `review_reason` | UC-27 | Existing groups start as `approved`; a pending group is readable by its owner and the site admin only |

The branded sign-in email (UC-25) needs no tables: it is Supabase Auth
settings and template files. Reminders (UC-23) and the calendar (UC-18) need no tables: they are read
from the tables above.

## Research workspace (not part of the app)

### research.candidates and research.candidate_events

FR-RS-2 to FR-RS-8. What the weekly research agent finds, waiting for the
site admin. Private like the rest of the research schema; the admin page
reads it only through site-admin functions.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `kind` | text | `group`, `guide`, `business`, `venue` |
| `name` | text | 3–80 characters; unique, ignoring case |
| `subcategory_id` | uuid | the board activity it fits |
| `area` | text | town or area |
| `description` | text | short, neutral, written by the agent |
| `source_url` | text | the public page it came from |
| `affinity_tags` | text[] | FR-GR-11: any of `women`, `youth`, `bipoc`, `lgbtqia` |
| `out_of_region` | boolean | |
| `status` | text | `new`, `listed`, `skipped`, `kept` |
| `group_id` | uuid, optional | the listing it became |
| `found_at`, `decided_at` | timestamp | |

Each candidate event has a title, start and end, time zone, place and
link, unique per candidate, title and start. There is deliberately no
column for contact details.


A separate `research` schema holds the source research used to seed real
groups: `activities`, `organizations`, `places` and `events`, plus an
`organization_fit` view that sorts organizations by whether they could be a
group. It is invisible to the app's roles (no schema access, row-level
security on with no policies) and its data is never committed. See the
[runbook](./runbook), "Seeding real groups".

## Seed categories

Seeded by `supabase/migrations/20260925000005_seed_directory.sql`, the one
migration that differs per deployment (see [Cloning](./cloning)). Order is
display order.

| Category | Subcategories |
| --- | --- |
| Hiking & Backpacking | Day hikes · Backpacking · Waterfalls · Peak bagging |
| Cycling | Road · Gravel · Mountain biking · Family & casual rides · Bikepacking |
| Paddling | Kayaking · Whitewater · Stand-up paddleboard · Canoeing · Tubing |
| Climbing | Bouldering · Sport · Trad · Indoor climbing |
| Running & Walking | Trail running · Road running · Walking groups |
| Camping | Car camping · Family camping · Overlanding |
| Snow & Winter | Skiing & snowboarding · Snowshoeing · Winter hiking |
| Water & Fishing | Fly fishing · Swimming holes · Open-water swimming |
| Nature & Wildlife | Birding · Foraging & plants · Photography · Stargazing |
| Stewardship | Trail work · Clean-ups · Conservation volunteering |
| Skills & Learning | Navigation · Wilderness first aid · Leave No Trace · Beginners welcome |

*Families & Kids* was left out: it sits awkwardly with "no users under 18".
Family outings are covered by *Family & casual rides* and *Family camping*.
