import type { Metadata } from "next";
import Link from "next/link";

import { assignArea } from "@/app/actions/ungrouped";
import { Notice } from "@/components/Notice";
import { requireSiteAdmin } from "@/lib/auth";
import { aboutMiles, milesBetween, townForArea } from "@/lib/geo";
import { liveRegions, nearestRegion } from "@/lib/regions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ungrouped", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

type Row = { kind: "group" | "business"; slug: string; name: string; area: string };

/**
 * UC-41 step 4: communities, guides and shops whose town isn't in any open
 * area yet, by state, with the nearest open area and how far it is. The site
 * admin assigns one to an area here, or opens a new area (UC-35) when a
 * state has enough of them. The database refuses this to anyone else.
 */
export default async function UngroupedPage({ searchParams }: Props) {
  await requireSiteAdmin();
  const supabase = await createClient();
  const params = await searchParams;

  const [{ data: groups }, { data: businesses }] = await Promise.all([
    supabase.from("group_listings").select("slug, name, area").is("region_id", null).eq("status", "active").order("name"),
    supabase.from("business_listings").select("slug, name, area").is("region_id", null).order("name"),
  ]);
  const rows: Row[] = [
    ...(groups ?? []).map((g) => ({ kind: "group" as const, slug: g.slug ?? "", name: g.name ?? "", area: g.area ?? "" })),
    ...(businesses ?? []).map((b) => ({ kind: "business" as const, slug: b.slug ?? "", name: b.name ?? "", area: b.area ?? "" })),
  ];
  const placed = rows.map((r) => {
    const town = townForArea(r.area);
    const nearest = town ? nearestRegion(town.lat, town.lng, { anyDistance: true }) : undefined;
    return { ...r, state: town?.state ?? r.area.match(/,\s*([A-Z]{2})$/)?.[1] ?? "?", nearest, miles: town && nearest ? milesBetween(town, nearest.center) : undefined };
  });
  const byState = new Map<string, typeof placed>();
  for (const r of placed) byState.set(r.state, [...(byState.get(r.state) ?? []), r]);
  const states = [...byState.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const areas = liveRegions().slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <p className="breadcrumb">
        <Link href="/admin">Site admin</Link> ›
      </p>
      <h1>Ungrouped</h1>
      <Notice params={params} />
      <p className="max-w-prose text-sm text-muted">
        {placed.length} listings whose town isn&apos;t in any open area. People still find them by zip code or town, and under every
        region. Move one into an area here, or open a new area when a state has enough of them. Their events are read once they have an
        area.
      </p>
      {states.length === 0 && <p>Nothing ungrouped.</p>}
      {states.map(([state, list]) => (
        <section key={state} className="mt-6">
          <h2>
            {state} ({list.length})
          </h2>
          <ul className="divide-y divide-rule border-y border-rule">
            {list.map((r) => (
              <li key={`${r.kind}:${r.slug}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                <span>
                  <Link href={r.kind === "group" ? `/g/${r.slug}` : `/b/${r.slug}`} className="font-semibold">
                    {r.name}
                  </Link>{" "}
                  <span className="text-sm text-muted">
                    ({r.area}) · {r.kind === "group" ? "community" : "guide or shop"}
                    {r.nearest && r.miles !== undefined && ` · nearest: ${r.nearest.name}, ${aboutMiles(r.miles)}`}
                  </span>
                </span>
                <form action={assignArea} className="flex items-center gap-2">
                  <input type="hidden" name="listing" value={`${r.kind}:${r.slug}`} />
                  <label className="sr-only" htmlFor={`area-${r.kind}-${r.slug}`}>
                    Area for {r.name}
                  </label>
                  <select id={`area-${r.kind}-${r.slug}`} name="area" defaultValue={r.nearest?.slug} className="text-sm">
                    {areas.map((a) => (
                      <option key={a.slug} value={a.slug}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="button text-sm">
                    Move
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
