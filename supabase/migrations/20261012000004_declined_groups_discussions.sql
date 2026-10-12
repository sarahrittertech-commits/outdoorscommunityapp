-- Overnight review, 12 October 2026: a declined group (UC-27) is read-only,
-- but group_discussions_open() still let its owner post and edit threads
-- and replies through the API; only the UI stopped them. Same as
-- 20260925000002 plus the review check. Test: 035-review-fixes.sql.

create or replace function public.group_discussions_open(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.groups g
    where g.id = p_group_id and g.status = 'active' and g.discussions_enabled
      and g.review_status <> 'declined'
  )
$$;
