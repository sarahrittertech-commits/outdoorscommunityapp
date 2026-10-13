import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EventList, GroupList } from "@/components/Listings";
import { pageFrom, Pagination } from "@/components/Pagination";
import { RegionScope } from "@/components/RegionScope";
import { getCurrentRegion, regionFilterIds } from "@/lib/currentRegion";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;
/** Events shown above the groups: the next few, with a link to the rest. */
const EVENTS_SHOWN = 8;

type Props = {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function loadSubcategory(categorySlug: string, subcategorySlug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subcategories")
    .select("id, slug, name, categories!inner(slug, name)")
    .eq("slug", subcategorySlug)
    .eq("categories.slug", categorySlug)
    .maybeSingle();
  if (!data) notFound();
  return { supabase, subcategory: data, category: data.categories };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, subcategory } = await params;
  const loaded = await loadSubcategory(category, subcategory);
  return {
    title: `${loaded.subcategory.name} · ${loaded.category.name}`,
    description: `${loaded.subcategory.name} groups, listed A to Z.`,
  };
}

/** FR-BR-2: the next events in a subcategory (any host), then its groups, A to Z, 50 per page. */
export default async function SubcategoryPage({ params, searchParams }: Props) {
  const p = await params;
  const { supabase, subcategory, category } = await loadSubcategory(p.category, p.subcategory);
  const query = await searchParams;
  const asked = pageFrom(query.page);
  // Regions: the region being browsed, or every region with ?region=all.
  const current = await getCurrentRegion(query.region);
  const areaIds = await regionFilterIds(current);
  // Links keep the region asked for (?region=<slug> or all), not just "all".
  const scoped = (path: string) => (current.param ? `${path}?region=${current.param}` : path);

  const listPage = (n: number) => {
    let list = supabase
      .from("group_listings")
      .select("slug, name, area, member_count, next_event_at, join_policy, is_unclaimed, affinity_tags", { count: "exact" })
      .eq("subcategory_id", subcategory.id)
      .eq("status", "active");
    if (areaIds) list = list.in("region_id", areaIds);
    return list.order("name").range((n - 1) * PAGE_SIZE, n * PAGE_SIZE - 1);
  };
  // A page number past the end shows the last page, as on the category page.
  const first = await listPage(asked);
  const counted = first.count === null && asked > 1 ? await listPage(1) : first;
  const page = pageFrom(query.page, Math.ceil((counted.count ?? 0) / PAGE_SIZE));
  const { data: groups, count } = page === asked ? first : page === 1 ? counted : await listPage(page);
  const path = `/c/${category.slug}/${subcategory.slug}`;

  // Events first (Sarah, 12 October), whoever hosts them: groups, guides,
  // shops, venues and event companies in this subcategory.
  let upcoming = supabase
    .from("event_listings")
    .select(
      "id, title, starts_at, timezone, group_name, group_slug, category_slug, location_name, status, going_count, is_unclaimed, is_paid, takes_rsvps, host_kind, business_slug, business_name, host_area, price_text",
      { count: "exact" },
    )
    .eq("status", "scheduled")
    .eq("subcategory_id", subcategory.id)
    .gt("starts_at", new Date().toISOString());
  if (areaIds) upcoming = upcoming.in("region_id", areaIds);
  const { data: events, count: eventCount } = page === 1 ? await upcoming.order("starts_at").limit(EVENTS_SHOWN) : { data: [], count: 0 };

  return (
    <>
      <p className="breadcrumb">
        <Link href={scoped("/browse")}>all categories</Link> › <Link href={scoped(`/c/${category.slug}`)}>{category.name}</Link> ›
      </p>
      <h1>{subcategory.name}</h1>
      <RegionScope current={current} path={path} />
      {page === 1 && (
        <section aria-labelledby="events-h">
          <h2 id="events-h">Upcoming events</h2>
          {events?.length ? (
            <>
              <EventList events={events} />
              {(eventCount ?? 0) > events.length && (
                <p className="text-sm">
                  <Link href={`/events?category=${category.slug}${current.param ? `&region=${current.param}` : ""}`}>
                    More {category.name.toLowerCase()} events
                  </Link>
                </p>
              )}
            </>
          ) : (
            <p className="text-muted">No upcoming events here yet.</p>
          )}
        </section>
      )}
      <h2>Groups</h2>
      <p className="mt-1 mb-2 text-sm text-muted">
        Groups sorted A to Z. <Link href="/groups/new">Start one</Link>.
      </p>
      <GroupList groups={groups ?? []} />
      <Pagination basePath={scoped(path)} page={page} pageCount={Math.ceil((count ?? 0) / PAGE_SIZE)} />
    </>
  );
}
