-- Row-level security policies: docs/roles-and-permissions.md, as SQL.
--
-- Rules for this file:
--   * Every write policy says `to authenticated`. A policy with no `to` clause
--     applies to PUBLIC, which includes the anonymous role (TR-SEC-2).
--   * Where users may change only some columns, the table-wide UPDATE grant is
--     revoked and granted back per column.
--   * Status changes with several rules (approve, ban, archive, remove, pin)
--     have no policy at all; they go through the functions in the previous
--     migration.

-- ---------------------------------------------------------------------------
-- Belt and braces: the anonymous role never writes, and nobody truncates.
-- ---------------------------------------------------------------------------

revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon;
revoke truncate, references, trigger
  on all tables in schema public from authenticated;

-- ---------------------------------------------------------------------------
-- Directory: public read, changed only by migration (FR-AD-1)
-- ---------------------------------------------------------------------------

revoke insert, update, delete on public.regions, public.categories, public.subcategories from authenticated;

create policy "Directory is public" on public.regions
  for select to anon, authenticated using (true);
create policy "Directory is public" on public.categories
  for select to anon, authenticated using (true);
create policy "Directory is public" on public.subcategories
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Profiles and accounts
-- ---------------------------------------------------------------------------

revoke insert, update, delete on public.profiles from authenticated;
grant update (display_name, bio, area) on public.profiles to authenticated;

create policy "Profiles are public" on public.profiles
  for select to anon, authenticated using (true);

create policy "Users edit their own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid() and public.can_write())
  with check (id = auth.uid());

revoke insert, update, delete on public.accounts from authenticated;

create policy "Users see their own account; site admin sees all" on public.accounts
  for select to authenticated
  using (id = auth.uid() or public.is_site_admin());

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------

revoke update, delete on public.groups from authenticated;
grant update (
  name, description, rules, subcategory_id, region_id, area,
  join_policy, join_question, discussions_enabled, cover_image_path
) on public.groups to authenticated;

create policy "Active and archived groups are public" on public.groups
  for select to anon, authenticated
  using (status in ('active', 'archived') or public.is_site_admin());

create policy "Signed-in users create groups" on public.groups
  for insert to authenticated
  with check (public.can_write() and created_by = auth.uid());

create policy "Owner and admins edit active groups" on public.groups
  for update to authenticated
  using (
    (public.can_write() and status = 'active' and public.is_group_admin(id))
    or public.is_site_admin()
  )
  with check (
    (public.can_write() and status = 'active' and public.is_group_admin(id))
    or public.is_site_admin()
  );

-- ---------------------------------------------------------------------------
-- Membership
-- ---------------------------------------------------------------------------

revoke update on public.group_members from authenticated;

create policy "Organizers are public; members see the member list" on public.group_members
  for select to anon, authenticated
  using (
    (role in ('owner', 'admin') and status = 'active')
    or user_id = auth.uid()
    or (status = 'active' and public.is_group_member(group_id))
    or public.is_group_admin(group_id)
    or public.is_site_admin()
  );

-- Joining: open groups make you active, approval groups make you pending.
-- A banned user already has a row, so the primary key refuses a rejoin.
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
      where g.id = group_id and g.status = 'active'
    )
  );

-- Leaving, or cancelling a request. The owner can't leave (FR-MB-3) and a
-- banned user can't delete their ban.
create policy "Members leave; owners must transfer first" on public.group_members
  for delete to authenticated
  using (user_id = auth.uid() and role <> 'owner' and status <> 'banned');

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

revoke update, delete on public.events from authenticated;
grant update (
  title, description, starts_at, ends_at, timezone, location_name,
  address_visibility, capacity, status
) on public.events to authenticated;

create policy "Events of visible groups are public" on public.events
  for select to anon, authenticated
  using (exists (select 1 from public.groups g where g.id = group_id));

create policy "Owner and admins create events" on public.events
  for insert to authenticated
  with check (
    public.can_write()
    and created_by = auth.uid()
    and status = 'scheduled'
    and public.is_group_admin(group_id)
    and public.group_is_active(group_id)
  );

create policy "Owner and admins edit and cancel events" on public.events
  for update to authenticated
  using (
    (public.can_write() and public.is_group_admin(group_id) and public.group_is_active(group_id))
    or public.is_site_admin()
  )
  with check (
    (public.can_write() and public.is_group_admin(group_id) and public.group_is_active(group_id))
    or public.is_site_admin()
  );

-- Members-only addresses (FR-EV-1, PT-6).
create policy "Addresses: public ones to all, members-only ones to members" on public.event_private_details
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and (e.address_visibility = 'public' or public.is_group_member(e.group_id) or public.is_site_admin())
    )
  );

create policy "Owner and admins set addresses" on public.event_private_details
  for insert to authenticated
  with check (
    public.can_write() and exists (
      select 1 from public.events e
      where e.id = event_id and public.is_group_admin(e.group_id) and public.group_is_active(e.group_id)
    )
  );

create policy "Owner and admins change addresses" on public.event_private_details
  for update to authenticated
  using (
    public.can_write() and exists (
      select 1 from public.events e
      where e.id = event_id and public.is_group_admin(e.group_id) and public.group_is_active(e.group_id)
    )
  )
  with check (
    exists (select 1 from public.events e where e.id = event_id and public.is_group_admin(e.group_id))
  );

create policy "Owner and admins clear addresses" on public.event_private_details
  for delete to authenticated
  using (
    public.can_write() and exists (
      select 1 from public.events e where e.id = event_id and public.is_group_admin(e.group_id)
    )
  );

-- ---------------------------------------------------------------------------
-- RSVPs
-- ---------------------------------------------------------------------------

revoke update on public.event_rsvps from authenticated;
grant update (status) on public.event_rsvps to authenticated;

create policy "Members see who is going" on public.event_rsvps
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.events e where e.id = event_id and public.is_group_member(e.group_id))
    or public.is_site_admin()
  );

create policy "Members RSVP to their groups' events" on public.event_rsvps
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_write()
    and exists (
      select 1 from public.events e
      where e.id = event_id and public.is_group_member(e.group_id) and public.group_is_active(e.group_id)
    )
  );

create policy "Members change their own RSVP" on public.event_rsvps
  for update to authenticated
  using (user_id = auth.uid() and public.can_write())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.events e where e.id = event_id and public.is_group_member(e.group_id))
  );

create policy "Members withdraw their own RSVP" on public.event_rsvps
  for delete to authenticated
  using (user_id = auth.uid() and public.can_write());

-- ---------------------------------------------------------------------------
-- Discussions (FR-DS-*). Members only, and only while discussions are on.
-- ---------------------------------------------------------------------------

revoke update, delete on public.threads from authenticated;
grant update (title, body) on public.threads to authenticated;

create policy "Members read their groups' threads" on public.threads
  for select to authenticated
  using (public.is_group_member(group_id) or public.is_site_admin());

create policy "Members start threads while discussions are on" on public.threads
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.can_write()
    and public.is_group_member(group_id)
    and public.group_discussions_open(group_id)
  );

create policy "Authors edit their own visible threads" on public.threads
  for update to authenticated
  using (
    author_id = auth.uid() and status = 'visible'
    and public.can_write() and public.group_discussions_open(group_id)
  )
  with check (author_id = auth.uid() and status = 'visible');

revoke update, delete on public.replies from authenticated;
grant update (body) on public.replies to authenticated;

create policy "Members read replies in threads they can read" on public.replies
  for select to authenticated
  using (exists (select 1 from public.threads t where t.id = thread_id));

create policy "Members reply to open threads while discussions are on" on public.replies
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.can_write()
    and exists (
      select 1 from public.threads t
      where t.id = thread_id
        and t.status = 'visible'
        and not t.is_locked
        and public.is_group_member(t.group_id)
        and public.group_discussions_open(t.group_id)
    )
  );

create policy "Authors edit their own visible replies" on public.replies
  for update to authenticated
  using (
    author_id = auth.uid() and status = 'visible' and public.can_write()
    and exists (
      select 1 from public.threads t
      where t.id = thread_id and public.group_discussions_open(t.group_id)
    )
  )
  with check (author_id = auth.uid() and status = 'visible');

-- ---------------------------------------------------------------------------
-- Moderation
-- ---------------------------------------------------------------------------

revoke update, delete on public.reports from authenticated;

create policy "Signed-in users report content" on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and public.can_write());

create policy "Reports reach the group's admins and the site admin" on public.reports
  for select to authenticated
  using (
    public.is_site_admin()
    or (group_id is not null and public.is_group_admin(group_id))
    or reporter_id = auth.uid()
  );

revoke insert, update, delete on public.moderation_actions from authenticated;

create policy "Site admin reads the moderation log" on public.moderation_actions
  for select to authenticated
  using (public.is_site_admin());

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create policy "Users manage their own email settings" on public.notification_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- email_log: no policies. Only server-side jobs (service role) touch it.
revoke all on public.email_log from anon, authenticated;
