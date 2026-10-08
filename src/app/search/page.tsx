import type { Metadata } from "next";

import { EventList, GroupList } from "@/components/Listings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * FR-BR-5: keyword search over group names and descriptions, and event titles,
 * optionally within one activity (the home page's Activity picker).
 */
export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  // A category slug is lowercase letters and hyphens; anything else is ignored.
  const category = typeof params.category === "string" && /^[a-z-]{1,40}$/.test(params.category) ? params.category : "";

  // Letters, digits, spaces, hyphens and apostrophes only, so the words can be
  // placed safely inside the filter below.
  const words = q.replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim();

  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("slug, name").order("sort_order");

  let groups = null;
  let events = null;
  if (words || category) {
    let groupQuery = supabase
      .from("group_listings")
      .select("slug, name, area, member_count, next_event_at, join_policy, is_unclaimed, affinity_tags")
      .eq("status", "active");
    let eventQuery = supabase
      .from("event_listings")
      .select("id, title, starts_at, timezone, group_name, group_slug, location_name, status, going_count, is_unclaimed")
      .eq("status", "scheduled")
      .gt("starts_at", new Date().toISOString());
    if (words) {
      // Name and description, or the activity it's listed under: "kayak"
      // should find a group listed under Kayaking.
      groupQuery = groupQuery.or(
        [`search.wfts(english)."${words}"`, `subcategory_name.ilike."*${words}*"`, `category_name.ilike."*${words}*"`].join(","),
      );
      eventQuery = eventQuery.textSearch("search", words, { type: "websearch", config: "english" });
    }
    if (category) {
      groupQuery = groupQuery.eq("category_slug", category);
      eventQuery = eventQuery.eq("category_slug", category);
    }
    const [g, e] = await Promise.all([groupQuery.order("name").limit(50), eventQuery.order("starts_at").limit(50)]);
    groups = g.data ?? [];
    events = e.data ?? [];
  }

  return (
    <>
      <h1>Search</h1>
      <form action="/search" role="search" className="mt-2 flex max-w-2xl flex-wrap gap-2">
        <label htmlFor="category" className="sr-only">
          Activity
        </label>
        <select id="category" name="category" defaultValue={category} className="mt-0 w-auto">
          <option value="">All activities</option>
          {categories?.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <label htmlFor="q" className="sr-only">
          Search groups and events
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="kayak, waterfall, beginner…" className="mt-0 min-w-0 flex-1" />
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
