---
sidebar_position: 8
title: Data model
---

# Data model

The board's data lives in one Postgres database on Supabase (see
[ADR-0002](./architecture/adr-0002-database-and-auth)). This page describes
the tables in plain terms. The SQL migrations, when they exist, are the
source of truth; a change to them updates this page in the same commit.

:::note Draft
Written before any migration exists. Field names are proposals and will be
settled in phase 1.
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
          profiles ─────────┤
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

One per signed-in user, created on first sign-in. The email address is
**not** here: it stays in Supabase's private `auth.users` table, which the
public API cannot read (FR-AC-5).

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | same as the auth user id |
| `display_name` | text | 2–40 characters |
| `bio` | text, optional | 280 characters |
| `area` | text, optional | free text, e.g. "Brevard" |
| `accepted_terms_at` | timestamp, optional | null until FR-AC-2 is done; null means no writes |
| `is_site_admin` | boolean | set by hand in the database only |
| `suspended_at` | timestamp, optional | set means read-only |
| `deleted_at` | timestamp, optional | set means "deleted user" |
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
| `cover_image_path` | text, optional | Supabase Storage path |
| `status` | enum | `active`, `archived`, `removed` |
| `created_by` | uuid | |
| `created_at`, `updated_at` | timestamp | |

### group_members

The heart of the permission model.

| Field | Type | Notes |
| --- | --- | --- |
| `group_id` | uuid | part of the key |
| `user_id` | uuid | part of the key |
| `role` | enum | `owner`, `admin`, `member` |
| `status` | enum | `pending`, `active`, `banned` |
| `join_answer` | text, optional | answer to the join question |
| `created_at` | timestamp | when they joined or asked |
| `updated_at` | timestamp | |

Constraints:

- One row per person per group.
- **Exactly one owner per group:** a unique index on `group_id` where
  `role = 'owner'`, and the group is created together with its owner row in
  one transaction.
- Only `active` rows grant access. `pending` and `banned` rows exist so the
  database can refuse a banned user's rejoin.

## Events

### events

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `group_id` | uuid | host group |
| `title` | text | |
| `description` | text | |
| `starts_at`, `ends_at` | timestamp (UTC) | `ends_at` after `starts_at` |
| `timezone` | text | IANA zone the event is shown in |
| `location_name` | text | "Pisgah Fish Hatchery parking lot" — always public |
| `address_visibility` | enum | `public`, `members` |
| `capacity` | integer, optional | FR-EV-5 |
| `status` | enum | `scheduled`, `cancelled` |
| `created_by` | uuid | |
| `created_at`, `updated_at` | timestamp | |

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
| `status` | enum | `going`, `not_going` |
| `updated_at` | timestamp | |

The database refuses an RSVP after the event starts, for a cancelled event,
or one that would push `going` past `capacity`.

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
| `action` | enum | `remove_content`, `ban_member`, `suspend_user`, `archive_group`, `remove_group`, … |
| `target_type`, `target_id` | | what it was done to |
| `group_id` | uuid, optional | |
| `reason` | text | |
| `created_at` | timestamp | |

## Notifications (Should)

### notification_preferences

One row per user per email type they have changed from the default.

### email_log

One row per notification email sent, keyed by user, type and the thing it was
about. It lets the reminder job send **exactly one** reminder per person per
event even if the job runs twice.

## Views for the browse pages

Listing pages read from a view, `group_listings`, that joins each active group
to its subcategory, member count and next upcoming event. One query per
listing page keeps pages fast (TR-PERF).

## Seed categories (proposed)

A starting list to edit, not a decision. Order is display order.

| Category | Subcategories |
| --- | --- |
| Hiking & Backpacking | Day hikes · Backpacking · Waterfalls · Peak bagging |
| Cycling | Road · Gravel · Mountain biking · Family & casual rides · Bikepacking |
| Paddling | Kayaking · Whitewater · Stand-up paddleboard · Canoeing · Tubing |
| Climbing | Bouldering · Sport · Trad · Indoor climbing |
| Running | Trail running · Road running · Walking groups |
| Camping | Car camping · Family camping · Overlanding |
| Snow & Winter | Skiing & snowboarding · Snowshoeing · Winter hiking |
| Water & Fishing | Fly fishing · Swimming holes · Open-water swimming |
| Nature & Wildlife | Birding · Foraging & plants · Photography · Stargazing |
| Stewardship | Trail work · Clean-ups · Conservation volunteering |
| Skills & Learning | Navigation · Wilderness first aid · Leave No Trace · Beginners welcome |
| Families & Kids | Family outings · Kids' nature clubs |

The last row sits awkwardly with "no users under 18": families can organize,
but only adults hold accounts. Confirm before seeding.
