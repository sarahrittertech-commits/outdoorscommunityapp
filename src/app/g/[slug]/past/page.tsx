import type { Metadata } from "next";
import Link from "next/link";

import { EventList } from "@/components/Listings";
import { pageFrom, Pagination } from "@/components/Pagination";
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

  const { data: events, count } = await supabase
    .from("event_listings")
    .select("id, title, starts_at, timezone, group_name, group_slug, location_name, status, going_count", { count: "exact" })
    .eq("group_id", group.id)
    .lte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <>
      <p className="text-sm">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> ›
      </p>
      <h1>Past events</h1>
      <p className="mt-1 mb-2 text-sm text-muted">Newest first.</p>
      <EventList events={events ?? []} showGroup={false} />
      <Pagination basePath={`/g/${group.slug}/past`} page={page} pageCount={Math.ceil((count ?? 0) / PAGE_SIZE)} />
    </>
  );
}
