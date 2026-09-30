-- Unclaimed listings and claim requests (FR-GR-9, FR-GR-10).
--
-- The board launches with real local groups added from public information,
-- so a visitor's first look isn't an empty page. Each is marked as an
-- unclaimed listing and links to the organization's own website. Nobody runs
-- it on the board yet, so nobody can join it, RSVP to its events or post in
-- it. Its organizer can ask to claim it; the site admin checks and approves,
-- and the claimant becomes its owner.
--
-- Listings are added by the operator in SQL (a data import), never through
-- the app, and hold only public facts: a name, a neutral description and a
-- link. Nobody signed in can set the listing flag or a source link.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------

alter table public.groups
  add column is_unclaimed boolean not null default false,
  add column source_url text
    check (source_url ~ '^https?://[^\s]+$' and char_length(source_url) <= 500),
  add constraint groups_unclaimed_needs_source check (not is_unclaimed or source_url is not null);

-- An event copied from an organization's own calendar links back to it.
alter table public.events
  add column source_url text
    check (source_url ~ '^https?://[^\s]+$' and char_length(source_url) <= 500);

-- Only SQL run by the operator, with no signed-in user, sets these.
create or replace function public.groups_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.status := 'active';
  new.cover_image_path := null;

  if auth.uid() is not null then
    new.is_unclaimed := false;
    new.source_url := null;
  end if;

  if auth.uid() is not null and not public.is_site_admin() then
    if (select count(*) from public.group_members m
          join public.groups g on g.id = m.group_id
        where m.user_id = auth.uid() and m.role = 'owner'
          and g.status in ('active', 'archived')) >= 3 then
      perform public.raise_rule('group_limit', 'You can own at most 3 groups.');
    end if;
    if (select count(*) from public.groups g
        where g.created_by = auth.uid() and g.created_at > now() - interval '7 days') >= 3 then
      perform public.raise_rule('rate_limited', 'You can create at most 3 groups a week.');
    end if;
  end if;
  return new;
end
$$;

create or replace function public.events_source_url_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.source_url := case when tg_op = 'UPDATE' then old.source_url end;
  end if;
  return new;
end
$$;

create trigger events_source_url_guard before insert or update on public.events
  for each row execute function public.events_source_url_guard();

revoke execute on function public.events_source_url_guard() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Nobody joins an unclaimed listing. RSVPs and discussion posts need
--    membership, so they are closed too.
-- ---------------------------------------------------------------------------

drop policy "Users join or request to join active groups" on public.group_members;

create policy "Users join or request to join active groups" on public.group_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_write()
    and role = 'member'
    and status = (
      select case g.join_policy
               when 'open' then 'active'::public.member_status
               else 'pending'::public.member_status
             end
      from public.groups g
      where g.id = group_id and g.status = 'active' and not g.is_unclaimed
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Claim requests
-- ---------------------------------------------------------------------------

create type public.claim_status as enum ('pending', 'approved', 'declined');

create table public.group_claims (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- How the claimant is connected to the group, for the site admin to check.
  note text not null check (char_length(btrim(note)) between 10 and 1000),
  status public.claim_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null,
  unique (group_id, user_id)
);

create index group_claims_pending_idx on public.group_claims (created_at) where status = 'pending';

alter table public.group_claims enable row level security;

revoke all on public.group_claims from anon;
revoke update, delete, truncate, references, trigger on public.group_claims from authenticated;
grant select, insert on public.group_claims to authenticated;

create policy "Users ask to claim unclaimed listings" on public.group_claims
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_write()
    and status = 'pending'
    and decided_at is null
    and decided_by is null
    and exists (
      select 1 from public.groups g
      where g.id = group_id and g.status = 'active' and g.is_unclaimed
    )
  );

create policy "Claimants see their claims; the site admin sees all" on public.group_claims
  for select to authenticated
  using (user_id = auth.uid() or public.is_site_admin());

-- Approving: the claimant becomes the owner and the listing becomes an
-- ordinary group. Any other pending claims on it are declined.
create or replace function public.approve_claim(p_claim_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_claim public.group_claims;
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can approve claims.');
  end if;

  select * into v_claim from public.group_claims c
   where c.id = p_claim_id and c.status = 'pending'
   for update;
  if not found then
    perform public.raise_rule('not_found', 'No pending claim with that id.');
  end if;
  if not exists (select 1 from public.groups g
                 where g.id = v_claim.group_id and g.status = 'active' and g.is_unclaimed) then
    perform public.raise_rule('not_allowed', 'That group is no longer an unclaimed listing.');
  end if;
  if (select count(*) from public.group_members m
        join public.groups g on g.id = m.group_id
      where m.user_id = v_claim.user_id and m.role = 'owner'
        and g.status in ('active', 'archived')) >= 3 then
    perform public.raise_rule('group_limit', 'That person already owns 3 groups.');
  end if;

  -- They may already hold a row (a ban, say); an owner row replaces it.
  delete from public.group_members
   where group_id = v_claim.group_id and user_id = v_claim.user_id;
  insert into public.group_members (group_id, user_id, role, status)
  values (v_claim.group_id, v_claim.user_id, 'owner', 'active');

  update public.groups
     set is_unclaimed = false, discussions_enabled = true
   where id = v_claim.group_id;

  update public.group_claims
     set status = 'approved', decided_at = now(), decided_by = auth.uid()
   where id = v_claim.id;
  update public.group_claims
     set status = 'declined', decided_at = now(), decided_by = auth.uid()
   where group_id = v_claim.group_id and status = 'pending';
end
$$;

create or replace function public.decline_claim(p_claim_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can decline claims.');
  end if;
  update public.group_claims
     set status = 'declined', decided_at = now(), decided_by = auth.uid()
   where id = p_claim_id and status = 'pending';
  if not found then
    perform public.raise_rule('not_found', 'No pending claim with that id.');
  end if;
end
$$;

revoke execute on function public.approve_claim(uuid), public.decline_claim(uuid) from public, anon;
grant execute on function public.approve_claim(uuid), public.decline_claim(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Listing views carry the flag and the link (new columns go last).
-- ---------------------------------------------------------------------------

create or replace view public.group_listings
with (security_invoker = true) as
select
  g.id,
  g.slug,
  g.name,
  g.description,
  g.area,
  g.join_policy,
  g.status,
  g.region_id,
  g.created_at,
  s.id as subcategory_id,
  s.slug as subcategory_slug,
  s.name as subcategory_name,
  c.id as category_id,
  c.slug as category_slug,
  c.name as category_name,
  public.group_member_count(g.id) as member_count,
  (
    select min(e.starts_at) from public.events e
    where e.group_id = g.id and e.status = 'scheduled' and e.starts_at > now()
  ) as next_event_at,
  g.search,
  g.is_unclaimed,
  g.source_url
from public.groups g
join public.subcategories s on s.id = g.subcategory_id
join public.categories c on c.id = s.category_id;

create or replace view public.event_listings
with (security_invoker = true) as
select
  e.id,
  e.group_id,
  g.slug as group_slug,
  g.name as group_name,
  c.slug as category_slug,
  e.title,
  e.starts_at,
  e.ends_at,
  e.timezone,
  e.location_name,
  e.address_visibility,
  e.capacity,
  e.status,
  public.event_going_count(e.id) as going_count,
  e.search,
  g.is_unclaimed,
  e.source_url
from public.events e
join public.groups g on g.id = e.group_id
join public.subcategories s on s.id = g.subcategory_id
join public.categories c on c.id = s.category_id;
