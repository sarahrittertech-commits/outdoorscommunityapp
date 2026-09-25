import type { Metadata } from "next";

import { EventList, GroupList } from "@/components/Listings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** FR-BR-5: keyword search over group names and descriptions, and event titles. */
export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);

  // Letters, digits, spaces, hyphens and apostrophes only, so the words can be
  // placed safely inside the filter below.
  const words = q.replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim();

  let groups = null;
  let events = null;
  if (words) {
    const supabase = await createClient();
    const [g, e] = await Promise.all([
      supabase
        .from("group_listings")
        .select("slug, name, area, member_count, next_event_at, join_policy")
        .eq("status", "active")
        // Name and description, or the activity it's listed under: "kayak"
        // should find a group listed under Kayaking.
        .or(
          [
            `search.wfts(english)."${words}"`,
            `subcategory_name.ilike."*${words}*"`,
            `category_name.ilike."*${words}*"`,
          ].join(","),
        )
        .order("name")
        .limit(50),
      supabase
        .from("event_listings")
        .select("id, title, starts_at, timezone, group_name, group_slug, location_name, status, going_count")
        .eq("status", "scheduled")
        .gt("starts_at", new Date().toISOString())
        .textSearch("search", words, { type: "websearch", config: "english" })
        .order("starts_at")
        .limit(50),
    ]);
    groups = g.data ?? [];
    events = e.data ?? [];
  }

  return (
    <>
      <h1>Search</h1>
      <form action="/search" role="search" className="mt-2 flex max-w-xl gap-2">
        <label htmlFor="q" className="sr-only">
          Search groups and events
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="kayak, waterfall, beginner…" className="mt-0" />
        <button className="button">Search</button>
      </form>

      {groups && events && (
        <>
          <h2>Groups ({groups.length})</h2>
          <div className="mt-2">
            <GroupList groups={groups} />
          </div>
          <h2>Upcoming events ({events.length})</h2>
          <div className="mt-2">
            <EventList events={events} />
          </div>
        </>
      )}
    </>
  );
}
