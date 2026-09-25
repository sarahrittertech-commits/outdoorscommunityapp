-- Core schema: every table in docs/data-model.md.
--
-- Permissions are NOT here. Row-level security is switched on for every table
-- in this file, which means everything is refused until the policies in
-- 20260925000003_rls_policies.sql allow it.

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------

create type public.join_policy as enum ('open', 'approval');
create type public.group_status as enum ('active', 'archived', 'removed');
create type public.member_role as enum ('owner', 'admin', 'member');
create type public.member_status as enum ('pending', 'active', 'banned');
create type public.address_visibility as enum ('public', 'members');
create type public.event_status as enum ('scheduled', 'cancelled');
create type public.rsvp_status as enum ('going', 'not_going');
create type public.post_status as enum ('visible', 'deleted_by_author', 'removed');
create type public.report_target as enum ('group', 'event', 'thread', 'reply', 'profile');
create type public.report_reason as enum ('spam', 'harassment', 'unsafe', 'off_topic', 'other');
create type public.report_status as enum ('open', 'actioned', 'dismissed');
create type public.moderation_action_type as enum (
  'remove_content',
  'ban_member',
  'suspend_user',
  'unsuspend_user',
  'archive_group',
  'restore_group',
  'remove_group'
);

-- ---------------------------------------------------------------------------
-- Directory
-- ---------------------------------------------------------------------------

create table public.regions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  timezone text not null
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  sort_order integer not null default 0
);

create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  sort_order integer not null default 0,
  unique (category_id, slug)
);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

-- Public face of a user. Readable by everyone. No email here: that stays in
-- auth.users, which the public API cannot read (FR-AC-5).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 2 and 40),
  bio text check (char_length(bio) <= 280),
  area text check (char_length(area) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Account state. Readable only by the user and the site admin. Changed only
-- through the functions in 20260925000002_functions_and_triggers.sql.
create table public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  accepted_terms_at timestamptz,
  is_site_admin boolean not null default false,
  suspended_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(name) between 3 and 80),
  description text not null check (char_length(description) between 10 and 5000),
  rules text check (char_length(rules) <= 5000),
  subcategory_id uuid not null references public.subcategories (id) on delete restrict,
  region_id uuid not null references public.regions (id) on delete restrict,
  area text not null check (char_length(area) between 2 and 80),
  join_policy public.join_policy not null default 'open',
  join_question text check (char_length(join_question) <= 280),
  discussions_enabled boolean not null default true,
  cover_image_path text,
  status public.group_status not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored
);

create index groups_subcategory_idx on public.groups (subcategory_id) where status = 'active';
create index groups_search_idx on public.groups using gin (search);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'member',
  status public.member_status not null default 'active',
  join_answer text check (char_length(join_answer) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id),
  -- Owners and admins are always active members.
  check (role = 'member' or status = 'active')
);

-- Exactly one owner per group (FR-MB-4). "At least one" is guaranteed by the
-- group-creation trigger and by the owner being unable to leave.
create unique index group_members_one_owner on public.group_members (group_id) where role = 'owner';
create index group_members_user_idx on public.group_members (user_id);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 10000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null,
  location_name text not null check (char_length(location_name) between 2 and 200),
  address_visibility public.address_visibility not null default 'public',
  capacity integer check (capacity > 0),
  status public.event_status not null default 'scheduled',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (to_tsvector('english', coalesce(title, ''))) stored,
  check (ends_at > starts_at)
);

create index events_group_start_idx on public.events (group_id, starts_at);
create index events_start_idx on public.events (starts_at) where status = 'scheduled';
create index events_search_idx on public.events using gin (search);

-- The street address lives in its own table because row-level security
-- protects whole rows, not columns. See docs/data-model.md.
create table public.event_private_details (
  event_id uuid primary key references public.events (id) on delete cascade,
  address text not null check (char_length(address) <= 300)
);

create table public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.rsvp_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index event_rsvps_user_idx on public.event_rsvps (user_id);

-- ---------------------------------------------------------------------------
-- Discussions
-- ---------------------------------------------------------------------------

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) <= 150),
  body text not null check (char_length(body) <= 10000),
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  status public.post_status not null default 'visible',
  reply_count integer not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index threads_board_idx on public.threads (group_id, is_pinned desc, last_activity_at desc);
create index threads_author_idx on public.threads (author_id, created_at);

create table public.replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) <= 10000),
  status public.post_status not null default 'visible',
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index replies_thread_idx on public.replies (thread_id, created_at);
create index replies_author_idx on public.replies (author_id, created_at);

-- ---------------------------------------------------------------------------
-- Moderation
-- ---------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  target_id uuid not null,
  -- Set by trigger from the target, never trusted from the client. Null for
  -- reports on groups and profiles, which go to the site admin only.
  group_id uuid references public.groups (id) on delete cascade,
  reason public.report_reason not null,
  note text check (char_length(note) <= 1000),
  status public.report_status not null default 'open',
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_group_open_idx on public.reports (group_id, created_at) where status = 'open';
create index reports_reporter_idx on public.reports (reporter_id, created_at);

-- Append-only (FR-MD-6). A trigger refuses updates and deletes for every role.
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action public.moderation_action_type not null,
  target_type public.report_target not null,
  target_id uuid not null,
  group_id uuid references public.groups (id) on delete set null,
  reason text not null default '',
  -- Removed content is copied here before it is blanked, so the site admin
  -- can still see what was removed and members cannot.
  content_snapshot jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table public.notification_preferences (
  user_id uuid not null references public.profiles (id) on delete cascade,
  email_type text not null check (email_type in (
    'join_request_approved', 'join_request_received', 'event_reminder',
    'event_changed', 'new_event'
  )),
  enabled boolean not null,
  primary key (user_id, email_type)
);

-- Written only by server-side jobs. Guarantees one reminder per person per event.
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email_type text not null,
  related_id uuid,
  sent_at timestamptz not null default now(),
  provider_message_id text,
  unique (user_id, email_type, related_id)
);

-- ---------------------------------------------------------------------------
-- Row-level security on, for everything. Deny by default (TR-SEC-1).
-- ---------------------------------------------------------------------------

alter table public.regions enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.events enable row level security;
alter table public.event_private_details enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.threads enable row level security;
alter table public.replies enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.email_log enable row level security;
