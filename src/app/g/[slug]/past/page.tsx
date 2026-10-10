import type { Metadata } from "next";
import Link from "next/link";

import { EventList } from "@/components/Listings";
import { pageFrom, Pagination } from "@/components/Pagination";
import { archivedGroupEvents } from "@/lib/groupEvents";
import { loadGroup } from "@/lib/groups";

const PAGE_SIZE = 50;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { group } = await loadGroup((await params).slug);
  return { title: `Past events · ${group.name}`, robots: { index: false } };
}

/** FR-EV-8: past events stay listed, newest first. */
export default async function PastEventsPage({ params, searchParams }: Props) {
  const { supabase, group } = await loadGroup((await params).slug);
  const page = pageFrom((await searchParams).page);

  // event_listings holds listed, active groups only (FR-GR-6, UC-27); an
  // archived or unlisted group's past events are read directly.
  const range = { from: (page - 1) * PAGE_SIZE, to: page * PAGE_SIZE - 1 };
  const { events, count } =
    group.status === "active" && group.review_status === "approved"
      ? await supabase
          .from("event_listings")
          .select("id, title, starts_at, timezone, group_name, group_slug, location_name, status, going_count, is_unclaimed, is_paid, takes_rsvps", { count: "exact" })
          .eq("group_id", group.id)
          .lte("ends_at", new Date().toISOString())
          .order("starts_at", { ascending: false })
          .range(range.from, range.to)
          .then(({ data, count }) => ({ events: data ?? [], count: count ?? 0 }))
      : await archivedGroupEvents(supabase, group, { upcoming: false, ...range });

  return (
    <>
      <p className="breadcrumb">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> ›
      </p>
      <h1>Past events</h1>
      <p className="mt-1 mb-2 text-sm text-muted">Newest first.</p>
      <EventList events={events} showGroup={false} />
      <Pagination basePath={`/g/${group.slug}/past`} page={page} pageCount={Math.ceil(count / PAGE_SIZE)} />
    </>
  );
}
