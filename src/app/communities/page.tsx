import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ActivityIcon } from "@/brand/ActivityIcon";
import { GroupTypeIcon } from "@/brand/GroupTypeIcon";
import { AffinityTags } from "@/components/AffinityTags";
import { LocationFilter, UnknownZip } from "@/components/LocationFilter";
import { pageFrom, Pagination } from "@/components/Pagination";
import { site } from "@/config/site";
import { distances } from "@/config/towns";
import { aboutMiles, milesBetween, resolveLocation, townForArea } from "@/lib/geo";
import { groupCoverUrl } from "@/lib/groupCovers";
import { GROUP_TYPES, isGroupType } from "@/lib/groupTypes";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate } from "@/lib/time";

export const metadata: Metadata = {
  title: "Communities",
  description: "Every group on the board, A to Z, with members and their next event.",
};

const PAGE_SIZE = 50;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

type Filters = { category?: string; type?: string; near?: string; zip?: string; within?: number };

/** /communities with the given filters; empty ones are left out (FR-BR-15). */
function communitiesHref(filters: Filters): string {
  const query = new URLSearchParams();
  if (filters.category) query.set("category", filters.category);
  if (filters.type) query.set("type", filters.type);
  if (filters.zip) query.set("zip", filters.zip);
  else if (filters.near) query.set("near", filters.near);
  if ((filters.zip || filters.near) && filters.within) query.set("within", String(filters.within));
  return query.size ? `/communities?${query}` : "/communities";
}

const COLUMNS =
  "slug, name, description, area, category_slug, subcategory_name, member_count, next_event_at, join_policy, is_unclaimed, affinity_tags, group_type, cover_image_path, cover_alt";

/**
 * Every active group in one table, A to Z, filterable by activity and type
 * (FR-GR-17). Near a town or zip code (FR-BR-12, FR-BR-13), the groups
 * within the distance come nearest first, and groups whose area isn't a
 * known town follow under "Area not on the map".
 */
export default async function CommunitiesPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;
  const type = isGroupType(params.type) ? params.type : undefined;
  const location = resolveLocation(params.near, params.zip);
  const near = location.town;
  const place = near && (location.zip ? `${location.zip} (${near.name})` : near.name);
  const within = distances.find((d) => String(d) === params.within) ?? 50;
  // The other filters' links keep the place, so filters combine.
  const kept: Filters = near ? { category, type, near: near.name, zip: location.zip, within } : { category, type };
  const asked = pageFrom(params.page);

  const supabase = await createClient();
  const listQuery = () => {
    let query = supabase.from("group_listings").select(COLUMNS, { count: "exact" }).eq("status", "active").order("name");
    if (category) query = query.eq("category_slug", category);
    if (type) query = query.eq("group_type", type);
    return query;
  };
  const listPage = (n: number) => listQuery().range((n - 1) * PAGE_SIZE, n * PAGE_SIZE - 1);

  const [first, { data: counts }, { data: categories }] = await Promise.all([
    // Near a place, distance comes from each group's free-text area, worked
    // out here, so every matching group is fetched and paged after sorting.
    near ? listQuery().limit(2000) : listPage(asked),
    supabase.from("subcategory_group_counts").select("category_slug, group_count"),
    supabase.from("categories").select("slug, name").order("sort_order"),
  ]);

  type Row = NonNullable<typeof first.data>[number] & { miles?: number };
  let groups: Row[];
  let count: number;
  let page: number;
  let closeCount = 0;
  let unmappedCount = 0;
  if (near) {
    const measured: Row[] = (first.data ?? []).map((g) => {
      const town = townForArea(g.area);
      return { ...g, miles: town ? milesBetween(near, town) : undefined };
    });
    const close = measured
      .filter((g) => g.miles !== undefined && g.miles <= within)
      .sort((a, b) => a.miles! - b.miles! || (a.name ?? "").localeCompare(b.name ?? ""));
    const unmapped = measured.filter((g) => g.miles === undefined);
    closeCount = close.length;
    unmappedCount = unmapped.length;
    count = close.length + unmapped.length;
    page = pageFrom(params.page, Math.ceil(count / PAGE_SIZE));
    groups = [...close, ...unmapped].slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  } else {
    // A page number past the end shows the last page, not an empty one. The
    // database refuses a range past the end without a count, so take the
    // count from page 1 then.
    const counted = first.count === null && asked > 1 ? await listPage(1) : first;
    page = pageFrom(params.page, Math.ceil((counted.count ?? 0) / PAGE_SIZE));
    const shown = page === asked ? first : page === 1 ? counted : await listPage(page);
    groups = shown.data ?? [];
    count = shown.count ?? 0;
  }
  const placedRows = groups.filter((g) => g.miles !== undefined);
  const unmappedRows = near ? groups.filter((g) => g.miles === undefined) : [];

  const perCategory = new Map<string, number>();
  for (const row of counts ?? []) perCategory.set(row.category_slug!, (perCategory.get(row.category_slug!) ?? 0) + (row.group_count ?? 0));
  const total = [...perCategory.values()].reduce((a, b) => a + b, 0);
  const current = categories?.find((c) => c.slug === category);
  // The activity counts are for every group; under a type or a place they'd mislead, so they're left off.
  const showCounts = !type && !near;

  const filters = (where: string) => (
    <>
      <h2 className="filter-heading mt-0">activity</h2>
      <ul className="mt-1 space-y-0.5">
        <li>
          {category ? <Link href={communitiesHref({ ...kept, category: undefined })}>all</Link> : <strong>all</strong>}{" "}
          {showCounts && <span className="text-muted">({total})</span>}
        </li>
        {categories?.map((c) => (
          <li key={c.slug}>
            {c.slug === category ? (
              <strong>{c.name}</strong>
            ) : (
              <Link href={communitiesHref({ ...kept, category: c.slug })} prefetch={false}>
                {c.name}
              </Link>
            )}{" "}
            {showCounts && <span className="text-muted">({perCategory.get(c.slug) ?? 0})</span>}
          </li>
        ))}
      </ul>
      {/* FR-GR-17: plain links, so the filter works without JavaScript. */}
      <h2 className="filter-heading">type</h2>
      <ul className="mt-1 space-y-0.5">
        <li>{type ? <Link href={communitiesHref({ ...kept, type: undefined })}>any</Link> : <strong>any</strong>}</li>
        {GROUP_TYPES.map((t) => (
          <li key={t.value}>
            {t.value === type ? (
              <strong>
                <GroupTypeIcon type={t.value} />
              </strong>
            ) : (
              <Link href={communitiesHref({ ...kept, type: t.value })} prefetch={false}>
                <GroupTypeIcon type={t.value} />
              </Link>
            )}
          </li>
        ))}
      </ul>
      <h2 className="filter-heading">location</h2>
      <LocationFilter
        action="/communities"
        idPrefix={`communities-${where}`}
        keep={{ category, type }}
        town={location.zip ? undefined : near?.name}
        zip={location.zip ?? location.unknownZip}
        within={within}
      />
      <p className="mt-6">
        <Link href="/groups/new">Start a group</Link>
      </p>
    </>
  );

  const row = (g: Row) => (
    <tr key={g.slug} className="border-b border-rule align-top">
      <td className="py-3 pr-4">
        {/* FR-GR-14: the group's own cover as a thumbnail. */}
        {g.cover_image_path && (
          <Image
            src={groupCoverUrl(supabase, g.cover_image_path)}
            alt={g.cover_alt ?? ""}
            width={96}
            height={64}
            className="float-right ml-3 h-16 w-24 rounded border border-rule object-cover"
          />
        )}
        <Link href={`/g/${g.slug}`} className="font-bold">
          {g.name}
        </Link>
        <span className="ml-2 inline-flex items-center gap-1 text-sm text-muted">
          {g.category_slug && <ActivityIcon slug={g.category_slug} className="h-4 w-4" />}
          {g.subcategory_name}
        </span>
        <GroupTypeIcon type={g.group_type} className="ml-2 align-middle text-sm text-muted" />
        <AffinityTags tags={g.affinity_tags} className="ml-2 align-middle" />
        {g.description && <p className="m-0 mt-1 line-clamp-2 max-w-prose text-sm text-muted">{g.description}</p>}
        <p className="m-0 text-sm text-muted sm:hidden">
          {g.area}
          {g.miles !== undefined && ` · ${aboutMiles(g.miles)}`}
        </p>
      </td>
      <td className="hidden py-3 pr-4 sm:table-cell">
        {g.area}
        {/* FR-BR-13: distance on each result, rounded (town centers). */}
        {g.miles !== undefined && <span className="block text-sm text-muted">{aboutMiles(g.miles)}</span>}
      </td>
      <td className="py-3 text-right">{g.is_unclaimed ? <span className="text-sm text-muted">listing</span> : g.member_count}</td>
      <td className="hidden py-3 pl-6 text-right whitespace-nowrap md:table-cell">
        {g.next_event_at ? formatShortDate(g.next_event_at, site.defaultTimezone) : <span className="text-muted">none yet</span>}
      </td>
    </tr>
  );

  return (
    // The h1 comes first in the source; grid placement puts the filters on the left.
    <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
      <div className="min-w-0 md:col-start-2 md:row-start-1">
        <h1 className="m-0 flex items-center gap-3">
          {current && <ActivityIcon slug={current.slug} />}
          {current ? `${current.name} communities` : "Communities"}
          {near ? ` near ${place}` : ""}
          {type && <span className="text-subtle"> · {GROUP_TYPES.find((t) => t.value === type)?.label}</span>}
        </h1>
        <p className="mt-2 border-b border-rule pb-3 text-subtle">
          {near ? (
            <>
              {closeCount} group{closeCount === 1 ? "" : "s"} within {within} miles of {place}, nearest first
              {unmappedCount > 0 && `, then ${unmappedCount} whose area isn’t on the map`}. Anyone can look; sign in to join.
            </>
          ) : (
            <>Local groups and clubs in {site.regionName}, A to Z. Anyone can look; sign in to join.</>
          )}
        </p>
        {location.unknownZip && <UnknownZip zip={location.unknownZip} fallback={near?.name} />}

        {groups.length ? (
          <table className="mt-2 w-full text-left">
            <thead className="text-sm text-muted">
              <tr className="border-b border-rule">
                <th className="py-2 font-normal">name</th>
                <th className="hidden py-2 font-normal sm:table-cell">area</th>
                <th className="py-2 text-right font-normal">members</th>
                <th className="hidden py-2 pl-6 text-right font-normal md:table-cell">next event</th>
              </tr>
            </thead>
            {near ? (
              <>
                {placedRows.length > 0 && <tbody>{placedRows.map(row)}</tbody>}
                {/* FR-BR-13: groups with no known town are listed after, not dropped. */}
                {unmappedRows.length > 0 && (
                  <tbody>
                    <tr>
                      <th colSpan={4} scope="colgroup" className="section-bar text-left">
                        Area not on the map
                      </th>
                    </tr>
                    {unmappedRows.map(row)}
                  </tbody>
                )}
              </>
            ) : (
              <tbody>{groups.map(row)}</tbody>
            )}
          </table>
        ) : (
          <p className="mt-4 text-muted">
            {near ? (
              <>
                No groups within {within} miles of {place}.{" "}
                <Link href={communitiesHref({ category, type })}>Show groups everywhere</Link>.
              </>
            ) : type ? (
              <>
                No groups of this type here yet. <Link href={communitiesHref({ category })}>Show every type</Link>.
              </>
            ) : (
              <>
                No groups here yet. <Link href="/groups/new">Start the first one</Link>.
              </>
            )}
          </p>
        )}
        <Pagination page={page} pageCount={Math.ceil(count / PAGE_SIZE)} basePath={communitiesHref(kept)} />
      </div>

      {/* Phones: the filters fold into a card above the list, open until a filter is picked. Computers: a side column. */}
      <details className="filter-card order-first text-sm md:hidden" open={!category && !type && !near}>
        <summary>{!category && !type && !near ? "Browse by activity, type or place" : "Change filters"}</summary>
        <div>{filters("card")}</div>
      </details>
      <aside aria-label="Filters" className="hidden text-sm md:col-start-1 md:row-start-1 md:block">
        {filters("side")}
      </aside>
    </div>
  );
}
