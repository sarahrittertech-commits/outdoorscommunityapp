import "server-only";

import type { ServerClient } from "./supabase/server";

export const DELETED_USER = "deleted user";

/** The other person in a conversation. */
export function otherPerson(c: { starter_id: string; recipient_id: string }, me: string): string {
  return c.starter_id === me ? c.recipient_id : c.starter_id;
}

/** Display names by id; a deleted account has no name and shows as "deleted user". */
export async function namesById(supabase: ServerClient, ids: string[]): Promise<(id: string) => string> {
  const unique = [...new Set(ids)];
  const { data } = unique.length
    ? await supabase.from("profiles").select("id, display_name").in("id", unique)
    : { data: [] as { id: string; display_name: string | null }[] };
  const names = new Map((data ?? []).map((p) => [p.id, p.display_name]));
  return (id) => names.get(id) || DELETED_USER;
}

export type InboxRow = {
  id: string;
  other: string;
  otherName: string;
  status: "requested" | "accepted" | "declined";
  iStarted: boolean;
  lastMessageAt: string;
  unread: boolean;
};

/**
 * FR-DM-3: the viewer's own conversations, newest first, split into the inbox
 * and requests waiting for them. People they've blocked are left out of both
 * and listed separately. Plain data, read when the page loads.
 */
export async function loadInbox(supabase: ServerClient, me: string) {
  const [{ data: conversations }, { data: reads }, { data: blocks }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, starter_id, recipient_id, status, last_message_at")
      // The site admin can also read reported conversations; the inbox is only their own.
      .or(`starter_id.eq.${me},recipient_id.eq.${me}`)
      .order("last_message_at", { ascending: false })
      .limit(200),
    supabase.from("conversation_reads").select("conversation_id, last_read_at").eq("user_id", me),
    supabase.from("message_blocks").select("blocked_id, created_at").eq("blocker_id", me).order("created_at", { ascending: false }),
  ]);

  const readAt = new Map((reads ?? []).map((r) => [r.conversation_id, r.last_read_at]));
  const blocked = new Set((blocks ?? []).map((b) => b.blocked_id));
  const rows = (conversations ?? []).map((c) => ({ c, other: otherPerson(c, me) }));
  const nameOf = await namesById(supabase, [...rows.map((r) => r.other), ...blocked]);

  const all: InboxRow[] = rows
    .filter((r) => !blocked.has(r.other))
    .map(({ c, other }) => {
      const read = readAt.get(c.id);
      return {
        id: c.id,
        other,
        otherName: nameOf(other),
        status: c.status,
        iStarted: c.starter_id === me,
        lastMessageAt: c.last_message_at,
        unread: !read || new Date(c.last_message_at) > new Date(read),
      };
    });

  return {
    // Open conversations, and requests the viewer sent (which they see as waiting).
    inbox: all.filter((r) => r.status === "accepted" || r.iStarted),
    requests: all.filter((r) => r.status === "requested" && !r.iStarted),
    blocked: (blocks ?? []).map((b) => ({ id: b.blocked_id, name: nameOf(b.blocked_id) })),
  };
}
