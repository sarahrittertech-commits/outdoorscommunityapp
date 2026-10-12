import type { Metadata } from "next";
import Link from "next/link";

import { chooseRegion } from "@/app/actions/regions";
import { Notice } from "@/components/Notice";
import { regions } from "@/config/regions";
import { getCurrentRegion } from "@/lib/currentRegion";
import { findTown, townLabel } from "@/lib/geo";
import { safeNext } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Regions",
  description: "The areas the board covers. Pick one to see its groups and events.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Regions: every area the board covers, with its hub towns and how many
 * groups it has. *Choose* is a plain form, so it works without JavaScript;
 * it remembers the choice in a cookie and goes back to `next`.
 */
export default async function RegionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const current = await getCurrentRegion();

  const supabase = await createClient();
  const { data: rows } = await supabase.from("subcategory_region_counts").select("region_slug, group_count");
  const groupCount = new Map<string, number>();
  for (const r of rows ?? []) groupCount.set(r.region_slug!, (groupCount.get(r.region_slug!) ?? 0) + (r.group_count ?? 0));

  const live = regions.filter((r) => r.status === "live");
  const soon = regions.filter((r) => r.status === "coming_soon");
  const hubs = (slugs: string[]) => slugs.map((h) => (findTown(h) ? townLabel(findTown(h)!) : h)).join(" and ");

  return (
    <>
      <h1>Regions</h1>
      <p className="mt-1 max-w-2xl text-subtle">
        The board lists groups by region, and you browse one region at a time. Pick yours; the board remembers it on this
        device. You can always search near any town, in any region.
      </p>
      <Notice params={params} />

      <ul className="mt-8 divide-y divide-rule border-y border-rule">
        {live.map((r) => {
          const count = groupCount.get(r.slug) ?? 0;
          const isCurrent = r.slug === current.region.slug;
          return (
            <li key={r.slug} className="flex flex-wrap items-center justify-between gap-4 py-5">
              <div>
                <h2 className="m-0 text-xl">
                  {r.name}
                  {isCurrent && <span className="ml-2 align-middle text-sm font-normal text-muted">(you&rsquo;re browsing this one)</span>}
                </h2>
                <p className="m-0 mt-1.5 text-sm text-muted">
                  Around {hubs(r.hubs)} · {count} {count === 1 ? "group" : "groups"}
                </p>
              </div>
              {/* Outlined, and none on the current region: a list of solid plum buttons was a wall of purple. */}
              {!isCurrent && (
                <form action={chooseRegion}>
                  <input type="hidden" name="region" value={r.slug} />
                  <input type="hidden" name="next" value={next} />
                  <button className="button button-plain">
                    Choose<span className="sr-only"> {r.name}</span>
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      {soon.length > 0 && (
        <>
          <h2>Coming soon</h2>
          <ul className="mt-2 space-y-1">
            {soon.map((r) => (
              <li key={r.slug}>
                {r.name} <span className="text-sm text-muted">· around {hubs(r.hubs)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-6 text-sm text-muted">
        Don&rsquo;t see your area? <Link href="/suggest">Suggest a region</Link>.
      </p>
    </>
  );
}
