import type { Metadata } from "next";
import Link from "next/link";

import { EventList } from "@/components/Listings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Upcoming events",
  description: "Every upcoming event on the board for the next 30 days, soonest first.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** FR-BR-4: the next 30 days, soonest first, optionally one category. */
export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;
  const supabase = await createClient();
  const now = new Date();
  const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let query = supabase
    .from("event_listings")
    .select("id, title, starts_at, timezone, group_name, group_slug, location_name, status, going_count")
    .eq("status", "scheduled")
    .gt("starts_at", now.toISOString())
    .lt("starts_at", until.toISOString())
    .order("starts_at")
    .limit(200);
  if (category) query = query.eq("category_slug", category);

  const [{ data: events }, { data: categories }] = await Promise.all([
    query,
    supabase.from("categories").select("slug, name").order("sort_order"),
  ]);

  return (
    <>
      <h1>Upcoming events</h1>
      <p className="mt-1 text-sm text-muted">The next 30 days, soonest first.</p>
      <p className="mt-2 flex flex-wrap gap-x-3 text-sm">
        {category ? <Link href="/events">all</Link> : <strong>all</strong>}
        {categories?.map((c) =>
          c.slug === category ? (
            <strong key={c.slug}>{c.name}</strong>
          ) : (
            <Link key={c.slug} href={`/events?category=${c.slug}`}>
              {c.name}
            </Link>
          ),
        )}
      </p>
      <div className="mt-4">
        <EventList events={events ?? []} />
      </div>
    </>
  );
}
