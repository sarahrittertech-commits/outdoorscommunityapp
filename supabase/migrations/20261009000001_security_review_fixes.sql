-- Fixes from the 8 October 2026 code review.
--
-- 1. Removed groups stay hidden. The groups policy already hides them, but
--    the member list, RSVPs and threads checked membership only, so members
--    of a removed group could still read them, and visitors could still read
--    its organizers.
-- 2. Join answers are for organizers only (FR-MB-9). They were readable by
--    anyone who could read the membership row.
-- 3. The limits hold under concurrent requests and can't be backdated. Two
--    requests at the same moment could each count "2 groups" and both
--    succeed, and a client could send an old created_at to fall outside the
--    rate-limit window.

-- ---------------------------------------------------------------------------
-- 1. Removed groups
-- ---------------------------------------------------------------------------

-- Active or archived: the groups anyone can see.
create or replace function public.group_is_visible(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.groups g where g.id = p_group_id and g.status in ('active', 'archived')
  )
$$;

-- Visitors' queries evaluate it too; it only says whether a group is listed.
revoke execute on function public.group_is_visible(uuid) from public;
grant execute on function public.group_is_visible(uuid) to anon, authenticated;

drop policy "Organizers are public; members see the member list" on public.group_members;
create policy "Organizers are public; members see the member list" on public.group_members
  for select to anon, authenticated
  using (
    user_id = auth.uid()
    or public.is_site_admin()
    or (
      public.group_is_visible(group_id)
      and (
        (role in ('owner', 'admin') and status = 'active')
        or (status = 'active' and public.is_group_member(group_id))
        or public.is_group_admin(group_id)
      )
    )
  );

drop policy "Members see who is going" on public.event_rsvps;
create policy "Members see who is going" on public.event_rsvps
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.events e
      where e.id = event_id and public.is_group_member(e.group_id) and public.group_is_visible(e.group_id)
    )
    or public.is_site_admin()
  );

-- Replies follow: their policy reads threads, which applies this one.
drop policy "Members read their groups' threads" on public.threads;
create policy "Members read their groups' threads" on public.threads
  for select to authenticated
  using (
    (public.is_group_member(group_id) and public.group_is_visible(group_id))
    or public.is_site_admin()
  );

-- ---------------------------------------------------------------------------
-- 2. Join answers
-- ---------------------------------------------------------------------------
-- Every column of group_members except join_answer stays readable under the
-- policy above. Organizers read answers through join_answers().

revoke select on public.group_members from anon, authenticated;
grant select (group_id, user_id, role, status, created_at, updated_at)
  on public.group_members to anon, authenticated;

create or replace function public.join_answers(p_group_id uuid)
returns table (user_id uuid, join_answer text)
language sql stable security definer set search_path = ''
as $$
  select m.user_id, m.join_answer
  from public.group_members m
  where m.group_id = p_group_id
    and m.status = 'pending'
    and m.join_answer is not null
    and (public.is_group_admin(p_group_id) or public.is_site_admin())
$$;

revoke execute on function public.join_answers(uuid) from public, anon;

-- ---------------------------------------------------------------------------
-- 3. Limits
-- ---------------------------------------------------------------------------
-- Runs before the limit triggers (triggers fire in name order). The lock is
-- per person and held to the end of the transaction, so a second request
-- from the same person waits and then counts the first one. created_at is
-- always the server's clock.

create or replace function public.before_insert_limit_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null then
    perform pg_advisory_xact_lock(hashtextextended('limits:' || auth.uid()::text, 0));
  end if;
  new.created_at := now();
  return new;
end
$$;

revoke execute on function public.before_insert_limit_guard() from public, anon, authenticated;

create trigger a_limit_guard before insert on public.groups
  for each row execute function public.before_insert_limit_guard();
create trigger a_limit_guard before insert on public.group_members
  for each row execute function public.before_insert_limit_guard();
create trigger a_limit_guard before insert on public.threads
  for each row execute function public.before_insert_limit_guard();
create trigger a_limit_guard before insert on public.replies
  for each row execute function public.before_insert_limit_guard();
create trigger a_limit_guard before insert on public.reports
  for each row execute function public.before_insert_limit_guard();
