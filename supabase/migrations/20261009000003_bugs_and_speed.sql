-- Bugs and speed from the 8 October 2026 code review.
--
-- 1. FR-MB-3: leaving a group clears your RSVPs to its future events.
--    Removal already did (remove_member); leaving kept a "going" that
--    still took a place and listed the person on the event after they left.
-- 2. Supabase advisor auth_rls_initplan: policies call auth.uid() and
--    is_site_admin() once per row. Wrapped in a subquery, Postgres runs each
--    once per query. Same rules, same results; the permission tests run
--    unchanged against the rewritten policies.

-- ---------------------------------------------------------------------------
-- 1. Leaving a group
-- ---------------------------------------------------------------------------

create or replace function public.group_members_after_delete()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.event_rsvps r
   using public.events e
   where r.event_id = e.id
     and e.group_id = old.group_id
     and r.user_id = old.user_id
     and e.starts_at > now();
  return old;
end
$$;

revoke execute on function public.group_members_after_delete() from public, anon, authenticated;

drop trigger if exists group_members_after_delete on public.group_members;
create trigger group_members_after_delete after delete on public.group_members
  for each row execute function public.group_members_after_delete();

-- ---------------------------------------------------------------------------
-- 2. Evaluate auth.uid() and is_site_admin() once per query
-- ---------------------------------------------------------------------------
-- Rewrites every policy in the public schema in place. Calls already inside
-- a subquery are left alone, so running this twice changes nothing.

do $$
declare
  p record;
  v_using text;
  v_check text;
  v_sql text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
  loop
    v_using := p.qual;
    v_check := p.with_check;
    v_using := regexp_replace(v_using, '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'gi');
    v_using := regexp_replace(v_using, '(?<!select )(public\.)?is_site_admin\(\)', '(select public.is_site_admin())', 'gi');
    v_check := regexp_replace(v_check, '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'gi');
    v_check := regexp_replace(v_check, '(?<!select )(public\.)?is_site_admin\(\)', '(select public.is_site_admin())', 'gi');

    if v_using is distinct from p.qual or v_check is distinct from p.with_check then
      v_sql := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
      if v_using is not null then v_sql := v_sql || format(' using (%s)', v_using); end if;
      if v_check is not null then v_sql := v_sql || format(' with check (%s)', v_check); end if;
      execute v_sql;
    end if;
  end loop;
end
$$;
