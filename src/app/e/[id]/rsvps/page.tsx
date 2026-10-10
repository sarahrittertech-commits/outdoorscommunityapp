import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { manageRsvp } from "@/app/actions/events";
import { Notice } from "@/components/Notice";
import { requireViewer } from "@/lib/auth";
import { loadEvent } from "@/lib/events";
import { loadGroup } from "@/lib/groups";

export const metadata: Metadata = { title: "Manage RSVPs", robots: { index: false } };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Action = "approve" | "decline" | "waitlist" | "remove";

const LISTS = [
  { status: "requested", title: "Requests", actions: ["approve", "waitlist", "decline"] },
  { status: "going", title: "Going", actions: ["waitlist", "decline", "remove"] },
  { status: "waitlisted", title: "Waitlist", actions: ["approve", "decline", "remove"] },
  { status: "declined", title: "Declined", actions: ["approve", "remove"] },
] as const satisfies readonly { status: string; title: string; actions: readonly Action[] }[];

const LABELS: Record<Action, string> = {
  approve: "Approve",
  decline: "Decline",
  waitlist: "Waitlist",
  remove: "Remove",
};

/**
 * FR-EV-17: requests, going, waitlist and declined, for the group's
 * organizers only. The database (manage_rsvp) checks every action again,
 * never lets going exceed places, and logs removals.
 */
export default async function ManageRsvpsPage({ params, searchParams }: Props) {
  const { id } = await params;
  await requireViewer(`/e/${id}/rsvps`);
  const { supabase, event, group } = await loadEvent(id);
  const { canManage } = await loadGroup(group.slug);
  if (!canManage) redirect(`/e/${id}?e=not_allowed`);

  const { data: rows } = await supabase
    .from("event_rsvps")
    .select("user_id, status, waitlisted_at, updated_at, profiles(display_name)")
    .eq("event_id", event.id)
    .order("waitlisted_at", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: true });
  const going = (rows ?? []).filter((r) => r.status === "going").length;
  const closed = event.status !== "scheduled" || new Date(event.starts_at) <= new Date();

  return (
    <>
      <p className="breadcrumb">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> › <Link href={`/e/${event.id}`}>{event.title}</Link> ›
      </p>
      <h1>Manage RSVPs</h1>
      <Notice params={await searchParams} />
      <p className="mt-2">
        {going} going{event.capacity !== null && ` of ${event.capacity} places`}.
        {event.approve_rsvps ? " Members ask to go and you approve them." : " Members RSVP without approval."}
        {closed && " RSVPs are closed, so only removing is possible."}
      </p>

      {LISTS.map((list) => {
        const people = (rows ?? []).filter((r) => r.status === list.status);
        return (
          <section key={list.status} aria-labelledby={`list-${list.status}`}>
            <h2 id={`list-${list.status}`}>
              {list.title} ({people.length})
            </h2>
            {people.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nobody.</p>
            ) : (
              <ol className="mt-2 list-decimal pl-6">
                {people.map((p) => {
                  const name = p.profiles?.display_name ?? "deleted user";
                  return (
                    <li key={p.user_id} className="py-1">
                      <Link href={`/u/${p.user_id}`}>{name}</Link>
                      {list.actions
                        .filter((a) => a === "remove" || !closed)
                        .filter((a) => a !== "waitlist" || event.waitlist_enabled)
                        .map((a) => (
                          <form key={a} action={manageRsvp.bind(null, event.id, p.user_id, a)} className="ml-3 inline">
                            <button className={a === "remove" || a === "decline" ? "link-button text-danger" : "link-button"}>
                              {LABELS[a]}
                              <span className="sr-only"> {name}</span>
                            </button>
                          </form>
                        ))}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </>
  );
}
