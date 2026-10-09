import type { Metadata } from "next";
import Link from "next/link";

import { EventList } from "@/components/Listings";
import { Notice } from "@/components/Notice";
import { site } from "@/config/site";
import { requireViewer } from "@/lib/auth";
import { SUGGESTION_KIND_LABELS, SUGGESTION_STATUS_LABELS } from "@/lib/suggestions";
import { createClient } from "@/lib/supabase/server";
import { formatPostDate } from "@/lib/time";

export const metadata: Metadata = { title: "My stuff", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Upcoming events from a list of ids, soonest first. */
async function upcoming(supabase: Awaited<ReturnType<typeof createClient>>, ids: string[]) {
  if (!ids.length) return [];
  const { data } = await supabase
    .from("event_listings")
    .select("id, title, starts_at, timezone, group_name, group_slug, location_name, status, going_count, is_unclaimed, is_paid, takes_rsvps")
    .in("id", ids)
    .gt("ends_at", new Date().toISOString())
    .order("starts_at");
  return data ?? [];
}

/** FR-AC-7 and FR-EV-18: plain lists, not a feed. */
export default async function MyStuffPage({ searchParams }: Props) {
  const viewer = await requireViewer("/me");
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("role, status, groups(id, slug, name, area, status)")
    .eq("user_id", viewer.id);

  const groups = (memberships ?? [])
    .filter((m) => m.groups && m.status !== "banned")
    .sort((a, b) => a.groups!.name.localeCompare(b.groups!.name));

  const [{ data: rsvps }, { data: saves }] = await Promise.all([
    supabase.from("event_rsvps").select("event_id").eq("user_id", viewer.id).eq("status", "going"),
    // FR-EV-18: the user's own saves; nobody else can read them.
    supabase.from("saved_events").select("event_id").eq("user_id", viewer.id),
  ]);
  const goingIds = (rsvps ?? []).map((r) => r.event_id);
  const savedIds = (saves ?? []).map((r) => r.event_id);
  const [events, saved] = await Promise.all([upcoming(supabase, goingIds), upcoming(supabase, savedIds)]);

  // FR-AD-7: only the viewer's own; the database returns nobody else's.
  const { data: suggestions } = await supabase
    .from("suggestions")
    .select("id, kind, title, status, admin_note, created_at")
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <>
      <h1>My stuff</h1>
      <p className="mt-1 text-sm">
        Signed in as <strong>{viewer.displayName}</strong> · <Link href="/me/profile">edit profile</Link>
      </p>
      <Notice params={await searchParams} />

      <h2>Upcoming events I&apos;m going to</h2>
      <div className="mt-2">
        <EventList events={events} />
      </div>

      <h2>Saved</h2>
      <p className="mt-1 text-sm text-muted">Events you saved for later. Only you can see this list.</p>
      <div className="mt-2">
        <EventList events={saved} />
      </div>

      <h2>My groups</h2>
      {groups.length ? (
        <ul className="mt-2 divide-y divide-rule border-y border-rule">
          {groups.map(({ role, status, groups: g }) => (
            <li key={g!.id} className="py-2">
              <Link href={`/g/${g!.slug}`}>{g!.name}</Link>{" "}
              <span className="text-sm text-muted">
                {g!.area}
                {role !== "member" && ` · ${role}`}
                {status === "pending" && " · request pending"}
                {g!.status === "archived" && " · archived"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-muted">
          You haven&apos;t joined any groups yet. <Link href="/">Browse the board</Link>.
        </p>
      )}

      <h2 id="suggestions">My suggestions</h2>
      {suggestions?.length ? (
        <ul className="mt-2 divide-y divide-rule border-y border-rule">
          {suggestions.map((s) => (
            <li key={s.id} className="py-2">
              <strong>{s.title}</strong>{" "}
              <span className="text-sm text-muted">
                {SUGGESTION_KIND_LABELS[s.kind]} · sent {formatPostDate(s.created_at, site.defaultTimezone)} ·{" "}
              </span>
              <span className={s.status === "new" ? "text-sm text-muted" : "tag"}>{SUGGESTION_STATUS_LABELS[s.status]}</span>
              {s.admin_note && <p className="mt-1 text-sm">Site admin: &ldquo;{s.admin_note}&rdquo;</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-muted">You haven&apos;t sent any suggestions.</p>
      )}
      <p className="mt-2 text-sm">
        <Link href="/suggest">Suggest something</Link>: a region, a feature, a group to invite or an event to add.
      </p>
    </>
  );
}
