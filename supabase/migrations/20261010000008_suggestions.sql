-- UC-32: suggestions to the site admin (FR-AD-4 to FR-AD-7).
--
-- A signed-in member suggests a region, a feature, a group to invite, an
-- event to add or something else. Only the sender and the site admin can
-- read a suggestion: it is never shown publicly, voted on or ranked. The
-- site admin marks it planned, done or declined, with an optional note the
-- sender reads under My suggestions.

create type public.suggestion_kind as enum ('region', 'feature', 'group', 'event', 'other');
create type public.suggestion_status as enum ('new', 'planned', 'done', 'declined');

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  -- Kept if the sender deletes their account (the profile row stays, nameless),
  -- so the site admin doesn't lose the idea.
  user_id uuid references public.profiles (id) on delete set null,
  kind public.suggestion_kind not null,
  title text not null check (char_length(btrim(title)) between 3 and 120 and char_length(title) <= 120),
  details text check (char_length(details) <= 2000),
  link text check (char_length(link) <= 500 and link ~* '^https?://\S+$'),
  status public.suggestion_status not null default 'new',
  admin_note text check (char_length(admin_note) <= 500),
  handled_at timestamptz,
  -- Set by the limit guard from the server clock, never by the client.
  created_at timestamptz not null default now()
);

create index suggestions_user_idx on public.suggestions (user_id, created_at);
create index suggestions_newest_idx on public.suggestions (created_at desc);
create index suggestions_kind_idx on public.suggestions (kind, created_at desc);

-- ---------------------------------------------------------------------------
-- Permissions. RLS denies by default; anonymous visitors get nothing.
-- ---------------------------------------------------------------------------

alter table public.suggestions enable row level security;

revoke all on public.suggestions from anon;
-- Members insert only the fields they write; status and the note change only
-- through set_suggestion_status(). Nobody updates or deletes directly.
revoke insert, update, delete on public.suggestions from authenticated;
grant insert (user_id, kind, title, details, link) on public.suggestions to authenticated;

create policy "Members send suggestions as themselves" on public.suggestions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_write());

-- FR-AD-5: the sender and the site admin only. Calls are wrapped in a
-- select so they run once per query, not once per row (see 20261009000003).
create policy "Suggestions reach only their sender and the site admin" on public.suggestions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_site_admin()));

-- ---------------------------------------------------------------------------
-- FR-AD-7: 5 a day, with the per-person lock and server time (TR-SEC-8).
-- a_limit_guard runs first (triggers fire in name order).
-- ---------------------------------------------------------------------------

create or replace function public.suggestions_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.suggestions s
      where s.user_id = auth.uid() and s.created_at > now() - interval '1 day') >= 5 then
    perform public.raise_rule('rate_limited', 'You can send at most 5 suggestions a day.');
  end if;
  return new;
end
$$;

revoke execute on function public.suggestions_before_insert() from public, anon, authenticated;

create trigger a_limit_guard before insert on public.suggestions
  for each row execute function public.before_insert_limit_guard();
create trigger suggestions_rate_limit before insert on public.suggestions
  for each row execute function public.suggestions_before_insert();

-- ---------------------------------------------------------------------------
-- FR-AD-6: only the site admin sets a status and the note.
-- ---------------------------------------------------------------------------

create or replace function public.set_suggestion_status(
  p_suggestion_id uuid,
  p_status public.suggestion_status,
  p_note text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_writer();
  if not public.is_site_admin() then
    perform public.raise_rule('not_allowed', 'Only the site admin can update suggestions.');
  end if;
  if p_status is null or p_status = 'new' then
    perform public.raise_rule('invalid', 'A suggestion can be marked planned, done or declined.');
  end if;
  if char_length(p_note) > 500 then
    perform public.raise_rule('invalid', 'The note can be at most 500 characters.');
  end if;
  update public.suggestions
     set status = p_status,
         admin_note = nullif(btrim(coalesce(p_note, '')), ''),
         handled_at = now()
   where id = p_suggestion_id;
  if not found then
    perform public.raise_rule('not_found', 'No such suggestion.');
  end if;
end
$$;

revoke execute on function public.set_suggestion_status(uuid, public.suggestion_status, text) from public, anon;
grant execute on function public.set_suggestion_status(uuid, public.suggestion_status, text) to authenticated;
