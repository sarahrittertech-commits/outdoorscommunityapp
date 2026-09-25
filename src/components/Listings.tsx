import Link from "next/link";

import { site } from "@/config/site";
import type { Views } from "@/lib/supabase/database.types";
import { formatShortDate } from "@/lib/time";

type GroupListing = Pick<Views<"group_listings">, "slug" | "name" | "area" | "member_count" | "next_event_at" | "join_policy">;
type EventListing = Pick<
  Views<"event_listings">,
  "id" | "title" | "starts_at" | "timezone" | "group_name" | "group_slug" | "location_name" | "status" | "going_count"
>;

/** One row per group: the facts a newcomer needs to judge it (FR-BR-2). */
export function GroupList({ groups }: { groups: GroupListing[] }) {
  if (!groups.length) return <p className="text-muted">No groups here yet.</p>;
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {groups.map((g) => (
        <li key={g.slug} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2">
          <span>
            <Link href={`/g/${g.slug}`} className="font-semibold">
              {g.name}
            </Link>{" "}
            <span className="text-sm text-muted">({g.area})</span>
          </span>
          <span className="text-sm text-muted">
            {g.member_count} {g.member_count === 1 ? "member" : "members"} ·{" "}
            {g.next_event_at ? `next event ${formatShortDate(g.next_event_at, site.defaultTimezone)}` : "no upcoming events"}
            {g.join_policy === "approval" && " · approval to join"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function EventList({ events, showGroup = true }: { events: EventListing[]; showGroup?: boolean }) {
  if (!events.length) return <p className="text-muted">Nothing scheduled.</p>;
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {events.map((e) => (
        <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 py-2">
          <span className="w-28 shrink-0 font-mono text-sm">{formatShortDate(e.starts_at!, e.timezone!)}</span>
          <span className="min-w-0 flex-1">
            <Link href={`/e/${e.id}`}>{e.title}</Link>
            {e.status === "cancelled" && <strong className="ml-2 text-danger">cancelled</strong>}
            <span className="block text-sm text-muted">
              {showGroup && (
                <>
                  <Link href={`/g/${e.group_slug}`}>{e.group_name}</Link> ·{" "}
                </>
              )}
              {e.location_name} · {e.going_count} going
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
