-- UC-19 / FR-DS-9: reply to a reply, one level only.
--
-- A reply can name a parent reply in the same thread. The parent is always
-- a top-level reply: answering a nested reply attaches the new reply to that
-- reply's own parent and records the nested reply it answers in answers_id,
-- so the page can name who it answers. Nesting therefore never goes deeper
-- than one level.
--
-- Posting rules are unchanged: the existing insert policy (members only,
-- discussions on, thread visible and not locked, account can write) and the
-- rate limit in replies_before_insert apply to nested replies too.
-- parent_id and answers_id are not in the column-level UPDATE grant (body
-- only), so they can't be changed after posting.
--
-- Removing or deleting a parent only blanks it and changes its status, so
-- its children stay readable under a placeholder. Hard deletes only happen
-- when the whole thread goes, which cascades anyway.

alter table public.replies
  add column parent_id uuid references public.replies (id) on delete cascade,
  add column answers_id uuid references public.replies (id) on delete set null,
  add constraint replies_answers_needs_parent check (answers_id is null or parent_id is not null),
  add constraint replies_not_own_parent check (parent_id is null or parent_id <> id);

create index replies_parent_idx on public.replies (parent_id) where parent_id is not null;

create or replace function public.replies_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_parent public.replies%rowtype;
begin
  perform public.check_post_rate_limit();
  new.status := 'visible';
  new.created_at := now();
  new.edited_at := null;
  new.answers_id := null;

  if new.parent_id is not null then
    select * into v_parent from public.replies r where r.id = new.parent_id;
    if not found or v_parent.thread_id <> new.thread_id then
      perform public.raise_rule('invalid', 'You can only answer a reply in the same thread.');
    end if;
    if v_parent.status <> 'visible' then
      perform public.raise_rule('invalid', 'That reply has been removed.');
    end if;
    -- Answering a nested reply: join the same level, remember who is answered.
    if v_parent.parent_id is not null then
      new.answers_id := v_parent.id;
      new.parent_id := v_parent.parent_id;
    end if;
  end if;
  return new;
end
$$;

-- Belt and braces: whatever the trigger does, a parent is always a top-level
-- reply in the same thread.
create or replace function public.replies_parent_is_top_level()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.parent_id is not null and not exists (
    select 1 from public.replies p
    where p.id = new.parent_id and p.thread_id = new.thread_id and p.parent_id is null
  ) then
    -- Runs as the signed-in user, and raise_rule is internal (20261010000004),
    -- so the error is raised directly in the same "code: message" form.
    raise exception using errcode = 'P0001', message = 'invalid: Replies nest one level only.';
  end if;
  return new;
end
$$;

revoke execute on function public.replies_parent_is_top_level() from public, anon, authenticated;

create trigger replies_parent_is_top_level after insert on public.replies
  for each row execute function public.replies_parent_is_top_level();
