-- Follow-ups from the 9 October code review (PRD, "Security review").
--
-- Each one is the database failing to keep a rule the product already has,
-- not a new feature:
--
--   1. FR-AC-3  a display name is required, so an account cannot clear it
--               and keep writing.
--   2. FR-MD-8  who reported something is not readable by the group's own
--               admins, only by the site admin.
--   3. FR-GR-10 a group whose owner left always comes back through a claim,
--               even if it was removed at the time.
--   4. TR-SEC-8 claim requests are rate limited like every other write.
--   5. FR-GR-6  an archived group is read-only for changing an RSVP too,
--               not only for making one.
--
-- Tests: supabase/tests/011-review-followups.sql (PT-28 to PT-32).

-- ---------------------------------------------------------------------------
-- 1. FR-AC-3: a member always has a name.
--
-- char_length(null) is null, which a CHECK accepts, so the column constraint
-- never refused a missing name. A nameless account still passed can_write(),
-- so it could post while rendering as "deleted user" everywhere — nobody
-- could report it and the site admin could not open its profile to suspend
-- it. deleted_at is what marks a deleted account, and delete_my_account()
-- clears the name on purpose, so writing is what has to require the name,
-- not the column.

alter table public.profiles
  drop constraint if exists profiles_display_name_check;

alter table public.profiles
  add constraint profiles_display_name_check
  check (display_name is null or char_length(btrim(display_name)) between 2 and 40);

create or replace function public.can_write()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.accounts a
    join public.profiles p on p.id = a.id
    where a.id = auth.uid()
      and a.accepted_terms_at is not null
      and a.suspended_at is null
      and a.deleted_at is null
      -- FR-AC-3: an account with no name cannot be reported or reached.
      and char_length(btrim(coalesce(p.display_name, ''))) >= 2
  )
$$;

-- The profile policy allows the owner to update their own row, so the name
-- has to be refused on the way in as well: without this a member can blank
-- it, lose the ability to write, and leave the site admin a profile page
-- that 404s.

create or replace function public.profiles_before_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- delete_my_account() clears the name on purpose; it marks the account
  -- deleted first, so that case is allowed through.
  if auth.uid() is not null and auth.uid() = new.id
     and char_length(btrim(coalesce(new.display_name, ''))) < 2
     and old.display_name is not null
     and not exists (select 1 from public.accounts a
                     where a.id = new.id and a.deleted_at is not null) then
    perform public.raise_rule('invalid', 'Your display name is required.');
  end if;
  return new;
end
$$;

revoke execute on function public.profiles_before_update() from public, anon, authenticated;

drop trigger if exists profiles_require_name on public.profiles;
create trigger profiles_require_name before update on public.profiles
  for each row execute function public.profiles_before_update();

-- complete_onboarding() takes the name straight from the form. Zod checks it
-- in the app (FR-AC-3); this is the same rule in the database, so the RPC
-- cannot be called directly with a blank one. Unchanged otherwise.

create or replace function public.complete_onboarding(
  p_display_name text,
  p_bio text default null,
  p_area text default null,
  p_confirm_adult boolean default false,
  p_accept_terms boolean default false
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    perform public.raise_rule('not_signed_in', 'Sign in first.');
  end if;
  if not (p_confirm_adult and p_accept_terms) then
    perform public.raise_rule('terms_required', 'You must be 18 or older and accept the terms.');
  end if;
  if exists (select 1 from public.accounts a where a.id = auth.uid()
             and (a.deleted_at is not null or a.suspended_at is not null)) then
    perform public.raise_rule('not_allowed', 'Your account cannot make changes right now.');
  end if;
  -- FR-AC-3: a display name of 2 to 40 characters is required.
  if char_length(btrim(coalesce(p_display_name, ''))) < 2
     or char_length(btrim(p_display_name)) > 40 then
    perform public.raise_rule('invalid', 'Enter a display name of 2 to 40 characters.');
  end if;

  update public.profiles
     set display_name = btrim(p_display_name),
         bio = nullif(btrim(p_bio), ''),
         area = nullif(btrim(p_area), '')
   where id = auth.uid();

  update public.accounts
     set accepted_terms_at = coalesce(accepted_terms_at, now())
   where id = auth.uid();
end
$$;

revoke execute on function public.complete_onboarding(text, text, text, boolean, boolean)
  from public, anon;
grant execute on function public.complete_onboarding(text, text, text, boolean, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 2. FR-MD-8: the reporter is not shown to the group's admins.
--
-- The report form promises it and no page has ever displayed it, but the
-- row was readable, so a group admin could read reporter_id straight from
-- the API — including for a report about themselves. Same shape as
-- join_answer: revoke the table, grant the columns that are not identifying.

revoke select on public.reports from authenticated;
grant select (id, target_type, target_id, group_id, reason, note, status, handled_by, handled_at, created_at)
  on public.reports to authenticated;

-- The site admin needs the reporter; so does a reporter for their own report
-- (the policy already allows reporter_id = auth.uid() to select the row).

create or replace function public.report_reporters(p_report_id uuid)
returns table (report_id uuid, reporter_id uuid)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.reporter_id
  from public.reports r
  where r.id = p_report_id
    and public.is_site_admin()
$$;

revoke execute on function public.report_reporters(uuid) from public, anon;
grant execute on function public.report_reporters(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. FR-GR-10: a group whose owner left always needs a new owner.
--
-- delete_my_account() only collected groups that were active or archived, so
-- a group the site admin had removed lost its owner row with the rest and
-- was never marked needs_owner. restore_group() would then bring it back
-- active with nobody able to edit, moderate or approve a claim on it, while
-- it was listed and joinable.

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

  -- Every group they own, whatever state it is in: a removed one still has
  -- to wait for a claim rather than come back ownerless.
  select coalesce(array_agg(m.group_id), '{}') into v_groups
    from public.group_members m join public.groups g on g.id = m.group_id
   where m.user_id = auth.uid() and m.role = 'owner'
     and g.status in ('active', 'archived', 'removed');

  update public.events set status = 'cancelled'
   where group_id = any (v_groups) and status = 'scheduled' and starts_at > now();

  -- A removed group stays removed: the site admin decides whether it comes
  -- back at all, and needs_owner then sends it through a claim.
  update public.groups set status = 'archived', needs_owner = true
   where id = any (v_groups) and status in ('active', 'archived');
  update public.groups set needs_owner = true
   where id = any (v_groups) and status = 'removed';

  -- Mark the account deleted first: the profiles trigger above allows the
  -- name to be cleared only once it is.
  update public.accounts set deleted_at = now() where id = auth.uid();
  update public.profiles set display_name = null, bio = null, area = null where id = auth.uid();
  delete from public.group_members where user_id = auth.uid() and status <> 'banned';
  delete from public.event_rsvps where user_id = auth.uid();
  delete from public.notification_preferences where user_id = auth.uid();
  delete from public.group_claims where user_id = auth.uid() and status = 'pending';
end
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Belt and braces: whatever route a group takes back to active, it cannot
-- arrive without an owner.

create or replace function public.groups_before_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'active' and old.status <> 'active' and not new.needs_owner
     and not exists (
       select 1 from public.group_members m
       where m.group_id = new.id and m.role = 'owner' and m.status = 'active'
     ) then
    new.needs_owner := true;
  end if;
  return new;
end
$$;

revoke execute on function public.groups_before_update() from public, anon, authenticated;

drop trigger if exists groups_require_owner on public.groups;
create trigger groups_require_owner before update on public.groups
  for each row execute function public.groups_before_update();

-- ---------------------------------------------------------------------------
-- 4. TR-SEC-8: claim requests are rate limited.
--
-- Every other write has a cap. group_claims had only a unique index per
-- group, so with the board seeded with unclaimed listings (FR-GR-9) one
-- account could file a claim on every listing and fill the admin queue.

create or replace function public.group_claims_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.group_claims c
      where c.user_id = auth.uid() and c.created_at > now() - interval '1 day') >= 5 then
    perform public.raise_rule('rate_limited', 'You can send at most 5 claim requests a day.');
  end if;
  return new;
end
$$;

revoke execute on function public.group_claims_before_insert() from public, anon, authenticated;

drop trigger if exists group_claims_rate_limit on public.group_claims;
create trigger group_claims_rate_limit before insert on public.group_claims
  for each row execute function public.group_claims_before_insert();

-- The per-person lock and server-set created_at, as on every other write.
drop trigger if exists a_limit_guard on public.group_claims;
create trigger a_limit_guard before insert on public.group_claims
  for each row execute function public.before_insert_limit_guard();

-- ---------------------------------------------------------------------------
-- 5. FR-GR-6: an archived group is read-only for changing an RSVP too.
--
-- Making one already required the group to be active; changing one did not,
-- so a member holding a row could still flip going/not_going in a group the
-- page says is read-only.

drop policy if exists "Members change their own RSVP" on public.event_rsvps;

create policy "Members change their own RSVP" on public.event_rsvps
  for update to authenticated
  using (user_id = auth.uid() and public.can_write())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and public.is_group_member(e.group_id)
        and public.group_is_active(e.group_id)
    )
  );
