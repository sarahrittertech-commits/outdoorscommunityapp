import Link from "next/link";

import type { Enums } from "@/lib/supabase/database.types";
import { createClient, type ServerClient } from "@/lib/supabase/server";

type TargetType = Enums<"report_target">;
export type TargetRef = { type: TargetType; id: string; groupSlug?: string };
type Resolved = { href?: string; label: string };

const key = (t: { type: TargetType; id: string }) => `${t.type}:${t.id}`;

/**
 * Look up what a list of reports is about, as far as the viewer may see it:
 * one query per kind of target, all at once, instead of one per report.
 */
export async function resolveReportTargets(supabase: ServerClient, targets: TargetRef[]): Promise<Map<string, Resolved>> {
  const ids = (type: TargetType) => [...new Set(targets.filter((t) => t.type === type).map((t) => t.id))];
  const none = Promise.resolve({ data: [] as never[] });
  const [groupIds, eventIds, threadIds, replyIds, profileIds, photoIds] = (
    ["group", "event", "thread", "reply", "profile", "photo"] as const
  ).map(ids);

  const [groups, events, threads, replies, profiles, photos] = await Promise.all([
    groupIds.length ? supabase.from("groups").select("id, slug, name").in("id", groupIds) : none,
    eventIds.length ? supabase.from("events").select("id, title").in("id", eventIds) : none,
    threadIds.length ? supabase.from("threads").select("id, title, groups(slug)").in("id", threadIds) : none,
    replyIds.length ? supabase.from("replies").select("id, thread_id, body, threads(groups(slug))").in("id", replyIds) : none,
    profileIds.length ? supabase.from("profiles").select("id, display_name").in("id", profileIds) : none,
    photoIds.length ? supabase.from("group_photos").select("id, alt, status, groups(slug)").in("id", photoIds) : none,
  ]);

  const byId = <T extends { id: string }>(rows: T[] | null) => new Map((rows ?? []).map((r) => [r.id, r]));
  const g = byId(groups.data);
  const e = byId(events.data);
  const th = byId(threads.data);
  const rp = byId(replies.data);
  const pr = byId(profiles.data);
  const ph = byId(photos.data);

  const out = new Map<string, Resolved>();
  for (const t of targets) {
    let resolved: Resolved;
    switch (t.type) {
      case "group": {
        const row = g.get(t.id);
        resolved = row ? { href: `/g/${row.slug}`, label: row.name } : { label: "removed group" };
        break;
      }
      case "event":
        resolved = { href: `/e/${t.id}`, label: e.get(t.id)?.title ?? "event" };
        break;
      case "thread": {
        const row = th.get(t.id);
        resolved = { href: `/g/${row?.groups?.slug ?? t.groupSlug}/discussions/${t.id}`, label: row?.title ?? "thread" };
        break;
      }
      case "reply": {
        const row = rp.get(t.id);
        resolved = row
          ? {
              href: `/g/${row.threads?.groups?.slug ?? t.groupSlug}/discussions/${row.thread_id}#reply-${t.id}`,
              label: `“${row.body.slice(0, 60) || "removed"}”`,
            }
          : { label: "reply" };
        break;
      }
      case "profile":
        resolved = { href: `/u/${t.id}`, label: pr.get(t.id)?.display_name ?? "deleted user" };
        break;
      case "photo": {
        // A deleted or removed photo has no page; the site admin still sees its description.
        const row = ph.get(t.id);
        const slug = row?.groups?.slug ?? t.groupSlug;
        resolved =
          row?.status === "visible" && slug
            ? { href: `/g/${slug}/photos/${t.id}`, label: `photo: ${row.alt.slice(0, 60)}` }
            : { label: row ? `removed photo: ${row.alt.slice(0, 60)}` : "removed photo" };
        break;
      }
    }
    out.set(key(t), resolved);
  }
  return out;
}

/** A link to a target resolved with resolveReportTargets(). */
export function ReportTargetLink({ targets, type, id }: { targets: Map<string, Resolved>; type: TargetType; id: string }) {
  const t = targets.get(key({ type, id }));
  if (!t) return <span>{type}</span>;
  return t.href ? <Link href={t.href}>{t.label}</Link> : <span>{t.label}</span>;
}

/** A link to whatever one report is about. For lists, use resolveReportTargets() once. */
export async function ReportTarget(target: TargetRef) {
  const targets = await resolveReportTargets(await createClient(), [target]);
  return <ReportTargetLink targets={targets} type={target.type} id={target.id} />;
}
