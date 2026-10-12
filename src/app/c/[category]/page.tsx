import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EventList, GroupList } from "@/components/Listings";
import { pageFrom, Pagination } from "@/components/Pagination";
import { RegionScope } from "@/components/RegionScope";
import { getCurrentRegion, regionFilterId } from "@/lib/currentRegion";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;
/** Events shown above the groups: the next few, with a link to the rest. */
const EVENTS_SHOWN = 8;

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function loadCategory(slug: string) {
  const supabase = await createClient();
  const { data: category } = await supabase.from("categories").select("id, slug, name").eq("slug", slug).maybeSingle();
  if (!category) notFound();
  return { supabase, category };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await loadCategory((await params).category);
  return { title: category.name, description: `${category.name} groups, listed A to Z.` };
}

/** FR-BR-3: the next events in a category, then every group in it, alphabetically. */
export default async function CategoryPage({ params, searchParams }: Props) {
  const { supabase, category } = await loadCategory((await params).category);
  const query = await searchParams;
  const pageParam = query.page;
  const asked = pageFrom(pageParam);
  // Regions: the region being browsed, or every region with ?region=all.
  const current = await getCurrentRegion(query.region);
  const regionId = await regionFilterId(current);
  // Links keep the region asked for (?region=<slug> or all), not just "all".
  const scoped = (path: string) => (current.param ? `${path}?region=${current.param}` : path);
  const eventsLink = `/events?category=${category.slug}${current.param ? `&region=${current.param}` : ""}`;
  const listPage = (n: number) => {
    let list = supabase
      .from("group_listings")
      .select("slug, name, area, member_count, next_event_at, join_policy, is_unclaimed, affinity_tags", { count: "exact" })
      .eq("category_id", category.id)
      .eq("status", "active");
    if (regionId) list = list.eq("region_id", regionId);
    return list.order("name").range((n - 1) * PAGE_SIZE, n * PAGE_SIZE - 1);
  };

  // Events first (Sarah, 12 October): the page's job is to get people to
  // show up, so the next events in this activity come before the groups.
  let upcoming = supabase
    .from("event_listings")
    .select(
      "id, title, starts_at, timezone, group_name, group_slug, category_slug, location_name, status, going_count, is_unclaimed, is_paid, takes_rsvps, host_kind, business_slug, business_name, host_area, price_text",
      { count: "exact" },
    )
    .eq("status", "scheduled")
    .eq("category_slug", category.slug)
    .gt("starts_at", new Date().toISOString());
  if (regionId) upcoming = upcoming.eq("region_id", regionId);

  const [{ data: subcategories }, first, { data: events, count: eventCount }] = await Promise.all([
    supabase.from("subcategories").select("slug, name").eq("category_id", category.id).order("sort_order"),
    listPage(asked),
    upcoming.order("starts_at").limit(EVENTS_SHOWN),
  ]);
  // A page number past the end shows the last page, not an empty one. The
  // database refuses a range past the end without a count, so take the
  // count from page 1 then.
  const counted = first.count === null && asked > 1 ? await listPage(1) : first;
  const page = pageFrom(pageParam, Math.ceil((counted.count ?? 0) / PAGE_SIZE));
  const { data: groups, count } = page === asked ? first : page === 1 ? counted : await listPage(page);

  return (
    <>
      <p className="breadcrumb">
        <Link href={scoped("/browse")}>all categories</Link> ›
      </p>
      <h1>{category.name}</h1>
      <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
        {subcategories?.map((s) => (
          <Link key={s.slug} href={scoped(`/c/${category.slug}/${s.slug}`)}>
            {s.name}
          </Link>
        ))}
      </p>
      <RegionScope current={current} path={`/c/${category.slug}`} className="mt-4 text-sm text-muted" />
      {page === 1 && (
        <section aria-labelledby="events-h">
          <h2 id="events-h">Upcoming events</h2>
          {events?.length ? (
            <>
              <EventList events={events} />
              {(eventCount ?? 0) > events.length && (
                <p className="text-sm">
                  <Link href={eventsLink}>More {category.name.toLowerCase()} events</Link>
                </p>
              )}
            </>
          ) : (
            <p className="text-muted">
              No upcoming events here yet. The groups below post them; <Link href={eventsLink}>see every event</Link>.
            </p>
          )}
        </section>
      )}
      <h2>Groups</h2>
      <p className="mt-1 mb-2 text-sm text-muted">Groups sorted A to Z.</p>
      <GroupList groups={groups ?? []} />
      <Pagination basePath={scoped(`/c/${category.slug}`)} page={page} pageCount={Math.ceil((count ?? 0) / PAGE_SIZE)} />
    </>
  );
}
