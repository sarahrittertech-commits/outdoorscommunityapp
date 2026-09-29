-- Lock down internal functions, found by Supabase's security advisor on the
-- first real project.
--
-- Hosted Supabase grants EXECUTE on new functions to `authenticated` by
-- default. 20260925000002 revoked it from PUBLIC and anon but not from
-- authenticated, so signed-in users could call internal helpers through the
-- API. The one that mattered: log_moderation(), which would let anyone write
-- a fake entry into the moderation log.
--
-- Trigger functions are included: calling one directly only errors, but they
-- have no business being in the API. Triggers still fire, because Postgres
-- checks EXECUTE on a trigger function only when the trigger is created.

revoke execute on function
  public.log_moderation(public.moderation_action_type, public.report_target, uuid, uuid, text, jsonb),
  public.require_writer(),
  public.check_post_rate_limit(),
  public.set_updated_at(),
  public.handle_new_user(),
  public.groups_before_insert(),
  public.groups_after_insert(),
  public.group_members_before_insert(),
  public.events_before_write(),
  public.event_rsvps_before_write(),
  public.threads_before_insert(),
  public.replies_before_insert(),
  public.replies_after_insert(),
  public.threads_mark_edited(),
  public.replies_mark_edited(),
  public.reports_before_insert(),
  public.moderation_actions_immutable()
from public, anon, authenticated;

-- Only the storage policies (evaluated as a signed-in user) need this one.
revoke execute on function public.storage_group_id(text) from public, anon;

-- Pin search_path on the functions that didn't have it, so none can be
-- pointed at objects someone else created. Each already schema-qualifies
-- every name it uses.
alter function public.raise_rule(text, text) set search_path = '';
alter function public.set_updated_at() set search_path = '';
alter function public.events_before_write() set search_path = '';
alter function public.threads_mark_edited() set search_path = '';
alter function public.replies_mark_edited() set search_path = '';
alter function public.moderation_actions_immutable() set search_path = '';
alter function public.storage_group_id(text) set search_path = '';
