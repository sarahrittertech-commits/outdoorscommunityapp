-- Fixes from the 9 October 2026 code review. PT-70 to PT-79.
--
-- 1. Reports about your own content: a page admin or manager can't dismiss
--    or action a report about something they posted, and only the site
--    admin handles reports about a page admin's or manager's own content
--    (or the group itself). Dismissals are written to the moderation log.
-- 2. remove_member checks the caller's role before looking at the target,
--    so it no longer tells anyone whether a person is in a group.
-- 3. transfer_ownership keeps the 3-owned-groups limit (FR-GR-7).
-- 4. can_moderate(): group moderation needs an active group, so the
--    organizers of an archived or removed group can't keep moderating
--    through the API (FR-GR-6).
-- 5. delete_own_post needs a writable account (suspended people can't).
-- 6. The 20-joins-a-day limit counts from join_log, which survives leaving,
--    so leaving and rejoining no longer resets it (TR-SEC-8).
-- 7. The unused group-covers bucket loses its upload policies.
-- 8. event_listings lists only events of active groups (FR-GR-6).
-- Cleanup: raise_rule is internal; missing foreign-key and log indexes;
-- approve_claim updates an existing membership instead of deleting it.

-- New moderation log entry. Used only inside function bodies below, so it
-- can be added in the same migration.
alter type public.moderation_action_type add value if not exists 'dismiss_report';

-- ---------------------------------------------------------------------------
-- 4. can_moderate (used by everything below)
-- ---------------------------------------------------------------------------
-- A writable account that is an owner or admin of an active group, or the
-- site admin. Owner-only actions add is_group_owner() on top.

create or replace function public.can_moderate(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.can_write()
     and ((public.is_group_admin(p_group_id) and public.group_is_active(p_group_id))
          or public.is_site_admin())
$$;

revoke execute on function public.can_moderate(uuid) from public, anon;
grant execute on function public.can_moderate(uuid) to authenticated;

-- Membership ----------------------------------------------------------------

-- The site admin still can't approve into an inactive group, as before.
create or replace function public.approve_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.can_moderate(p_group_id) or not public.group_is_active(p_group_id) then
    perform public.raise_rule('not_allowed', 'Only group admins can approve requests.');
  end if;
  update public.group_members set status = 'active'
   where group_id = p_group_id and user_id = p_user_id and status = 'pending';
  if not found then
    perform public.raise_rule('not_found', 'No pending request from that person.');
  end if;
end
$$;

create or replace function public.decline_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.can_moderate(p_group_id) then
    perform public.raise_rule('not_allowed', 'Only group admins can decline requests.');
  end if;
  delete from public.group_members
   where group_id = p_group_id and user_id = p_user_id and status = 'pending';
  if not found then
    perform public.raise_rule('not_found', 'No pending request from that person.');
  end if;
end
$$;

-- 2. The role check comes first: anyone who can't moderate the group gets
-- the same answer whoever they name.
create or replace function public.remove_member(p_group_id uuid, p_user_id uuid, p_reason text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_target public.group_members%rowtype;
begin
  perform public.require_writer();
  if not public.can_moderate(p_group_id) then
    perform public.raise_rule('not_allowed', 'Only group admins can remove members.');
  end if;

  select * into v_target from public.group_members
   where group_id = p_group_id and user_id = p_user_id;
  if not found then
    perform public.raise_rule('not_found', 'That person is not in this group.');
  end if;
  if v_target.role = 'owner' then
    perform public.raise_rule('not_allowed', 'The owner cannot be removed.');
  end if;
  if v_target.role = 'admin' and not (public.is_group_owner(p_group_id) or public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only the owner can remove an admin.');
  end if;

  update public.group_members set role = 'member', status = 'banned'
   where group_id = p_group_id and user_id = p_user_id;

  delete from public.event_rsvps r
   using public.events e
   where r.event_id = e.id and e.group_id = p_group_id
     and r.user_id = p_user_id and e.starts_at > now();

  perform public.log_moderation('ban_member', 'profile', p_user_id, p_group_id, p_reason);
end
$$;

create or replace function public.set_member_role(p_group_id uuid, p_user_id uuid, p_role public.member_role)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.can_moderate(p_group_id)
     or not (public.is_group_owner(p_group_id) or public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only the owner can change roles.');
  end if;
  if p_role = 'owner' then
    perform public.raise_rule('not_allowed', 'Use transfer_ownership to change the owner.');
  end if;
  update public.group_members set role = p_role
   where group_id = p_group_id and user_id = p_user_id
     and status = 'active' and role <> 'owner';
  if not found then
    perform public.raise_rule('not_found', 'That person is not an active member.');
  end if;
end
$$;

-- 3. The new owner must have room under the 3-owned-groups limit, the same
-- rule as creating a group (groups_before_insert) and approve_claim.
create or replace function public.transfer_ownership(p_group_id uuid, p_new_owner uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.can_moderate(p_group_id)
     or not (public.is_group_owner(p_group_id) or public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only the owner can transfer ownership.');
  end if;
  if not exists (select 1 from public.group_members
                 where group_id = p_group_id and user_id = p_new_owner
                   and role = 'admin' and status = 'active') then
    perform public.raise_rule('not_allowed', 'Ownership can only go to an admin.');
  end if;
  if (select count(*) from public.group_members m
        join public.groups g on g.id = m.group_id
      where m.user_id = p_new_owner and m.role = 'owner'
        and g.status in ('active', 'archived')) >= 3 then
    perform public.raise_rule('group_limit', 'That person already owns 3 groups.');
  end if;
  update public.group_members set role = 'member'
   where group_id = p_group_id and user_id = p_new_owner;
  update public.group_members set role = 'admin'
   where group_id = p_group_id and role = 'owner';
  update public.group_members set role = 'owner'
   where group_id = p_group_id and user_id = p_new_owner;
end
$$;

-- Discussions -----------------------------------------------------------------

create or replace function public.set_thread_flags(p_thread_id uuid, p_pinned boolean default null, p_locked boolean default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_group uuid;
begin
  perform public.require_writer();
  select group_id into v_group from public.threads where id = p_thread_id;
  if v_group is null or not public.can_moderate(v_group) then
    perform public.raise_rule('not_allowed', 'Only group admins can pin or lock threads.');
  end if;
  update public.threads
     set is_pinned = coalesce(p_pinned, is_pinned),
         is_locked = coalesce(p_locked, is_locked)
   where id = p_thread_id;
end
$$;

create or replace function public.remove_post(p_target_type public.report_target, p_target_id uuid, p_reason text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_group uuid;
  v_snapshot jsonb;
begin
  perform public.require_writer();

  if p_target_type = 'thread' then
    select t.group_id, jsonb_build_object('title', t.title, 'body', t.body, 'author_id', t.author_id)
      into v_group, v_snapshot from public.threads t where t.id = p_target_id;
  elsif p_target_type = 'reply' then
    select t.group_id, jsonb_build_object('body', r.body, 'author_id', r.author_id)
      into v_group, v_snapshot
      from public.replies r join public.threads t on t.id = r.thread_id where r.id = p_target_id;
  else
    perform public.raise_rule('invalid', 'Only threads and replies can be removed this way.');
  end if;

  if v_group is null or not public.can_moderate(v_group) then
    perform public.raise_rule('not_allowed', 'Only group admins can remove posts.');
  end if;

  if p_target_type = 'thread' then
    update public.threads set status = 'removed', title = '[removed]', body = '' where id = p_target_id;
  else
    update public.replies set status = 'removed', body = '' where id = p_target_id;
  end if;

  perform public.log_moderation('remove_content', p_target_type, p_target_id, v_group, p_reason, v_snapshot);
end
$$;

-- 5. Suspended and not-onboarded accounts can't delete either.
create or replace function public.delete_own_post(p_target_type public.report_target, p_target_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if p_target_type = 'thread' then
    update public.threads set status = 'deleted_by_author', title = '[deleted]', body = ''
     where id = p_target_id and author_id = auth.uid() and status = 'visible';
  elsif p_target_type = 'reply' then
    update public.replies set status = 'deleted_by_author', body = ''
     where id = p_target_id and author_id = auth.uid() and status = 'visible';
  else
    perform public.raise_rule('invalid', 'Only threads and replies can be deleted this way.');
  end if;
  if not found then
    perform public.raise_rule('not_found', 'You can only delete your own posts.');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1. Reports (FR-MD-2)
-- ---------------------------------------------------------------------------
-- A group's organizers handle reports about their members' posts and
-- events. A report about something an organizer posted goes to the site
-- admin only, so nobody clears a complaint about themselves or a fellow
-- organizer. Reports about a group or a profile already have no group, so
-- only the site admin sees them.

create or replace function public.resolve_report(p_report_id uuid, p_status public.report_status)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_report public.reports%rowtype;
  v_author uuid;
begin
  perform public.require_writer();
  if p_status = 'open' then
    perform public.raise_rule('invalid', 'A report can only be actioned or dismissed.');
  end if;
  select * into v_report from public.reports where id = p_report_id;
  if not found then
    perform public.raise_rule('not_found', 'No such report.');
  end if;

  if not public.is_site_admin() then
    if v_report.group_id is null or not public.can_moderate(v_report.group_id) then
      perform public.raise_rule('not_allowed', 'You cannot handle this report.');
    end if;

    v_author := case v_report.target_type
      when 'thread' then (select t.author_id from public.threads t where t.id = v_report.target_id)
      when 'reply' then (select r.author_id from public.replies r where r.id = v_report.target_id)
      when 'event' then (select e.created_by from public.events e where e.id = v_report.target_id)
    end;

    if v_author = auth.uid() then
      perform public.raise_rule('own_content', 'A report about your own post goes to the site admin.');
    end if;
    if exists (select 1 from public.group_members m
                where m.group_id = v_report.group_id and m.user_id = v_author
                  and m.role in ('owner', 'admin')) then
      perform public.raise_rule('own_content', 'A report about an organizer''s post goes to the site admin.');
    end if;
  end if;

  update public.reports
     set status = p_status, handled_by = auth.uid(), handled_at = now()
   where id = p_report_id;

  -- Actioning is logged by the action itself (remove_content, ban_member).
  if p_status = 'dismissed' then
    perform public.log_moderation('dismiss_report', v_report.target_type, v_report.target_id,
                                  v_report.group_id, 'report ' || p_report_id::text);
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 4 (continued). Event addresses: organizers of an active group only
-- ---------------------------------------------------------------------------
-- Changing and clearing an address also needs an active group now, like
-- setting one. The site admin, who can already edit any event, can too.

drop policy "Owner and admins set addresses" on public.event_private_details;
drop policy "Owner and admins change addresses" on public.event_private_details;
drop policy "Owner and admins clear addresses" on public.event_private_details;

create policy "Owner and admins set addresses" on public.event_private_details
  for insert to authenticated
  with check (exists (select 1 from public.events e where e.id = event_id and public.can_moderate(e.group_id)));

create policy "Owner and admins change addresses" on public.event_private_details
  for update to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and public.can_moderate(e.group_id)))
  with check (exists (select 1 from public.events e where e.id = event_id and public.can_moderate(e.group_id)));

create policy "Owner and admins clear addresses" on public.event_private_details
  for delete to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and public.can_moderate(e.group_id)));

-- ---------------------------------------------------------------------------
-- 6. Join limit that survives leaving (TR-SEC-8)
-- ---------------------------------------------------------------------------
-- One row per membership row ever created (a join, a join request, an
-- owner row). Internal: RLS on with no policies and no grants, so the API
-- can neither read nor write it. Rows older than two days are pruned as
-- new ones arrive, since the limit only looks back one day.

create table public.join_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index join_log_user_idx on public.join_log (user_id, created_at);
create index join_log_group_idx on public.join_log (group_id);

alter table public.join_log enable row level security;
revoke all on public.join_log from public, anon, authenticated;

-- Today's joins carry over, so nobody gets a fresh allowance from the deploy.
insert into public.join_log (user_id, group_id, created_at)
select m.user_id, m.group_id, m.created_at from public.group_members m
 where m.created_at > now() - interval '1 day';

create or replace function public.group_members_log_join()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.join_log
   where user_id = new.user_id and created_at < now() - interval '2 days';
  insert into public.join_log (user_id, group_id) values (new.user_id, new.group_id);
  return new;
end
$$;

revoke execute on function public.group_members_log_join() from public, anon, authenticated;

create trigger group_members_log_join after insert on public.group_members
  for each row execute function public.group_members_log_join();

-- Same rule as before, counted from the log. join_by_invite inserts through
-- the same trigger, so it needs no count of its own.
create or replace function public.group_members_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.role = 'member' and auth.uid() is not null
     and (select count(*) from public.join_log j
          where j.user_id = auth.uid() and j.created_at > now() - interval '1 day') >= 20 then
    perform public.raise_rule('rate_limited', 'You can join at most 20 groups a day.');
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- Cleanup: approve_claim keeps the claimant's existing membership row
-- ---------------------------------------------------------------------------
-- It used to delete the row and insert an owner row, which fired the
-- leave trigger and dropped the claimant's RSVPs to the group's events.

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
                 where g.id = v_claim.group_id
                   and ((g.status = 'active' and g.is_unclaimed) or (g.status = 'archived' and g.needs_owner))) then
    perform public.raise_rule('not_allowed', 'That group is no longer open to claims.');
  end if;
  if not exists (select 1 from public.accounts a
                 where a.id = v_claim.user_id and a.deleted_at is null and a.suspended_at is null) then
    perform public.raise_rule('not_allowed', 'That account is deleted or suspended.');
  end if;
  if (select count(*) from public.group_members m
        join public.groups g on g.id = m.group_id
      where m.user_id = v_claim.user_id and m.role = 'owner'
        and g.status in ('active', 'archived')) >= 3 then
    perform public.raise_rule('group_limit', 'That person already owns 3 groups.');
  end if;

  -- They may already hold a row (a membership, a request, a ban): it
  -- becomes the owner row, so their RSVPs stay.
  update public.group_members set role = 'owner', status = 'active'
   where group_id = v_claim.group_id and user_id = v_claim.user_id;
  if not found then
    insert into public.group_members (group_id, user_id, role, status)
    values (v_claim.group_id, v_claim.user_id, 'owner', 'active');
  end if;

  update public.groups
     set discussions_enabled = discussions_enabled or is_unclaimed,
         is_unclaimed = false,
         needs_owner = false,
         status = 'active'
   where id = v_claim.group_id;

  update public.group_claims
     set status = 'approved', decided_at = now(), decided_by = auth.uid()
   where id = v_claim.id;
  update public.group_claims
     set status = 'declined', decided_at = now(), decided_by = auth.uid()
   where group_id = v_claim.group_id and status = 'pending';
end
$$;

-- ---------------------------------------------------------------------------
-- 7. The unused group-covers bucket
-- ---------------------------------------------------------------------------
-- No page uploads covers, and its policies had no rate or count limit.
-- UC-24 will add a reviewed version. groups.cover_image_path stays (always
-- null, set so by groups_before_insert) and is unused.

drop policy if exists "Group admins upload covers" on storage.objects;
drop policy if exists "Group admins replace covers" on storage.objects;
drop policy if exists "Group admins delete covers" on storage.objects;

-- Removed only when empty. Hosted Supabase may refuse direct deletes from
-- storage tables; the bucket then stays, harmless with no write policy.
do $$
begin
  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.buckets b
   where b.id = 'group-covers'
     and not exists (select 1 from storage.objects o where o.bucket_id = 'group-covers');
exception when others then
  raise notice 'group-covers bucket left in place: %', sqlerrm;
end
$$;

-- ---------------------------------------------------------------------------
-- 8. Event listings: active groups only (FR-GR-6)
-- ---------------------------------------------------------------------------
-- Same columns in the same order; create or replace keeps the grants and
-- security_invoker. An archived group's own pages read its events from
-- public.events instead (see src/lib/groupEvents.ts).

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
  e.source_url,
  e.is_paid,
  e.takes_rsvps
from public.events e
join public.groups g on g.id = e.group_id
join public.subcategories s on s.id = g.subcategory_id
join public.categories c on c.id = s.category_id
where g.status = 'active';

-- ---------------------------------------------------------------------------
-- Cleanup: raise_rule is internal
-- ---------------------------------------------------------------------------
-- Its only caller running as the signed-in user was events_before_write,
-- which now raises the same message itself. Every other caller is SECURITY
-- DEFINER and runs as the owner.

create or replace function public.events_before_write()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception using errcode = 'P0001',
      message = 'invalid_timezone: Unknown time zone ' || new.timezone || '.';
  end if;
  return new;
end
$$;

revoke execute on function public.raise_rule(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cleanup: indexes on foreign keys and the moderation log
-- ---------------------------------------------------------------------------

create index if not exists groups_created_by_created_idx on public.groups (created_by, created_at);
create index if not exists group_claims_user_created_idx on public.group_claims (user_id, created_at);
create index if not exists group_claims_decided_by_idx on public.group_claims (decided_by);
create index if not exists events_created_by_idx on public.events (created_by);
create index if not exists reports_handled_by_idx on public.reports (handled_by);
create index if not exists moderation_actions_actor_idx on public.moderation_actions (actor_id);
create index if not exists moderation_actions_group_idx on public.moderation_actions (group_id);
create index if not exists moderation_actions_created_idx on public.moderation_actions (created_at desc);
create index if not exists candidates_group_idx on research.candidates (group_id);
