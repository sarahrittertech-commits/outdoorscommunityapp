-- UC-33, approved 10 October 2026: tell people about yourself (FR-PR-1 to
-- FR-PR-10).
--
-- An *About me* profile: a small photo, home town, blurb, activities,
-- fill-in-the-blanks, this year's adventure goals and the groups a member is
-- in. Each section can be shown or hidden by its owner.
--
-- Who sees more than a display name (Sarah's decision, 10 October 2026; it
-- replaces the draft's "signed-in members only" and may change after user
-- testing):
--   1. the member themselves, and the site admin;
--   2. everyone, signed out included, when the member is an active page
--      admin or page manager of a listed group;
--   3. organizers of a group the member belongs to or has asked to join;
--   4. if the member opts in (share_with_members, off by default), any
--      signed-in member of an active group they are both in;
--   5. nobody else: they get the display name only.
-- Show/Hide applies on top: a hidden section is read by its owner only.
--
-- profiles stays readable by everyone (display names appear on every post),
-- so its private columns move out: bio and area become profile_about.bio
-- and profile_about.town, and profiles.bio and profiles.area are dropped.
-- profile_about is readable by its owner only; everyone else reads it
-- through profile_card(), which leaves out what they may not see.

-- ---------------------------------------------------------------------------
-- 1. The tables
-- ---------------------------------------------------------------------------

create table public.profile_about (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- FR-PR-2: a town from the board's town list (checked by the app); older
  -- free-text areas are kept here until the member picks a town.
  town text check (town is null or (char_length(btrim(town)) between 1 and 80 and town !~ '[[:cntrl:]]')),
  -- The blurb (FR-AC-3's bio).
  bio text check (bio is null or (char_length(btrim(bio)) between 1 and 280 and char_length(bio) <= 280)),
  -- FR-PR-1: profile-photos/<user_id>/<random>.webp, and its description.
  photo_path text unique,
  photo_alt text check (photo_alt is null or (char_length(btrim(photo_alt)) between 1 and 200 and char_length(photo_alt) <= 200)),
  -- FR-PR-10: off by default.
  share_with_members boolean not null default false,
  -- FR-PR-7: Show or Hide, per section.
  show_photo boolean not null default true,
  show_town boolean not null default true,
  show_bio boolean not null default true,
  show_activities boolean not null default true,
  show_prompts boolean not null default true,
  show_goals boolean not null default true,
  show_groups boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint profile_about_photo_in_own_folder check (
    photo_path is null or photo_path ~ ('^' || user_id::text || '/[A-Za-z0-9_-]{8,64}\.webp$')
  ),
  constraint profile_about_photo_needs_alt check (photo_path is null or photo_alt is not null)
);

-- FR-PR-3: only real activity categories.
create table public.profile_activities (
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

-- FR-PR-4: up to 3 answers. The prompts themselves live in
-- src/config/site.ts so a copy of the board can have its own; the database
-- checks the key's shape and the answer.
create table public.profile_prompts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  prompt_key text not null check (prompt_key ~ '^[a-z][a-z0-9_]{1,39}$'),
  answer text not null check (char_length(btrim(answer)) between 1 and 60 and char_length(answer) <= 60 and answer !~ '[[:cntrl:]]'),
  position smallint not null default 1 check (position between 1 and 3),
  created_at timestamptz not null default now(),
  primary key (user_id, prompt_key)
);

-- FR-PR-5: up to 10 goals a year. The year is the server's (UTC), set on
-- insert; earlier years are read-only and readable by their owner only.
create table public.profile_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  year smallint not null,
  position smallint not null check (position between 1 and 10),
  body text not null check (char_length(btrim(body)) between 1 and 100 and char_length(body) <= 100 and body !~ '[[:cntrl:]]'),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, year, position)
);

create index profile_activities_category_idx on public.profile_activities (category_id);

-- ---------------------------------------------------------------------------
-- 2. Moving bio and area out of the public profiles table
-- ---------------------------------------------------------------------------

insert into public.profile_about (user_id, town, bio)
select p.id,
       nullif(btrim(regexp_replace(p.area, '[[:cntrl:]]', ' ', 'g')), ''),
       nullif(btrim(p.bio), '')
from public.profiles p
where nullif(btrim(p.area), '') is not null or nullif(btrim(p.bio), '') is not null;

alter table public.profiles drop column bio, drop column area;

-- ---------------------------------------------------------------------------
-- 3. Who may see what
-- ---------------------------------------------------------------------------

-- The current year for adventure goals: the server's, in UTC.
create or replace function public.profile_goal_year()
returns smallint
language sql stable set search_path = ''
as $$
  select extract(year from now() at time zone 'UTC')::smallint
$$;

revoke execute on function public.profile_goal_year() from public;
grant execute on function public.profile_goal_year() to anon, authenticated;

-- True when the caller may see more of p_user's profile than the display
-- name: the five rules at the top of this file. SECURITY DEFINER so it can
-- read memberships and the opt-in that the caller can't; it returns only
-- true or false.
create or replace function public.can_view_profile(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(p_user is not null and (
    -- 1. themselves, and the site admin
    p_user = auth.uid()
    or public.is_site_admin()
    -- 2. page admins and page managers of a listed group are public
    or exists (
      select 1 from public.group_members m join public.groups g on g.id = m.group_id
      where m.user_id = p_user and m.status = 'active' and m.role in ('owner', 'admin')
        and g.status in ('active', 'archived') and g.review_status = 'approved'
    )
    -- 3. organizers of a group they are in or have asked to join
    or (auth.uid() is not null and exists (
      select 1 from public.group_members m
      join public.group_members o on o.group_id = m.group_id
      join public.groups g on g.id = m.group_id
      where m.user_id = p_user and m.status in ('active', 'pending')
        and o.user_id = auth.uid() and o.status = 'active' and o.role in ('owner', 'admin')
        and g.status = 'active' and g.review_status <> 'declined'
    ))
    -- 4. opted in: members of an active group they are both in
    or (auth.uid() is not null
        and exists (select 1 from public.profile_about a where a.user_id = p_user and a.share_with_members)
        and exists (
          select 1 from public.group_members m
          join public.group_members o on o.group_id = m.group_id
          join public.groups g on g.id = m.group_id
          where m.user_id = p_user and m.status = 'active'
            and o.user_id = auth.uid() and o.status = 'active'
            and g.status = 'active' and g.review_status <> 'declined'
        ))
  ), false)
$$;

revoke execute on function public.can_view_profile(uuid) from public;
grant execute on function public.can_view_profile(uuid) to anon, authenticated;

-- True when the caller may see one section of p_user's profile: always for
-- the owner; otherwise can_view_profile() and the owner's Show setting.
-- A hidden section is read by its owner only, not even the site admin.
create or replace function public.profile_section_visible(p_user uuid, p_section text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_user is null then false
    when p_user = auth.uid() then p_section in ('photo', 'town', 'bio', 'activities', 'prompts', 'goals', 'groups')
    when not public.can_view_profile(p_user) then false
    else coalesce(
      (select case p_section
                when 'photo' then a.show_photo
                when 'town' then a.show_town
                when 'bio' then a.show_bio
                when 'activities' then a.show_activities
                when 'prompts' then a.show_prompts
                when 'goals' then a.show_goals
                when 'groups' then a.show_groups
                else false
              end
         from public.profile_about a where a.user_id = p_user),
      p_section in ('photo', 'town', 'bio', 'activities', 'prompts', 'goals', 'groups'))
  end
$$;

revoke execute on function public.profile_section_visible(uuid, text) from public;
grant execute on function public.profile_section_visible(uuid, text) to anon, authenticated;

-- The one-row parts of a profile, as the caller may see them: a hidden or
-- unseeable section comes back null. could_see_more is true only for a
-- signed-out visitor who could see more by signing in (the member shares
-- their profile with the members of an active group they are in).
create or replace function public.profile_card(p_user uuid)
returns table (
  can_view boolean,
  could_see_more boolean,
  town text,
  bio text,
  photo_path text,
  photo_alt text,
  show_groups boolean
)
language sql stable security definer set search_path = ''
as $$
  with v as (select public.can_view_profile(p_user) as ok)
  select
    v.ok,
    (not v.ok and auth.uid() is null and coalesce(a.share_with_members, false) and exists (
      select 1 from public.group_members m join public.groups g on g.id = m.group_id
      where m.user_id = p_user and m.status = 'active' and g.status = 'active' and g.review_status = 'approved'
    )),
    case when public.profile_section_visible(p_user, 'town') then a.town end,
    case when public.profile_section_visible(p_user, 'bio') then a.bio end,
    case when public.profile_section_visible(p_user, 'photo') then a.photo_path end,
    case when public.profile_section_visible(p_user, 'photo') then a.photo_alt end,
    public.profile_section_visible(p_user, 'groups')
  from v left join public.profile_about a on a.user_id = p_user
$$;

revoke execute on function public.profile_card(uuid) from public;
grant execute on function public.profile_card(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Row-level security. Owners write their own rows with a writable
-- account; the anonymous role never writes.
-- ---------------------------------------------------------------------------

alter table public.profile_about enable row level security;
alter table public.profile_activities enable row level security;
alter table public.profile_prompts enable row level security;
alter table public.profile_goals enable row level security;

revoke all on public.profile_about, public.profile_activities, public.profile_prompts, public.profile_goals from anon;
revoke all on public.profile_about, public.profile_activities, public.profile_prompts, public.profile_goals from authenticated;

grant select on public.profile_activities, public.profile_prompts, public.profile_goals to anon, authenticated;
grant select on public.profile_about to authenticated;

grant insert (user_id, town, bio, photo_path, photo_alt, share_with_members,
              show_photo, show_town, show_bio, show_activities, show_prompts, show_goals, show_groups)
  on public.profile_about to authenticated;
grant update (town, bio, photo_path, photo_alt, share_with_members,
              show_photo, show_town, show_bio, show_activities, show_prompts, show_goals, show_groups)
  on public.profile_about to authenticated;
grant insert (user_id, category_id), delete on public.profile_activities to authenticated;
grant insert (user_id, prompt_key, answer, position), update (answer, position), delete on public.profile_prompts to authenticated;
grant insert (user_id, position, body, done), update (position, body, done), delete on public.profile_goals to authenticated;

-- profile_about: the owner only. Others read it through profile_card().
create policy "Owners read their about row" on public.profile_about
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Owners add their about row" on public.profile_about
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_write());
create policy "Owners edit their about row" on public.profile_about
  for update to authenticated
  using (user_id = (select auth.uid()) and public.can_write())
  with check (user_id = (select auth.uid()));

create policy "Activities follow the profile's visibility" on public.profile_activities
  for select to anon, authenticated
  using (user_id = (select auth.uid()) or public.profile_section_visible(user_id, 'activities'));
create policy "Owners add activities" on public.profile_activities
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_write());
create policy "Owners remove activities" on public.profile_activities
  for delete to authenticated
  using (user_id = (select auth.uid()) and public.can_write());

create policy "Prompts follow the profile's visibility" on public.profile_prompts
  for select to anon, authenticated
  using (user_id = (select auth.uid()) or public.profile_section_visible(user_id, 'prompts'));
create policy "Owners add prompts" on public.profile_prompts
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_write());
create policy "Owners edit prompts" on public.profile_prompts
  for update to authenticated
  using (user_id = (select auth.uid()) and public.can_write())
  with check (user_id = (select auth.uid()));
create policy "Owners remove prompts" on public.profile_prompts
  for delete to authenticated
  using (user_id = (select auth.uid()) and public.can_write());

-- Earlier years: owner only, and read-only.
create policy "This year's goals follow the profile's visibility" on public.profile_goals
  for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (year = (select public.profile_goal_year()) and public.profile_section_visible(user_id, 'goals'))
  );
create policy "Owners add this year's goals" on public.profile_goals
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_write());
create policy "Owners edit this year's goals" on public.profile_goals
  for update to authenticated
  using (user_id = (select auth.uid()) and public.can_write() and year = (select public.profile_goal_year()))
  with check (user_id = (select auth.uid()));
create policy "Owners remove this year's goals" on public.profile_goals
  for delete to authenticated
  using (user_id = (select auth.uid()) and public.can_write() and year = (select public.profile_goal_year()));

-- ---------------------------------------------------------------------------
-- 5. Limits (server time, per-person lock from a_limit_guard). These run as
-- the caller, who can see all of their own rows, so they raise directly
-- rather than through raise_rule().
-- ---------------------------------------------------------------------------

create or replace function public.profile_prompts_before_insert()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (select count(*) from public.profile_prompts p where p.user_id = new.user_id) >= 3 then
    raise exception using errcode = 'P0001', message = 'prompts_full: Answer at most 3 fill-in-the-blanks.';
  end if;
  return new;
end
$$;

revoke execute on function public.profile_prompts_before_insert() from public, anon, authenticated;

create or replace function public.profile_goals_before_insert()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.year := public.profile_goal_year();
  if (select count(*) from public.profile_goals g
      where g.user_id = new.user_id and g.year = new.year) >= 10 then
    raise exception using errcode = 'P0001', message = 'goals_full: Add at most 10 adventure goals a year.';
  end if;
  return new;
end
$$;

revoke execute on function public.profile_goals_before_insert() from public, anon, authenticated;

create trigger a_limit_guard before insert on public.profile_prompts
  for each row execute function public.before_insert_limit_guard();
create trigger profile_prompts_before_insert before insert on public.profile_prompts
  for each row execute function public.profile_prompts_before_insert();
create trigger a_limit_guard before insert on public.profile_goals
  for each row execute function public.before_insert_limit_guard();
create trigger profile_goals_before_insert before insert on public.profile_goals
  for each row execute function public.profile_goals_before_insert();

create or replace function public.profile_about_before_write()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

revoke execute on function public.profile_about_before_write() from public, anon, authenticated;

create trigger profile_about_before_write before insert or update on public.profile_about
  for each row execute function public.profile_about_before_write();

-- ---------------------------------------------------------------------------
-- 6. Saving the profile form in one go. Runs as the caller, so every write
-- above is checked by the same policies and limits; one transaction, so a
-- refused part saves nothing.
-- ---------------------------------------------------------------------------

create or replace function public.save_about_me(
  p_display_name text,
  p_town text,
  p_bio text,
  p_share_with_members boolean,
  p_hidden text[],
  p_category_ids uuid[],
  p_prompt_keys text[],
  p_prompt_answers text[],
  p_goal_bodies text[],
  p_goal_done boolean[]
)
returns void
language plpgsql set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_hidden text[] := coalesce(p_hidden, '{}');
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_signed_in: Sign in first.';
  end if;
  if not public.can_write() then
    raise exception using errcode = 'P0001', message = 'not_allowed: Your account cannot make changes right now.';
  end if;
  if coalesce(array_length(p_prompt_keys, 1), 0) <> coalesce(array_length(p_prompt_answers, 1), 0)
     or coalesce(array_length(p_goal_bodies, 1), 0) <> coalesce(array_length(p_goal_done, 1), 0) then
    raise exception using errcode = 'P0001', message = 'invalid: The form was incomplete.';
  end if;
  if char_length(btrim(coalesce(p_display_name, ''))) < 2 then
    raise exception using errcode = 'P0001', message = 'invalid: Your display name is required.';
  end if;

  update public.profiles set display_name = btrim(p_display_name) where id = v_uid;

  insert into public.profile_about as a (
    user_id, town, bio, share_with_members,
    show_photo, show_town, show_bio, show_activities, show_prompts, show_goals, show_groups)
  values (
    v_uid, nullif(btrim(p_town), ''), nullif(btrim(p_bio), ''), coalesce(p_share_with_members, false),
    not 'photo' = any (v_hidden), not 'town' = any (v_hidden), not 'bio' = any (v_hidden),
    not 'activities' = any (v_hidden), not 'prompts' = any (v_hidden), not 'goals' = any (v_hidden),
    not 'groups' = any (v_hidden))
  on conflict (user_id) do update set
    town = excluded.town, bio = excluded.bio, share_with_members = excluded.share_with_members,
    show_photo = excluded.show_photo, show_town = excluded.show_town, show_bio = excluded.show_bio,
    show_activities = excluded.show_activities, show_prompts = excluded.show_prompts,
    show_goals = excluded.show_goals, show_groups = excluded.show_groups;

  delete from public.profile_activities where user_id = v_uid;
  insert into public.profile_activities (user_id, category_id)
  select distinct v_uid, c from unnest(coalesce(p_category_ids, '{}')) as c;

  delete from public.profile_prompts where user_id = v_uid;
  insert into public.profile_prompts (user_id, prompt_key, answer, position)
  select v_uid, k, btrim(a), (row_number() over (order by n))::smallint
  from unnest(coalesce(p_prompt_keys, '{}'), coalesce(p_prompt_answers, '{}')) with ordinality as x (k, a, n)
  where nullif(btrim(coalesce(a, '')), '') is not null
  order by n;

  delete from public.profile_goals where user_id = v_uid and year = public.profile_goal_year();
  insert into public.profile_goals (user_id, position, body, done)
  select v_uid, (row_number() over (order by n))::smallint, btrim(b), coalesce(d, false)
  from unnest(coalesce(p_goal_bodies, '{}'), coalesce(p_goal_done, '{}')) with ordinality as x (b, d, n)
  where nullif(btrim(coalesce(b, '')), '') is not null
  order by n;
end
$$;

revoke execute on function public.save_about_me(text, text, text, boolean, text[], uuid[], text[], text[], text[], boolean[])
  from public, anon;
grant execute on function public.save_about_me(text, text, text, boolean, text[], uuid[], text[], text[], text[], boolean[])
  to authenticated;

-- ---------------------------------------------------------------------------
-- 7. FR-PR-9: the site admin clears a section or removes the photo, logged
-- in the moderation log with what was removed. Returns the photo's path, if
-- it was the photo, so the app can delete the file through the Storage API.
-- ---------------------------------------------------------------------------

create or replace function public.clear_profile_section(p_user uuid, p_section text, p_reason text default '')
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_about public.profile_about%rowtype;
  v_snapshot jsonb;
  v_path text;
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can clear part of someone''s profile.');
  end if;
  select * into v_about from public.profile_about where user_id = p_user;

  case p_section
    when 'photo' then
      v_snapshot := jsonb_build_object('path', v_about.photo_path, 'alt', v_about.photo_alt);
      v_path := v_about.photo_path;
      update public.profile_about set photo_path = null, photo_alt = null where user_id = p_user;
    when 'town' then
      v_snapshot := jsonb_build_object('town', v_about.town);
      update public.profile_about set town = null where user_id = p_user;
    when 'bio' then
      v_snapshot := jsonb_build_object('bio', v_about.bio);
      update public.profile_about set bio = null where user_id = p_user;
    when 'activities' then
      select jsonb_build_object('activities', coalesce(jsonb_agg(c.slug), '[]'::jsonb)) into v_snapshot
        from public.profile_activities pa join public.categories c on c.id = pa.category_id where pa.user_id = p_user;
      delete from public.profile_activities where user_id = p_user;
    when 'prompts' then
      select jsonb_build_object('prompts', coalesce(jsonb_object_agg(p.prompt_key, p.answer), '{}'::jsonb)) into v_snapshot
        from public.profile_prompts p where p.user_id = p_user;
      delete from public.profile_prompts where user_id = p_user;
    when 'goals' then
      select jsonb_build_object('goals', coalesce(jsonb_agg(g.body order by g.position), '[]'::jsonb)) into v_snapshot
        from public.profile_goals g where g.user_id = p_user and g.year = public.profile_goal_year();
      delete from public.profile_goals where user_id = p_user and year = public.profile_goal_year();
    else
      perform public.raise_rule('invalid', 'No such section.');
  end case;

  perform public.log_moderation('remove_content', 'profile', p_user, null, left(coalesce(p_reason, ''), 500),
    v_snapshot || jsonb_build_object('section', p_section));
  return v_path;
end
$$;

revoke execute on function public.clear_profile_section(uuid, text, text) from public, anon;
grant execute on function public.clear_profile_section(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Functions that wrote profiles.bio and profiles.area
-- ---------------------------------------------------------------------------

-- As 20261009000002, with the blurb and town written to profile_about.
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
  if char_length(btrim(coalesce(p_display_name, ''))) < 2
     or char_length(btrim(p_display_name)) > 40 then
    perform public.raise_rule('invalid', 'Enter a display name of 2 to 40 characters.');
  end if;

  update public.profiles set display_name = btrim(p_display_name) where id = auth.uid();

  if nullif(btrim(p_bio), '') is not null or nullif(btrim(p_area), '') is not null then
    insert into public.profile_about (user_id, town, bio)
    values (auth.uid(), nullif(btrim(p_area), ''), nullif(btrim(p_bio), ''))
    on conflict (user_id) do update
      set town = coalesce(excluded.town, public.profile_about.town),
          bio = coalesce(excluded.bio, public.profile_about.bio);
  end if;

  update public.accounts
     set accepted_terms_at = coalesce(accepted_terms_at, now())
   where id = auth.uid();
end
$$;

-- As 20261010000012, plus the About me sections. The photo file is removed
-- by the app, as the member, before this runs.
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

  delete from public.groups g
   where g.review_status <> 'approved'
     and exists (select 1 from public.group_members m
                  where m.group_id = g.id and m.user_id = auth.uid() and m.role = 'owner');

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
  update public.profiles set display_name = null where id = auth.uid();
  delete from public.profile_about where user_id = auth.uid();
  delete from public.profile_activities where user_id = auth.uid();
  delete from public.profile_prompts where user_id = auth.uid();
  delete from public.profile_goals where user_id = auth.uid();
  delete from public.group_members where user_id = auth.uid() and status <> 'banned';
  delete from public.event_rsvps where user_id = auth.uid();
  delete from public.notification_preferences where user_id = auth.uid();
  delete from public.group_claims where user_id = auth.uid() and status = 'pending';
end
$$;

-- ---------------------------------------------------------------------------
-- 9. The profile-photos bucket (TR-SEC-12). PRIVATE: pages show the photo
-- through a short-lived signed URL created as the viewer, so reading the
-- file needs the same right as seeing the photo section. Only the app's
-- re-encoded 320px WebP goes in, at <user_id>/<random>.webp, into the
-- member's own folder, which holds at most 3 files (the new photo is
-- uploaded before the old one is removed).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 1048576, array['image/webp'])
on conflict (id) do nothing;

-- True when the caller may read this file: it is someone's current photo
-- and the caller may see their photo section.
create or replace function public.can_view_profile_photo_file(p_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profile_about a
    where a.photo_path = p_name and public.profile_section_visible(a.user_id, 'photo')
  )
$$;

revoke execute on function public.can_view_profile_photo_file(text) from public;
grant execute on function public.can_view_profile_photo_file(text) to anon, authenticated;

-- How many files the caller's own folder holds. Runs as the caller, who can
-- see their own folder.
create or replace function public.profile_photo_file_count()
returns integer
language sql stable set search_path = ''
as $$
  select count(*)::integer from storage.objects o
  where o.bucket_id = 'profile-photos'
    and (storage.foldername(o.name))[1] = (select auth.uid())::text
$$;

revoke execute on function public.profile_photo_file_count() from public, anon;
grant execute on function public.profile_photo_file_count() to authenticated;

create policy "Profile photos follow the profile's visibility" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'profile-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text
         or public.can_view_profile_photo_file(name))
  );

create policy "Members upload their own profile photo" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and name ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{8,64}\.webp$'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.can_write()
    and public.profile_photo_file_count() < 3
  );

create policy "Members delete their own profile photo; the site admin any" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (((storage.foldername(name))[1] = (select auth.uid())::text and public.can_write())
         or (select public.is_site_admin()))
  );
