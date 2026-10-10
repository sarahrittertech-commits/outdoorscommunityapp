-- UC-21, approved 9 October 2026: share trip photos.
--
--   FR-GR-12  a Photos page per group: members upload up to 10 at a time,
--             each re-encoded to WebP with required alt text; members only,
--             unless the page admin makes the gallery public
--   FR-GR-13  the uploader deletes their own photos; the page admin and
--             managers remove any (logged as moderation); photos can be
--             reported and the report reaches the group's organizers
--
-- Guardrails from the 8 October decision (PRD): inside a group only,
-- members-only by default, images re-encoded, uploader and organizers can
-- remove, reportable. Archived groups are read-only.
--
-- Limits (TR-SEC-12): at most 200 photos in a group's gallery, and at most
-- 20 uploads per member per group per day (deleted photos still count
-- toward the day). The bucket takes WebP only, at most 5 MB a file.

-- ---------------------------------------------------------------------------
-- 1. A photo can be reported (FR-MD-1). The new value is used only inside
-- plpgsql bodies below, which are checked when they run, so it can be added
-- in the same migration.
-- ---------------------------------------------------------------------------

alter type public.report_target add value if not exists 'photo';

-- ---------------------------------------------------------------------------
-- 2. The gallery's visibility. Members only unless the page admin turns it
-- public with set_group_photos_public(); not in the groups column grant, so
-- managers can't change it with a plain update.
-- ---------------------------------------------------------------------------

alter table public.groups add column photos_public boolean not null default false;

-- ---------------------------------------------------------------------------
-- 3. The photos. A file lives at group-photos/<group_id>/<uploader_id>/<random>.webp,
-- so the storage policies can tell whose file it is from the path alone.
-- status: visible; deleted (by the uploader); removed (by an organizer).
-- Rows are kept after deletion so the daily limit can't be reset by deleting.
-- ---------------------------------------------------------------------------

create table public.group_photos (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  -- Kept, nameless, if the uploader deletes their account.
  uploader_id uuid references public.profiles (id) on delete set null,
  path text not null unique,
  alt text not null check (char_length(btrim(alt)) between 1 and 200 and char_length(alt) <= 200),
  status text not null default 'visible' check (status in ('visible', 'deleted', 'removed')),
  created_at timestamptz not null default now(),
  constraint group_photos_path_check check (
    path ~ ('^' || group_id::text || '/' || coalesce(uploader_id::text, '[0-9a-f-]{36}') || '/[A-Za-z0-9_-]{8,64}\.webp$')
  )
);

create index group_photos_gallery_idx on public.group_photos (group_id, created_at desc) where status = 'visible';
create index group_photos_uploader_idx on public.group_photos (uploader_id, group_id, created_at);

-- True when the caller may see a group's photos: a visible group (active or
-- archived) whose gallery is public, or of which they are a member; or the
-- site admin. Visitors' queries evaluate it, so anon can call it.
create or replace function public.can_view_group_photos(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_site_admin()
      or exists (
        select 1 from public.groups g
        where g.id = p_group_id
          and g.status in ('active', 'archived')
          and (g.photos_public or public.is_group_member(g.id))
      )
$$;

revoke execute on function public.can_view_group_photos(uuid) from public;
grant execute on function public.can_view_group_photos(uuid) to anon, authenticated;

-- True when the caller may add photos: a writable account and an active
-- member of an active group.
create or replace function public.can_add_group_photo(p_group_id uuid)
returns boolean
language sql stable set search_path = ''
as $$
  select public.can_write() and public.is_group_member(p_group_id) and public.group_is_active(p_group_id)
$$;

revoke execute on function public.can_add_group_photo(uuid) from public, anon;
grant execute on function public.can_add_group_photo(uuid) to authenticated;

alter table public.group_photos enable row level security;

revoke all on public.group_photos from anon;
revoke insert, update, delete on public.group_photos from authenticated;
grant select on public.group_photos to anon, authenticated;
-- Status changes only through remove_group_photo(). Nobody updates or
-- deletes directly.
grant insert (group_id, uploader_id, path, alt) on public.group_photos to authenticated;

create policy "Members and public galleries see visible photos" on public.group_photos
  for select to anon, authenticated
  using (
    (status = 'visible' and public.can_view_group_photos(group_id))
    or (select public.is_site_admin())
  );

create policy "Members add photos as themselves" on public.group_photos
  for insert to authenticated
  with check (uploader_id = (select auth.uid()) and public.can_add_group_photo(group_id));

-- Limits, with server time and a per-group lock so two members uploading at
-- once can't both take the 200th place. a_limit_guard (per person) runs first.
create or replace function public.group_photos_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('photos:' || new.group_id::text, 0));
  new.status := 'visible';
  new.created_at := now();
  if (select count(*) from public.group_photos p
      where p.group_id = new.group_id and p.status = 'visible') >= 200 then
    raise exception using errcode = 'P0001', message = 'gallery_full: A group''s gallery holds at most 200 photos.';
  end if;
  if (select count(*) from public.group_photos p
      where p.group_id = new.group_id and p.uploader_id = new.uploader_id
        and p.created_at > now() - interval '1 day') >= 20 then
    raise exception using errcode = 'P0001', message = 'rate_limited: You can add at most 20 photos to a group a day.';
  end if;
  return new;
end
$$;

revoke execute on function public.group_photos_before_insert() from public, anon, authenticated;

create trigger a_limit_guard before insert on public.group_photos
  for each row execute function public.before_insert_limit_guard();
create trigger group_photos_before_insert before insert on public.group_photos
  for each row execute function public.group_photos_before_insert();

-- ---------------------------------------------------------------------------
-- 4. Removing (FR-GR-13). The uploader deletes their own photo while the
-- group is active; the page admin, managers and the site admin remove any,
-- logged as moderation with the photo's details. Returns the file's path so
-- the app can remove the file, as the same user, through the Storage API.
-- ---------------------------------------------------------------------------

create or replace function public.remove_group_photo(p_photo_id uuid, p_reason text default '')
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_photo public.group_photos%rowtype;
begin
  perform public.require_writer();
  select * into v_photo from public.group_photos where id = p_photo_id and status = 'visible';
  if not found then
    perform public.raise_rule('not_found', 'No such photo.');
  end if;

  if v_photo.uploader_id = auth.uid() and public.group_is_active(v_photo.group_id) then
    update public.group_photos set status = 'deleted' where id = p_photo_id;
  elsif public.can_moderate(v_photo.group_id) then
    update public.group_photos set status = 'removed' where id = p_photo_id;
    perform public.log_moderation('remove_content', 'photo', p_photo_id, v_photo.group_id, left(coalesce(p_reason, ''), 500),
      jsonb_build_object('path', v_photo.path, 'alt', v_photo.alt, 'uploader_id', v_photo.uploader_id));
  else
    perform public.raise_rule('not_allowed', 'Only the person who added a photo or the group''s organizers can remove it.');
  end if;
  return v_photo.path;
end
$$;

revoke execute on function public.remove_group_photo(uuid, text) from public, anon;
grant execute on function public.remove_group_photo(uuid, text) to authenticated;

-- FR-GR-12: only the page admin (or the site admin) makes a gallery public.
create or replace function public.set_group_photos_public(p_group_id uuid, p_public boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not ((public.is_group_owner(p_group_id) and public.group_is_active(p_group_id)) or public.is_site_admin()) then
    perform public.raise_rule('not_allowed', 'Only the page admin can change who sees the photos.');
  end if;
  update public.groups set photos_public = coalesce(p_public, false) where id = p_group_id;
end
$$;

revoke execute on function public.set_group_photos_public(uuid, boolean) from public, anon;
grant execute on function public.set_group_photos_public(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Reports about a photo go to its group's organizers (FR-MD-2). Same as
-- the 20260925000002 version, plus 'photo'; a photo you can't see can't be
-- reported, so a report can't probe for one.
-- ---------------------------------------------------------------------------

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
    when 'photo' then
      select p.group_id, true into v_group, v_found from public.group_photos p
       where p.id = new.target_id and p.status = 'visible' and public.can_view_group_photos(p.group_id);
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

-- Same as the 20261010000004 version, plus the photo's uploader as its
-- author, so a report about an organizer's photo goes to the site admin.
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
      when 'photo' then (select p.uploader_id from public.group_photos p where p.id = v_report.target_id)
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
-- 6. The group-photos bucket (TR-SEC-12). PRIVATE: files are served through
-- short-lived signed URLs that the server creates as the viewer, so reading
-- a file needs the same right as reading its row. Only the app's re-encoded
-- WebP goes in, at <group_id>/<uploader_id>/<random>.webp, into a group the
-- uploader can add to, while the group's folder holds fewer than 200 files.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('group-photos', 'group-photos', false, 5242880, array['image/webp'])
on conflict (id) do nothing;

-- True when the caller may read this file: as for the gallery's rows.
create or replace function public.can_view_group_photo_file(p_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9_-]{8,64}\.webp$'
     and public.can_view_group_photos(public.storage_group_id(p_name))
$$;

revoke execute on function public.can_view_group_photo_file(text) from public;
grant execute on function public.can_view_group_photo_file(text) to anon, authenticated;

-- True when the caller may write this path: their own folder in a group
-- they can add photos to.
create or replace function public.can_write_group_photo_file(p_name text)
returns boolean
language sql stable set search_path = ''
as $$
  select p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9_-]{8,64}\.webp$'
     and (storage.foldername(p_name))[2] = (select auth.uid())::text
     and public.can_add_group_photo(public.storage_group_id(p_name))
$$;

revoke execute on function public.can_write_group_photo_file(text) from public, anon;
grant execute on function public.can_write_group_photo_file(text) to authenticated;

-- How many files the group's folder holds. Runs as the caller, a member who
-- can see the whole folder.
create or replace function public.group_photo_file_count(p_name text)
returns integer
language sql stable set search_path = ''
as $$
  select count(*)::integer from storage.objects o
  where o.bucket_id = 'group-photos'
    and (storage.foldername(o.name))[1] = (storage.foldername(p_name))[1]
$$;

revoke execute on function public.group_photo_file_count(text) from public, anon;
grant execute on function public.group_photo_file_count(text) to authenticated;

create policy "Members and public galleries read group photos" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'group-photos' and public.can_view_group_photo_file(name));

create policy "Members upload group photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'group-photos'
    and public.can_write_group_photo_file(name)
    and public.group_photo_file_count(name) < 200
  );

-- The uploader removes their own file while the group is active; organizers
-- (can_moderate) remove any file in their group's folder.
create policy "Uploaders and organizers delete group photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'group-photos'
    and (
      public.can_write_group_photo_file(name)
      or public.can_moderate(public.storage_group_id(name))
    )
  );
