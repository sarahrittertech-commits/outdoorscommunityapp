-- Groups without an owner (FR-AC-6, FR-GR-10), decided 8 October 2026.
--
-- An owner can delete their account without transferring their groups
-- first. Each group they still own goes inactive: it is archived
-- (read-only, hidden from listings, still viewable), its upcoming events
-- are cancelled, and it is marked as needing an owner. Anyone signed in
-- can then ask to take it over through the claim process, and the site
-- admin approves, as for an unclaimed listing.
--
-- Also fixes deleting an account that appears in the moderation log: the
-- log's foreign keys null out the actor or group when one is deleted,
-- which the append-only trigger refused, so organizers could never be
-- deleted.

-- ---------------------------------------------------------------------------
-- 1. The flag
-- ---------------------------------------------------------------------------

alter table public.groups
  add column needs_owner boolean not null default false;

comment on column public.groups.needs_owner is
  'Its owner deleted their account. Archived until a claim is approved.';

-- Not in the column update grant, so only the functions below change it.
-- New groups never start without an owner, whatever the client sends.
create or replace function public.groups_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.status := 'active';
  new.cover_image_path := null;
  new.needs_owner := false;

  if auth.uid() is not null
     and coalesce(current_setting('branch.operator_listing', true), '') <> 'on' then
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

-- ---------------------------------------------------------------------------
-- 2. The moderation log keeps its rows when a person or group is deleted
-- ---------------------------------------------------------------------------
-- Still append-only for everyone; the one update allowed is the database's
-- own "on delete set null" on actor_id and group_id, changing nothing else.

create or replace function public.moderation_actions_immutable()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and (new.actor_id is null or new.actor_id = old.actor_id)
     and (new.group_id is null or new.group_id = old.group_id)
     and (new.actor_id is distinct from old.actor_id or new.group_id is distinct from old.group_id)
     and new.id = old.id and new.action = old.action and new.target_type = old.target_type
     and new.target_id = old.target_id and new.reason = old.reason
     and new.content_snapshot is not distinct from old.content_snapshot
     and new.created_at = old.created_at
     and pg_trigger_depth() > 1 then
    return new;
  end if;
  raise exception 'moderation_actions is append-only';
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Deleting an account
-- ---------------------------------------------------------------------------

create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_groups uuid[];
begin
  if auth.uid() is null then
    perform public.raise_rule('not_signed_in', 'Sign in first.');
  end if;

  -- Groups they still own go inactive and wait for a new owner.
  select coalesce(array_agg(m.group_id), '{}') into v_groups
    from public.group_members m join public.groups g on g.id = m.group_id
   where m.user_id = auth.uid() and m.role = 'owner' and g.status in ('active', 'archived');

  update public.events set status = 'cancelled'
   where group_id = any (v_groups) and status = 'scheduled' and starts_at > now();
  update public.groups set status = 'archived', needs_owner = true
   where id = any (v_groups);

  update public.profiles set display_name = null, bio = null, area = null where id = auth.uid();
  update public.accounts set deleted_at = now() where id = auth.uid();
  delete from public.group_members where user_id = auth.uid() and status <> 'banned';
  delete from public.event_rsvps where user_id = auth.uid();
  delete from public.notification_preferences where user_id = auth.uid();
  delete from public.group_claims where user_id = auth.uid() and status = 'pending';
end
$$;

-- ---------------------------------------------------------------------------
-- 4. Claiming a group that needs an owner
-- ---------------------------------------------------------------------------

drop policy "Users ask to claim unclaimed listings" on public.group_claims;

create policy "Users ask to claim unclaimed listings and ownerless groups" on public.group_claims
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_write()
    and status = 'pending'
    and decided_at is null
    and decided_by is null
    and exists (
      select 1 from public.groups g
      where g.id = group_id
        and ((g.status = 'active' and g.is_unclaimed) or (g.status = 'archived' and g.needs_owner))
    )
  );

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

  -- They may already hold a row (a membership, a ban); an owner row replaces it.
  delete from public.group_members
   where group_id = v_claim.group_id and user_id = v_claim.user_id;
  insert into public.group_members (group_id, user_id, role, status)
  values (v_claim.group_id, v_claim.user_id, 'owner', 'active');

  -- An unclaimed listing becomes an ordinary group with discussions on; a
  -- group that lost its owner comes back as it was.
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

-- Restoring needs an owner: a group without one comes back through a claim.
create or replace function public.restore_group(p_group_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if exists (select 1 from public.groups g where g.id = p_group_id and g.needs_owner) then
    perform public.raise_rule('not_allowed', 'This group needs an owner first: approve a claim on it.');
  end if;
  if public.is_site_admin() then
    update public.groups set status = 'active' where id = p_group_id and status <> 'active';
  elsif public.is_group_owner(p_group_id) then
    update public.groups set status = 'active' where id = p_group_id and status = 'archived';
  else
    perform public.raise_rule('not_allowed', 'Only the owner can restore the group.');
  end if;
  if not found then
    perform public.raise_rule('not_found', 'That group cannot be restored.');
  end if;
  perform public.log_moderation('restore_group', 'group', p_group_id, p_group_id, '');
end
$$;
