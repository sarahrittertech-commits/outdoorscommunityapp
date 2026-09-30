import type { Metadata } from "next";
import Link from "next/link";

import { ActivityIcon } from "@/components/ActivityIcon";
import { pageFrom, Pagination } from "@/components/Pagination";
import { site } from "@/config/site";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate } from "@/lib/time";

export const metadata: Metadata = {
  title: "Communities",
  description: "Every group on the board, A to Z, with members and their next event.",
};

const PAGE_SIZE = 50;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Every active group in one table, A to Z, filterable by activity. */
export default async function CommunitiesPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;
  const page = pageFrom(params.page);

  const supabase = await createClient();
  let query = supabase
    .from("group_listings")
    .select("slug, name, description, area, category_slug, subcategory_name, member_count, next_event_at, join_policy, is_unclaimed", { count: "exact" })
    .eq("status", "active")
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (category) query = query.eq("category_slug", category);

  const [{ data: groups, count }, { data: counts }, { data: categories }] = await Promise.all([
    query,
    supabase.from("subcategory_group_counts").select("category_slug, group_count"),
    supabase.from("categories").select("slug, name").order("sort_order"),
  ]);

  const perCategory = new Map<string, number>();
  for (const row of counts ?? []) perCategory.set(row.category_slug!, (perCategory.get(row.category_slug!) ?? 0) + (row.group_count ?? 0));
  const total = [...perCategory.values()].reduce((a, b) => a + b, 0);
  const current = categories?.find((c) => c.slug === category);

  return (
    <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
      <aside aria-label="Filters" className="text-sm">
        <h2 className="mt-0 font-sans text-base font-bold text-ink">activity</h2>
        <ul className="mt-1 space-y-0.5">
          <li>
            {category ? <Link href="/communities">all</Link> : <strong>all</strong>} <span className="text-muted">({total})</span>
          </li>
          {categories?.map((c) => (
            <li key={c.slug}>
              {c.slug === category ? (
                <strong>{c.name}</strong>
              ) : (
                <Link href={`/communities?category=${c.slug}`} prefetch={false}>
                  {c.name}
                </Link>
              )}{" "}
              <span className="text-muted">({perCategory.get(c.slug) ?? 0})</span>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <Link href="/groups/new">Start a group</Link>
        </p>
      </aside>

      <div className="min-w-0">
        <h1 className="m-0 flex items-center gap-3">
          {current && <ActivityIcon slug={current.slug} />}
          {current ? `${current.name} communities` : "Communities"}
        </h1>
        <p className="mt-1 border-b border-ink pb-3 text-sm text-muted">
          Local groups and clubs in {site.regionName}, A to Z. Anyone can look; sign in to join.
        </p>

        {groups && groups.length ? (
          <table className="mt-2 w-full text-left">
            <thead className="text-sm text-muted">
              <tr className="border-b border-rule">
                <th className="py-2 font-normal">name</th>
                <th className="hidden py-2 font-normal sm:table-cell">area</th>
                <th className="py-2 text-right font-normal">members</th>
                <th className="hidden py-2 pl-6 text-right font-normal md:table-cell">next event</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.slug} className="border-b border-rule align-top">
                  <td className="py-3 pr-4">
                    <Link href={`/g/${g.slug}`} className="font-bold">
                      {g.name}
                    </Link>
                    <span className="ml-2 inline-flex items-center gap-1 text-sm text-muted">
                      {g.category_slug && <ActivityIcon slug={g.category_slug} className="h-4 w-4" />}
                      {g.subcategory_name}
                    </span>
                    {g.description && <p className="m-0 mt-1 line-clamp-2 max-w-prose text-sm text-muted">{g.description}</p>}
                    <p className="m-0 text-sm text-muted sm:hidden">{g.area}</p>
                  </td>
                  <td className="hidden py-3 pr-4 sm:table-cell">{g.area}</td>
                  <td className="py-3 text-right">{g.is_unclaimed ? <span className="text-sm text-muted">listing</span> : g.member_count}</td>
                  <td className="hidden py-3 pl-6 text-right whitespace-nowrap md:table-cell">
                    {g.next_event_at ? formatShortDate(g.next_event_at, site.defaultTimezone) : <span className="text-muted">none yet</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-4 text-muted">
            No groups here yet. <Link href="/groups/new">Start the first one</Link>.
          </p>
        )}
        <Pagination
          page={page}
          pageCount={Math.ceil((count ?? 0) / PAGE_SIZE)}
          basePath={category ? `/communities?category=${category}` : "/communities"}
        />
      </div>
    </div>
  );
}
