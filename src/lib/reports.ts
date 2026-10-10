import "server-only";

import type { Enums } from "@/lib/supabase/database.types";
import type { ServerClient } from "@/lib/supabase/server";

type Report = { id: string; target_type: Enums<"report_target">; target_id: string; group_id: string | null };

/**
 * Which of these reports only the site admin can close: those about a post
 * or event written by the viewer, or by a page admin or page manager of the
 * report's group. Mirrors public.resolve_report(), which refuses organizers
 * with own_content; the database still decides, this only spares them a
 * button that can't work. Reports about a group or a profile have no group
 * and never reach an organizer's queue.
 */
export async function siteAdminOnlyReports(supabase: ServerClient, reports: Report[], viewerId: string): Promise<Set<string>> {
  const ids = (type: Report["target_type"]) => [...new Set(reports.filter((r) => r.target_type === type).map((r) => r.target_id))];
  const groupIds = [...new Set(reports.map((r) => r.group_id).filter((g): g is string => Boolean(g)))];
  const [threadIds, replyIds, eventIds] = [ids("thread"), ids("reply"), ids("event")];
  const none = Promise.resolve({ data: [] as never[] });

  const [threads, replies, events, organizers] = await Promise.all([
    threadIds.length ? supabase.from("threads").select("id, author_id").in("id", threadIds) : none,
    replyIds.length ? supabase.from("replies").select("id, author_id").in("id", replyIds) : none,
    eventIds.length ? supabase.from("events").select("id, created_by").in("id", eventIds) : none,
    groupIds.length
      ? supabase.from("group_members").select("group_id, user_id").in("group_id", groupIds).in("role", ["owner", "admin"])
      : none,
  ]);

  const authors = new Map<string, string | null>([
    ...(threads.data ?? []).map((t): [string, string | null] => [`thread:${t.id}`, t.author_id]),
    ...(replies.data ?? []).map((r): [string, string | null] => [`reply:${r.id}`, r.author_id]),
    ...(events.data ?? []).map((e): [string, string | null] => [`event:${e.id}`, e.created_by]),
  ]);
  const organizerKeys = new Set((organizers.data ?? []).map((m) => `${m.group_id}:${m.user_id}`));

  const out = new Set<string>();
  for (const r of reports) {
    const author = authors.get(`${r.target_type}:${r.target_id}`);
    if (!author) continue;
    if (author === viewerId || (r.group_id && organizerKeys.has(`${r.group_id}:${author}`))) out.add(r.id);
  }
  return out;
}
