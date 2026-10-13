import type { Metadata } from "next";
import Link from "next/link";

import { ActivityIcon } from "@/brand/ActivityIcon";
import { AffinityTags } from "@/components/AffinityTags";
import { Notice } from "@/components/Notice";
import { RegionScope } from "@/components/RegionScope";
import { getCurrentRegion, regionFilterIds, scopeName } from "@/lib/currentRegion";
import { BUSINESS_KIND_LABEL } from "@/lib/hosts";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Guides, shops and venues",
  description: "Guide services, gear shops and venues, A to Z, kept apart from the community groups.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const KINDS = [
  { value: "guide", label: "guide services" },
  { value: "shop", label: "gear shops" },
  { value: "venue", label: "venues" },
  { value: "company", label: "event companies" },
] as const;
type Kind = (typeof KINDS)[number]["value"];
const isKind = (v: unknown): v is Kind => KINDS.some((k) => k.value === v);

type Filters = { category?: string; kind?: Kind; region?: string };

function guidesHref(filters: Filters): string {
  const query = new URLSearchParams();
  if (filters.category) query.set("category", filters.category);
  if (filters.kind) query.set("kind", filters.kind);
  if (filters.region) query.set("region", filters.region);
  return query.size ? `/guides-and-shops?${query}` : "/guides-and-shops";
}

/**
 * UC-12 (first part), FR-BZ-7: guide services and gear shops on a page of
 * their own, A to Z, never mixed into the community lists and never
 * changing their order.
 */
export default async function GuidesAndShopsPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;
  const kind = isKind(params.kind) ? params.kind : undefined;
  const browsing = await getCurrentRegion(params.region);
  const areaIds = await regionFilterIds(browsing);
  const kept: Filters = { category, kind, region: browsing.param };

  const supabase = await createClient();
  let query = supabase
    .from("business_listings")
    .select("slug, name, kind, description, area, affinity_tags, category_slug, subcategory_name, region_id")
    .order("name")
    .limit(500);
  if (category) query = query.eq("category_slug", category);
  if (kind) query = query.eq("kind", kind);
  if (areaIds) query = query.in("region_id", areaIds);
  const [{ data: listings }, { data: categories }] = await Promise.all([
    query,
    supabase.from("categories").select("slug, name").order("sort_order"),
  ]);
  const current = categories?.find((c) => c.slug === category);

  return (
    <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
      <div className="min-w-0 md:col-start-2 md:row-start-1">
        <Notice params={params} />
        <h1 className="m-0 flex items-center gap-3">
          {current && <ActivityIcon slug={current.slug} />}
          {current ? `${current.name}: guides, shops and venues` : "Guides, shops and venues"}
        </h1>
        <p className="mt-2 border-b border-rule pb-3 text-subtle">
          Guide services, gear shops and venues in {scopeName(browsing)}, A to Z. Listed
          from their public websites; they don&apos;t pay to be here and are never mixed into the{" "}
          <Link href="/communities">communities</Link>.
        </p>
        <RegionScope current={browsing} path="/guides-and-shops" query={{ category, kind }} className="mt-2 text-sm text-muted" />

        {listings?.length ? (
          <ul className="mt-2 divide-y divide-rule border-b border-rule">
            {listings.map((b) => (
              <li key={b.slug} className="py-3">
                <Link href={`/b/${b.slug}`} className="font-bold">
                  {b.name}
                </Link>
                <span className="ml-2 inline-flex items-center gap-1 text-sm text-muted">
                  {b.category_slug && <ActivityIcon slug={b.category_slug} className="h-4 w-4" />}
                  {BUSINESS_KIND_LABEL[b.kind ?? ""] ?? "listing"} · {b.subcategory_name} · {b.area}
                  {!b.region_id && " · not in an area yet"}
                </span>
                <AffinityTags tags={b.affinity_tags} className="ml-2 align-middle" />
                {b.description && <p className="m-0 mt-1 line-clamp-2 max-w-prose text-sm text-muted">{b.description}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-muted">No guides, shops or venues listed here yet.</p>
        )}
      </div>

      <aside className="text-sm md:col-start-1 md:row-start-1">
        <h2 className="filter-heading mt-0">kind</h2>
        <ul className="mt-1 space-y-0.5">
          <li>{kind ? <Link href={guidesHref({ ...kept, kind: undefined })}>all</Link> : <strong>all</strong>}</li>
          {KINDS.map((k) => (
            <li key={k.value}>
              {k.value === kind ? <strong>{k.label}</strong> : <Link href={guidesHref({ ...kept, kind: k.value })}>{k.label}</Link>}
            </li>
          ))}
        </ul>
        <h2 className="filter-heading">activity</h2>
        <ul className="mt-1 space-y-0.5">
          <li>{category ? <Link href={guidesHref({ ...kept, category: undefined })}>all</Link> : <strong>all</strong>}</li>
          {categories?.map((c) => (
            <li key={c.slug}>
              {c.slug === category ? (
                <strong>{c.name}</strong>
              ) : (
                <Link href={guidesHref({ ...kept, category: c.slug })} prefetch={false}>
                  {c.name}
                </Link>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-6">
          Run a guide service, shop or venue that should be here? <Link href="/suggest">Suggest it</Link>.
        </p>
      </aside>
    </div>
  );
}
