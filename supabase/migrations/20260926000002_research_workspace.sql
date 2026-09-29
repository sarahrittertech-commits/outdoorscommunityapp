-- Research workspace: source research used to seed the board with real
-- groups and events (organizations, places, events and the activity list).
--
-- This is NOT part of the app:
--   * It lives in its own schema, which the API does not expose and which
--     the anon and authenticated roles cannot even see.
--   * Row-level security is on with no policies, as a second lock.
--   * The data itself is never committed to this public repository: it
--     contains contact details and internal notes. Load it with
--     scripts/research/load.mjs.
--
-- Rows are curated from here into public.groups and public.events by hand
-- (see docs/runbook.md, "Seeding real groups").

create schema if not exists research;
revoke all on schema research from public, anon, authenticated;

create table research.activities (
  activity_id text primary key,
  label text not null,
  category text not null
);

create table research.organizations (
  org_id text primary key,
  name text not null,
  org_type text,
  status text,
  activities text[] not null default '{}',
  area text,
  website text,
  source_listing_url text,
  community_fit text,
  women_specific text,
  notes text,
  address text,
  phone text,
  verified boolean not null default false,
  source text,
  loaded_at timestamptz not null default now()
);

create table research.places (
  place_id text primary key,
  name text not null,
  place_type text,
  area text,
  activities text[] not null default '{}',
  verified boolean not null default false,
  source_url text,
  notes text,
  source text,
  loaded_at timestamptz not null default now()
);

create table research.events (
  event_id text primary key,
  name text not null,
  event_type text,
  price text,
  capacity text,
  min_age text,
  status text,
  women_specific text,
  start_date date,
  end_date date,
  start_time text,
  end_time text,
  recurrence text,
  venue text,
  organizer text,
  -- ORG-### references found in the organizer text.
  organizer_ids text[] not null default '{}',
  activities text[] not null default '{}',
  url text,
  booking_url text,
  notes text,
  verified boolean not null default false,
  source text,
  loaded_at timestamptz not null default now()
);

alter table research.activities enable row level security;
alter table research.organizations enable row level security;
alter table research.places enable row level security;
alter table research.events enable row level security;

revoke all on all tables in schema research from public, anon, authenticated;

-- A first sort of organizations by whether they could be a group on the
-- board. Heuristic, from org_type only: a starting point for review, not a
-- decision. The board is for community groups; businesses and tourism
-- bodies are out of scope as groups (docs/personas.md).
create view research.organization_fit as
select
  o.org_id,
  o.name,
  o.org_type,
  o.status,
  o.women_specific,
  o.activities,
  o.area,
  case
    when o.status ilike 'closed%' then 'closed'
    when o.org_type ~* '(club|coalition|team|friends|advocacy|affinity|climbers|women.s .*group|nonprofit club|trail group|conservancy|stewardship|land trust)'
      then 'community group'
    when o.org_type ~* '(brewery|food|drink|public house|venue|taproom)'
      then 'venue'
    when o.org_type ~* '(tourism|media|brand|sponsor|creator|competitor|aggregator|municipal|magazine|national)'
      then 'not a listing'
    else 'business'
  end as board_fit
from research.organizations o;

revoke all on research.organization_fit from public, anon, authenticated;
