-- UC-27: a person's first group waits for the site admin (option B),
-- approved by Sarah on 9 October 2026. FR-GR-8, FR-GR-21, FR-GR-22.
--
-- Why a separate review_status column, not a new group_status value:
-- group_status says what the group's *organizers* can do (active, archived,
-- removed), and some 20 functions and policies already read it to decide
-- that. A group waiting for review is fully active for its owner (they edit
-- it and post events), so a new status value would have meant teaching every
-- one of those checks that "pending" also counts as active. Review is a
-- separate question, "is it listed?", asked in a handful of places: the
-- groups read policy, group_is_visible(), joining, and the two listing
-- views. A declined group is read-only, which group_is_active() and the
-- edit policy now say in one line each.
--
--   1. groups.review_status, review_reason, reviewed_at; existing groups
--      count as approved
--   2. who skips review: has_approved_group()
--   3. new groups start pending for first-time organizers
--   4. who can see a group waiting for review: its owner, its page managers
--      and the site admin
--   5. nobody joins a group that isn't approved
--   6. listings, search, the sitemap, Communities and browse leave it out
--   7. approve_new_group / decline_new_group (site admin), logged
--   8. the owner deletes a declined group; a pending or declined group is
--      deleted with its owner's account
--   9. first_group_needs_review() for the form (FR-GR-22)

-- ---------------------------------------------------------------------------
-- 1. The columns
-- ---------------------------------------------------------------------------

create type public.group_review_status as enum ('pending', 'approved', 'declined');

alter type public.moderation_action_type add value if not exists 'approve_group';
alter type public.moderation_action_type add value if not exists 'decline_group';

-- The default only fills existing rows: every group that exists when this
-- ships counts as approved. New rows are set by groups_before_insert.
alter table public.groups
  add column review_status public.group_review_status not null default 'approved',
  add column review_reason text not null default ''
    constraint groups_review_reason_length check (char_length(review_reason) <= 500),
  add column reviewed_at timestamptz;

comment on column public.groups.review_status is
  'UC-27: a first-time organizer''s group waits for the site admin before it is listed.';

-- Not in the column update grant, so only the functions below change them.

create index groups_review_pending_idx on public.groups (created_at) where review_status = 'pending';

-- ---------------------------------------------------------------------------
-- 2. Who skips review
-- ---------------------------------------------------------------------------
-- They started an approved group (whoever owns it now), own one now (a
-- transfer counts), or had a claim approved. A group the site admin removed
-- doesn't count.

create or replace function public.has_approved_group(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.groups g
     where g.review_status = 'approved' and g.status <> 'removed'
       and (g.created_by = p_user_id
            or exists (select 1 from public.group_members m
                        where m.group_id = g.id and m.user_id = p_user_id and m.role = 'owner'))
  )
  or exists (
    select 1 from public.group_claims c where c.user_id = p_user_id and c.status = 'approved'
  )
$$;

revoke execute on function public.has_approved_group(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. New groups
-- ---------------------------------------------------------------------------
-- As 20261008000002, plus the review status. A group waiting for review
-- counts toward the limit of 3; a declined one doesn't, so its owner can
-- start again. Inserts with no signed-in user (the operator's SQL, the test
-- fixture) and the site admin's own groups are approved.

create or replace function public.groups_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.status := 'active';
  new.cover_image_path := null;
  new.needs_owner := false;
  new.review_status := 'approved';
  new.review_reason := '';
  new.reviewed_at := null;

  if auth.uid() is not null
     and coalesce(current_setting('branch.operator_listing', true), '') <> 'on' then
    new.is_unclaimed := false;
    new.source_url := null;
  end if;

  if auth.uid() is not null and not public.is_site_admin() then
    if (select count(*) from public.group_members m
          join public.groups g on g.id = m.group_id
        where m.user_id = auth.uid() and m.role = 'owner'
          and g.status in ('active', 'archived')
          and g.review_status <> 'declined') >= 3 then
      perform public.raise_rule('group_limit', 'You can own at most 3 groups.');
    end if;
    if (select count(*) from public.groups g
        where g.created_by = auth.uid() and g.created_at > now() - interval '7 days') >= 3 then
      perform public.raise_rule('rate_limited', 'You can create at most 3 groups a week.');
    end if;
    if not public.has_approved_group(auth.uid()) then
      new.review_status := 'pending';
    end if;
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- 4. Who can see a group waiting for review
-- ---------------------------------------------------------------------------
-- Listed groups are public as before. A group that isn't approved is also
-- readable by its own owner and page managers; a removed group still only
-- by the site admin. Events and threads follow, since their policies read
-- groups or group_is_visible().

drop policy "Active and archived groups are public" on public.groups;
create policy "Listed groups are public; unlisted ones to their organizers" on public.groups
  for select to anon, authenticated
  using (
    (status in ('active', 'archived') and review_status = 'approved')
    or (status in ('active', 'archived') and public.is_group_admin(id))
    or (select public.is_site_admin())
  );

create or replace function public.group_is_visible(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.groups g
     where g.id = p_group_id and g.status in ('active', 'archived')
       and (g.review_status = 'approved' or public.is_group_admin(g.id))
  )
$$;

-- Active means organizers can act. A declined group is read-only (FR-GR-21).
create or replace function public.group_is_active(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.groups g
     where g.id = p_group_id and g.status = 'active' and g.review_status <> 'declined'
  )
$$;

drop policy "Owner and admins edit active groups" on public.groups;
create policy "Owner and admins edit active groups" on public.groups
  for update to authenticated
  using (
    (public.can_write() and status = 'active' and review_status <> 'declined' and public.is_group_admin(id))
    or (select public.is_site_admin())
  )
  with check (
    (public.can_write() and status = 'active' and review_status <> 'declined' and public.is_group_admin(id))
    or (select public.is_site_admin())
  );

-- ---------------------------------------------------------------------------
-- 5. Nobody joins a group that isn't approved
-- ---------------------------------------------------------------------------

drop policy "Users join or request to join active groups" on public.group_members;
create policy "Users join or request to join active groups" on public.group_members
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_write()
    and role = 'member'
    and status = (
      select case g.join_policy when 'open' then 'active'::public.member_status else 'pending'::public.member_status end
        from public.groups g
       where g.id = group_id and g.status = 'active' and not g.is_unclaimed and g.review_status = 'approved'
    )
  );

create or replace function public.invite_preview(p_token text)
returns table (name text, slug text)
language sql stable security definer set search_path = ''
as $$
  select g.name, g.slug
    from public.groups g
   where g.status = 'active' and not g.is_unclaimed and g.review_status = 'approved'
     and p_token ~ '^[a-f0-9]{64}$'
     and g.id = coalesce(
       (select l.group_id from public.group_invite_links l
         where l.token = p_token and l.revoked_at is null
           and (l.expires_at is null or l.expires_at > now())),
       (select i.group_id from invites.email_invites i
         where i.token = p_token and i.accepted_at is null and i.cancelled_at is null
           and i.expires_at > now()))
$$;

create or replace function public.join_by_invite(p_token text)
returns table (slug text, result text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_group_id uuid;
  v_invite invites.email_invites%rowtype;
  v_group public.groups%rowtype;
  v_member public.group_members%rowtype;
  v_result text := 'joined';
begin
  perform public.require_writer();
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    perform public.raise_rule('invite_invalid', 'That invite is not valid.');
  end if;

  select l.group_id into v_group_id from public.group_invite_links l
   where l.token = p_token and l.revoked_at is null
     and (l.expires_at is null or l.expires_at > now());

  if v_group_id is null then
    select * into v_invite from invites.email_invites i
     where i.token = p_token and i.accepted_at is null and i.cancelled_at is null
       and i.expires_at > now()
     for update;
    if v_invite.id is null then
      perform public.raise_rule('invite_invalid', 'That invite is not valid.');
    end if;
    if v_invite.role = 'admin' and v_invite.email is distinct from
       (select lower(u.email) from auth.users u where u.id = auth.uid()) then
      perform public.raise_rule('invite_wrong_account', 'This invite is for a different email address.');
    end if;
    v_group_id := v_invite.group_id;
  end if;

  select * into v_group from public.groups g where g.id = v_group_id;
  if v_group.status <> 'active' or v_group.is_unclaimed or v_group.review_status <> 'approved' then
    perform public.raise_rule('cannot_join', 'This group is not taking new members.');
  end if;

  select * into v_member from public.group_members m
   where m.group_id = v_group_id and m.user_id = auth.uid();

  if v_member.status = 'banned' then
    perform public.raise_rule('cannot_join', 'You can''t join this group.');
  elsif v_member.status = 'active' then
    v_result := 'already_member';
  elsif v_member.status = 'pending' then
    update public.group_members set status = 'active'
     where group_id = v_group_id and user_id = auth.uid();
  else
    insert into public.group_members (group_id, user_id, role, status)
    values (v_group_id, auth.uid(), 'member', 'active');
  end if;

  if v_invite.id is not null then
    update invites.email_invites set accepted_at = now() where id = v_invite.id;
    if v_invite.role = 'admin' then
      update public.group_members set role = 'admin'
       where group_id = v_group_id and user_id = auth.uid() and role = 'member';
      v_result := 'manager';
    end if;
  end if;

  return query select v_group.slug, v_result;
end
$$;

-- ---------------------------------------------------------------------------
-- 6. Listings leave it out
-- ---------------------------------------------------------------------------
-- The owner can read their own unlisted group, so the views filter it too,
-- or it would show up in their own Communities, browse counts and search.
-- Same columns in the same order; create or replace keeps the grants and
-- security_invoker. Only the WHERE clauses change.

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
  g.source_url,
  g.affinity_tags,
  g.group_type,
  g.cover_image_path,
  g.cover_alt
from public.groups g
join public.subcategories s on s.id = g.subcategory_id
join public.categories c on c.id = s.category_id
where g.review_status = 'approved';

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
where g.status = 'active' and g.review_status = 'approved';

create or replace view public.subcategory_group_counts
with (security_invoker = true) as
select
  c.id as category_id,
  c.slug as category_slug,
  c.name as category_name,
  c.sort_order as category_sort_order,
  s.id as subcategory_id,
  s.slug as subcategory_slug,
  s.name as subcategory_name,
  s.sort_order as subcategory_sort_order,
  (count(g.id) filter (where g.status = 'active' and g.review_status = 'approved'))::integer as group_count
from public.categories c
join public.subcategories s on s.category_id = c.id
left join public.groups g on g.subcategory_id = s.id
group by c.id, s.id;

-- ---------------------------------------------------------------------------
-- 7. The site admin approves or declines (FR-GR-21)
-- ---------------------------------------------------------------------------

create or replace function public.approve_new_group(p_group_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can approve new groups.');
  end if;
  update public.groups
     set review_status = 'approved', review_reason = '', reviewed_at = now()
   where id = p_group_id and review_status = 'pending';
  if not found then
    perform public.raise_rule('not_found', 'No group waiting for review with that id.');
  end if;
  perform public.log_moderation('approve_group', 'group', p_group_id, p_group_id, '');
end
$$;

create or replace function public.decline_new_group(p_group_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can decline new groups.');
  end if;
  if v_reason = '' or char_length(v_reason) > 500 then
    perform public.raise_rule('invalid', 'Give a reason of at most 500 characters.');
  end if;
  update public.groups
     set review_status = 'declined', review_reason = v_reason, reviewed_at = now()
   where id = p_group_id and review_status = 'pending';
  if not found then
    perform public.raise_rule('not_found', 'No group waiting for review with that id.');
  end if;
  perform public.log_moderation('decline_group', 'group', p_group_id, p_group_id, v_reason);
end
$$;

revoke execute on function public.approve_new_group(uuid) from public, anon;
revoke execute on function public.decline_new_group(uuid, text) from public, anon;
grant execute on function public.approve_new_group(uuid) to authenticated;
grant execute on function public.decline_new_group(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Deleting a group that was never listed
-- ---------------------------------------------------------------------------
-- Nothing about it was ever public, so it can simply go: the owner deletes a
-- declined group to start again, and deleting an account takes its pending
-- and declined groups with it (FR-GR-22). Members, events and threads
-- cascade; the moderation log keeps its rows with the group nulled.

create or replace function public.delete_declined_group(p_group_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.is_group_owner(p_group_id) then
    perform public.raise_rule('not_allowed', 'Only the page admin can delete the group.');
  end if;
  delete from public.groups where id = p_group_id and review_status = 'declined';
  if not found then
    perform public.raise_rule('not_found', 'Only a group that wasn''t approved can be deleted.');
  end if;
end
$$;

revoke execute on function public.delete_declined_group(uuid) from public, anon;
grant execute on function public.delete_declined_group(uuid) to authenticated;

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

  -- New in UC-27: groups that were never listed go with the account.
  delete from public.groups g
   where g.review_status <> 'approved'
     and exists (select 1 from public.group_members m
                  where m.group_id = g.id and m.user_id = auth.uid() and m.role = 'owner');

  -- As 20261009000002 from here. Every group they own, whatever state it is
  -- in: a removed one still has to wait for a claim rather than come back
  -- ownerless.
  select coalesce(array_agg(m.group_id), '{}') into v_groups
    from public.group_members m join public.groups g on g.id = m.group_id
   where m.user_id = auth.uid() and m.role = 'owner'
     and g.status in ('active', 'archived', 'removed');

  update public.events set status = 'cancelled'
   where group_id = any (v_groups) and status = 'scheduled' and starts_at > now();

  update public.groups set status = 'archived', needs_owner = true
   where id = any (v_groups) and status in ('active', 'archived');
  update public.groups set needs_owner = true
   where id = any (v_groups) and status = 'removed';

  update public.accounts set deleted_at = now() where id = auth.uid();
  update public.profiles set display_name = null, bio = null, area = null where id = auth.uid();
  delete from public.group_members where user_id = auth.uid() and status <> 'banned';
  delete from public.event_rsvps where user_id = auth.uid();
  delete from public.notification_preferences where user_id = auth.uid();
  delete from public.group_claims where user_id = auth.uid() and status = 'pending';
end
$$;

-- ---------------------------------------------------------------------------
-- 9. Telling the organizer before they submit (FR-GR-22)
-- ---------------------------------------------------------------------------

create or replace function public.first_group_needs_review()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null
     and not public.is_site_admin()
     and not public.has_approved_group(auth.uid())
$$;

revoke execute on function public.first_group_needs_review() from public, anon;
grant execute on function public.first_group_needs_review() to authenticated;
