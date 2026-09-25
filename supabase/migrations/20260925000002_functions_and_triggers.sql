-- Helper checks, triggers and action functions.
--
-- Three kinds of code live here:
--
-- 1. Helper checks ("is this user an admin of this group?") that the RLS
--    policies call, so each rule is written once.
-- 2. Triggers that enforce rules spanning rows or tables: rate limits,
--    capacity, reply counts, the owner row on group creation.
-- 3. Action functions for changes with several rules attached (approve a
--    member, transfer ownership, remove a post). Tables expose no direct
--    UPDATE for these; the function checks the caller's role and logs
--    moderation actions.
--
-- Every SECURITY DEFINER function pins search_path to '' and schema-qualifies
-- every name, so it can't be tricked into running someone else's objects.

-- ===========================================================================
-- 1. Helper checks
-- ===========================================================================

create or replace function public.is_site_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.accounts a
    where a.id = auth.uid() and a.is_site_admin and a.deleted_at is null
  )
$$;

-- Signed in, accepted the terms, not suspended, not deleted (FR-AC-2, FR-MD-3).
create or replace function public.can_write()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.accounts a
    where a.id = auth.uid()
      and a.accepted_terms_at is not null
      and a.suspended_at is null
      and a.deleted_at is null
  )
$$;

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = p_group_id and m.user_id = auth.uid() and m.status = 'active'
  )
$$;

create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = p_group_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('owner', 'admin')
  )
$$;

create or replace function public.is_group_owner(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = p_group_id and m.user_id = auth.uid() and m.role = 'owner'
  )
$$;

create or replace function public.group_is_active(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.groups g where g.id = p_group_id and g.status = 'active')
$$;

create or replace function public.group_discussions_open(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.groups g
    where g.id = p_group_id and g.status = 'active' and g.discussions_enabled
  )
$$;

-- Public counts. Visitors can't read the member or RSVP rows, but they can
-- see how many there are (FR-BR-2, FR-BR-7).
create or replace function public.group_member_count(p_group_id uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from public.group_members m
  where m.group_id = p_group_id and m.status = 'active'
$$;

create or replace function public.event_going_count(p_event_id uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from public.event_rsvps r
  where r.event_id = p_event_id and r.status = 'going'
$$;

-- Raises a recognisable error the web app turns into a friendly message.
create or replace function public.raise_rule(p_code text, p_message text)
returns void
language plpgsql
as $$
begin
  raise exception using errcode = 'P0001', message = p_code || ': ' || p_message;
end
$$;

-- ===========================================================================
-- 2. Triggers
-- ===========================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger groups_updated_at before update on public.groups
  for each row execute function public.set_updated_at();
create trigger group_members_updated_at before update on public.group_members
  for each row execute function public.set_updated_at();
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger event_rsvps_updated_at before update on public.event_rsvps
  for each row execute function public.set_updated_at();

-- New sign-up: create the public profile and the private account row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.accounts (id) values (new.id) on conflict do nothing;
  return new;
end
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Groups: creation limits (FR-GR-7, TR-SEC-8) and trusted defaults.
create or replace function public.groups_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.status := 'active';
  new.cover_image_path := null;

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

create trigger groups_before_insert before insert on public.groups
  for each row execute function public.groups_before_insert();

-- The creator becomes the owner, in the same transaction (FR-GR-1).
create or replace function public.groups_after_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.group_members (group_id, user_id, role, status)
    values (new.id, new.created_by, 'owner', 'active');
  end if;
  return new;
end
$$;

create trigger groups_after_insert after insert on public.groups
  for each row execute function public.groups_after_insert();

-- Joining: rate limit (TR-SEC-8). The owner row from the trigger above is exempt.
create or replace function public.group_members_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.role = 'member' and auth.uid() is not null
     and (select count(*) from public.group_members m
          where m.user_id = auth.uid() and m.created_at > now() - interval '1 day') >= 20 then
    perform public.raise_rule('rate_limited', 'You can join at most 20 groups a day.');
  end if;
  return new;
end
$$;

create trigger group_members_before_insert before insert on public.group_members
  for each row execute function public.group_members_before_insert();

-- Events: the time zone must be a real one (TR-DATA-3).
create or replace function public.events_before_write()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    perform public.raise_rule('invalid_timezone', 'Unknown time zone ' || new.timezone || '.');
  end if;
  return new;
end
$$;

create trigger events_before_write before insert or update on public.events
  for each row execute function public.events_before_write();

-- RSVPs: only before the start, never on a cancelled event, never past
-- capacity (FR-EV-3, FR-EV-5). The event row is locked so two people can't
-- take the last place at the same moment.
create or replace function public.event_rsvps_before_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_going integer;
begin
  select * into v_event from public.events e where e.id = new.event_id for update;

  if v_event.status <> 'scheduled' then
    perform public.raise_rule('event_cancelled', 'This event has been cancelled.');
  end if;
  if v_event.starts_at <= now() then
    perform public.raise_rule('event_started', 'RSVPs close when the event starts.');
  end if;

  if new.status = 'going' and v_event.capacity is not null then
    select count(*) into v_going from public.event_rsvps r
    where r.event_id = new.event_id and r.status = 'going' and r.user_id <> new.user_id;
    if v_going >= v_event.capacity then
      perform public.raise_rule('event_full', 'This event is full.');
    end if;
  end if;
  return new;
end
$$;

create trigger event_rsvps_before_write before insert or update on public.event_rsvps
  for each row execute function public.event_rsvps_before_write();

-- Posting rate limit shared by threads and replies: 10 per 10 minutes.
create or replace function public.check_post_rate_limit()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.threads t
      where t.author_id = auth.uid() and t.created_at > now() - interval '10 minutes')
   + (select count(*) from public.replies r
      where r.author_id = auth.uid() and r.created_at > now() - interval '10 minutes') >= 10 then
    perform public.raise_rule('rate_limited', 'You are posting too quickly. Try again in a few minutes.');
  end if;
end
$$;

create or replace function public.threads_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.check_post_rate_limit();
  new.status := 'visible';
  new.is_pinned := false;
  new.is_locked := false;
  new.reply_count := 0;
  new.created_at := now();
  new.last_activity_at := now();
  new.edited_at := null;
  return new;
end
$$;

create trigger threads_before_insert before insert on public.threads
  for each row execute function public.threads_before_insert();

create or replace function public.replies_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.check_post_rate_limit();
  new.status := 'visible';
  new.created_at := now();
  new.edited_at := null;
  return new;
end
$$;

create trigger replies_before_insert before insert on public.replies
  for each row execute function public.replies_before_insert();

-- A new reply bumps its thread to the top of the board (FR-DS-3).
create or replace function public.replies_after_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.threads
     set reply_count = reply_count + 1, last_activity_at = new.created_at
   where id = new.thread_id;
  return new;
end
$$;

create trigger replies_after_insert after insert on public.replies
  for each row execute function public.replies_after_insert();

-- Author edits get an "edited" mark (FR-DS-4). Moderator and author
-- deletions change status too, so only visible posts are marked.
create or replace function public.threads_mark_edited()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'visible'
     and (new.body is distinct from old.body or new.title is distinct from old.title) then
    new.edited_at := now();
  end if;
  return new;
end
$$;

create or replace function public.replies_mark_edited()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'visible' and new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end
$$;

create trigger threads_mark_edited before update on public.threads
  for each row execute function public.threads_mark_edited();
create trigger replies_mark_edited before update on public.replies
  for each row execute function public.replies_mark_edited();

-- Reports: rate limit, and route to the right queue by deriving group_id
-- from the target rather than trusting the client (FR-MD-2).
create or replace function public.reports_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_group uuid;
  v_found boolean;
begin
  if (select count(*) from public.reports r
      where r.reporter_id = auth.uid() and r.created_at > now() - interval '1 day') >= 10 then
    perform public.raise_rule('rate_limited', 'You can send at most 10 reports a day.');
  end if;

  case new.target_type
    when 'event' then
      select e.group_id, true into v_group, v_found from public.events e where e.id = new.target_id;
    when 'thread' then
      select t.group_id, true into v_group, v_found from public.threads t where t.id = new.target_id;
    when 'reply' then
      select t.group_id, true into v_group, v_found
        from public.replies r join public.threads t on t.id = r.thread_id where r.id = new.target_id;
    when 'group' then
      select null::uuid, true into v_group, v_found from public.groups g where g.id = new.target_id;
    when 'profile' then
      select null::uuid, true into v_group, v_found from public.profiles p where p.id = new.target_id;
  end case;

  if v_found is not true then
    perform public.raise_rule('not_found', 'The reported item does not exist.');
  end if;

  new.group_id := v_group;
  new.status := 'open';
  new.handled_by := null;
  new.handled_at := null;
  new.created_at := now();
  return new;
end
$$;

create trigger reports_before_insert before insert on public.reports
  for each row execute function public.reports_before_insert();

-- The moderation log is append-only, for every role including the owner of
-- the table (FR-MD-6, PT-19).
create or replace function public.moderation_actions_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'moderation_actions is append-only';
end
$$;

create trigger moderation_actions_no_update before update or delete on public.moderation_actions
  for each row execute function public.moderation_actions_immutable();

-- ===========================================================================
-- 3. Action functions
-- ===========================================================================

create or replace function public.require_writer()
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    perform public.raise_rule('not_signed_in', 'Sign in first.');
  end if;
  if not public.can_write() then
    perform public.raise_rule('not_allowed', 'Your account cannot make changes right now.');
  end if;
end
$$;

create or replace function public.log_moderation(
  p_action public.moderation_action_type,
  p_target_type public.report_target,
  p_target_id uuid,
  p_group_id uuid,
  p_reason text,
  p_snapshot jsonb default null
)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.moderation_actions (actor_id, action, target_type, target_id, group_id, reason, content_snapshot)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_group_id, coalesce(p_reason, ''), p_snapshot)
$$;

-- First sign-in: display name, 18+ and terms (FR-AC-2, FR-AC-3).
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

-- Membership --------------------------------------------------------------

create or replace function public.approve_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not (public.is_group_admin(p_group_id) or public.is_site_admin())
     or not public.group_is_active(p_group_id) then
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
  if not (public.is_group_admin(p_group_id) or public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only group admins can decline requests.');
  end if;
  delete from public.group_members
   where group_id = p_group_id and user_id = p_user_id and status = 'pending';
  if not found then
    perform public.raise_rule('not_found', 'No pending request from that person.');
  end if;
end
$$;

-- Remove and ban (FR-MB-7). Admins can remove members; only the owner (or
-- the site admin) can remove an admin; nobody can remove the owner.
create or replace function public.remove_member(p_group_id uuid, p_user_id uuid, p_reason text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_target public.group_members%rowtype;
begin
  perform public.require_writer();
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
  if not (public.is_group_admin(p_group_id) or public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only group admins can remove members.');
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

-- Promote to admin / demote to member (FR-MB-5). Owner only.
create or replace function public.set_member_role(p_group_id uuid, p_user_id uuid, p_role public.member_role)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not (public.is_group_owner(p_group_id) or public.is_site_admin()) then
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

-- Transfer ownership to an admin; the old owner becomes an admin (FR-MB-6).
create or replace function public.transfer_ownership(p_group_id uuid, p_new_owner uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not (public.is_group_owner(p_group_id) or public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only the owner can transfer ownership.');
  end if;
  if not exists (select 1 from public.group_members
                 where group_id = p_group_id and user_id = p_new_owner
                   and role = 'admin' and status = 'active') then
    perform public.raise_rule('not_allowed', 'Ownership can only go to an admin.');
  end if;
  update public.group_members set role = 'admin'
   where group_id = p_group_id and role = 'owner';
  update public.group_members set role = 'owner'
   where group_id = p_group_id and user_id = p_new_owner;
end
$$;

-- Group status ------------------------------------------------------------

create or replace function public.archive_group(p_group_id uuid, p_reason text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not (public.is_group_owner(p_group_id) or public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only the owner can archive the group.');
  end if;
  update public.groups set status = 'archived' where id = p_group_id and status = 'active';
  if not found then
    perform public.raise_rule('not_found', 'Only an active group can be archived.');
  end if;
  perform public.log_moderation('archive_group', 'group', p_group_id, p_group_id, p_reason);
end
$$;

create or replace function public.restore_group(p_group_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
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

create or replace function public.remove_group(p_group_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can remove a group.');
  end if;
  update public.groups set status = 'removed' where id = p_group_id;
  perform public.log_moderation('remove_group', 'group', p_group_id, p_group_id, p_reason);
end
$$;

-- Discussions ---------------------------------------------------------------

create or replace function public.set_thread_flags(p_thread_id uuid, p_pinned boolean, p_locked boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_group uuid;
begin
  perform public.require_writer();
  select group_id into v_group from public.threads where id = p_thread_id;
  if v_group is null or not (public.is_group_admin(v_group) or public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only group admins can pin or lock threads.');
  end if;
  update public.threads
     set is_pinned = coalesce(p_pinned, is_pinned),
         is_locked = coalesce(p_locked, is_locked)
   where id = p_thread_id;
end
$$;

-- Moderator removal (FR-DS-5). The content is copied into the moderation log,
-- then blanked, so members can no longer read it but the site admin can.
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

  if v_group is null or not (public.is_group_admin(v_group) or public.is_site_admin()) then
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

-- Author deletion (FR-DS-4). Blanked, not deleted, so the thread still reads.
create or replace function public.delete_own_post(p_target_type public.report_target, p_target_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    perform public.raise_rule('not_signed_in', 'Sign in first.');
  end if;
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

-- Reports ---------------------------------------------------------------------

create or replace function public.resolve_report(p_report_id uuid, p_status public.report_status)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_group uuid;
begin
  perform public.require_writer();
  if p_status = 'open' then
    perform public.raise_rule('invalid', 'A report can only be actioned or dismissed.');
  end if;
  select group_id into v_group from public.reports where id = p_report_id;
  if not found then
    perform public.raise_rule('not_found', 'No such report.');
  end if;
  if not (public.is_site_admin() or (v_group is not null and public.is_group_admin(v_group))) then
    perform public.raise_rule('not_allowed', 'You cannot handle this report.');
  end if;
  update public.reports
     set status = p_status, handled_by = auth.uid(), handled_at = now()
   where id = p_report_id;
end
$$;

-- Accounts --------------------------------------------------------------------

create or replace function public.suspend_user(p_user_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.is_site_admin() or p_user_id = auth.uid() then
    perform public.raise_rule('not_allowed', 'Only the site admin can suspend accounts.');
  end if;
  update public.accounts set suspended_at = now() where id = p_user_id and suspended_at is null;
  perform public.log_moderation('suspend_user', 'profile', p_user_id, null, p_reason);
end
$$;

create or replace function public.unsuspend_user(p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can unsuspend accounts.');
  end if;
  update public.accounts set suspended_at = null where id = p_user_id;
  perform public.log_moderation('unsuspend_user', 'profile', p_user_id, null, '');
end
$$;

-- Account deletion (FR-AC-6, TR-PRIV-4). Personal data is removed now; the
-- auth user itself is deleted by a server-side job within 24 hours, which
-- cascades and leaves posts attributed to "deleted user".
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    perform public.raise_rule('not_signed_in', 'Sign in first.');
  end if;
  if exists (select 1 from public.group_members m join public.groups g on g.id = m.group_id
             where m.user_id = auth.uid() and m.role = 'owner' and g.status <> 'removed') then
    perform public.raise_rule('owns_groups', 'Transfer or archive your groups first.');
  end if;

  update public.profiles set display_name = null, bio = null, area = null where id = auth.uid();
  update public.accounts set deleted_at = now() where id = auth.uid();
  delete from public.group_members where user_id = auth.uid() and status <> 'banned';
  delete from public.event_rsvps where user_id = auth.uid();
  delete from public.notification_preferences where user_id = auth.uid();
end
$$;

-- ===========================================================================
-- Function privileges
-- ===========================================================================
-- Functions are executable by PUBLIC by default. Take that away from
-- everything here, then grant back only what each role needs.

revoke execute on all functions in schema public from public, anon;

grant execute on function
  public.is_site_admin(), public.can_write(),
  public.is_group_member(uuid), public.is_group_admin(uuid), public.is_group_owner(uuid),
  public.group_is_active(uuid), public.group_discussions_open(uuid),
  public.group_member_count(uuid), public.event_going_count(uuid)
to anon, authenticated;

-- Called by the events trigger, which runs as the signed-in user.
grant execute on function public.raise_rule(text, text) to authenticated;

grant execute on function
  public.complete_onboarding(text, text, text, boolean, boolean),
  public.approve_member(uuid, uuid), public.decline_member(uuid, uuid),
  public.remove_member(uuid, uuid, text), public.set_member_role(uuid, uuid, public.member_role),
  public.transfer_ownership(uuid, uuid),
  public.archive_group(uuid, text), public.restore_group(uuid), public.remove_group(uuid, text),
  public.set_thread_flags(uuid, boolean, boolean),
  public.remove_post(public.report_target, uuid, text), public.delete_own_post(public.report_target, uuid),
  public.resolve_report(uuid, public.report_status),
  public.suspend_user(uuid, text), public.unsuspend_user(uuid),
  public.delete_my_account()
to authenticated;
