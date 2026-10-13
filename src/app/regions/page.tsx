import type { Metadata } from "next";
import Link from "next/link";

import { chooseRegion } from "@/app/actions/regions";
import { ActivityIcon } from "@/brand/ActivityIcon";
import { Notice } from "@/components/Notice";
import { regionGroups } from "@/config/regionGroups";
import { regions } from "@/config/regions";
import { getCurrentRegion, regionIds } from "@/lib/currentRegion";
import { findTown, townLabel } from "@/lib/geo";
import { safeNext } from "@/lib/navigation";
import { liveRegions } from "@/lib/regions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Regions",
  description:
    "The regions and local areas the board covers. Pick one to see its groups and events.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Regions (UC-34, UC-40): the big regions, each with its local areas, their
 * hub towns and how many groups and upcoming events each has. *Choose* is a
 * plain form, so it works without JavaScript; it remembers the choice (an
 * area, or all of a big region) in a cookie and goes back to `next`.
 */
export default async function RegionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const current = await getCurrentRegion();

  const supabase = await createClient();
  const [{ data: rows }, { data: upcoming }, ids] = await Promise.all([
    supabase.from("subcategory_region_counts").select("region_slug, group_count"),
    supabase.from("event_listings").select("region_id").eq("status", "scheduled").gt("starts_at", new Date().toISOString()).limit(10000),
    regionIds(),
  ]);
  const groupCount = new Map<string, number>();
  for (const r of rows ?? []) groupCount.set(r.region_slug!, (groupCount.get(r.region_slug!) ?? 0) + (r.group_count ?? 0));
  const slugById = new Map([...ids].map(([slug, id]) => [id, slug]));
  const eventCount = new Map<string, number>();
  for (const e of upcoming ?? []) {
    const slug = slugById.get(e.region_id!);
    if (slug) eventCount.set(slug, (eventCount.get(slug) ?? 0) + 1);
  }

  const hubs = (slugs: string[]) => slugs.map((h) => (findTown(h) ? townLabel(findTown(h)!) : h)).join(" and ");
  const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;
  const live = liveRegions();
  const chosen = (slug: string) => (current.group ? current.group.slug === slug : !current.all && current.region.slug === slug);
  const chooseForm = (value: string, label: string) => (
    <form action={chooseRegion}>
      <input type="hidden" name="region" value={value} />
      <input type="hidden" name="next" value={next} />
      {/* Outlined: a list of solid plum buttons was a wall of purple. */}
      <button className="button button-plain">
        Choose<span className="sr-only"> {label}</span>
      </button>
    </form>
  );

  return (
    // Same frame as Communities and Events: a narrow left column, the list on the right.
    <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
      <div className="min-w-0 md:col-start-2 md:row-start-1">
        <h1 className="m-0 flex items-center gap-3">
          <ActivityIcon slug="regions" />
          Regions
        </h1>
        <p className="mt-2 border-b border-rule pb-3 text-subtle">
          Each region is made of local areas about 100 miles around their hub towns. Browse one area, or all of a
          region when you&rsquo;re up for a drive. The board remembers your choice on this device, and you can
          always search near any town.
        </p>
        <Notice params={params} />

        {regionGroups.map((g) => {
          const areas = live.filter((r) => r.group === g.slug);
          if (!areas.length) return null;
          const groupEvents = areas.reduce((n, r) => n + (eventCount.get(r.slug) ?? 0), 0);
          return (
            <section key={g.slug} aria-labelledby={`group-${g.slug}`} className="mt-8">
              <div
                className={`flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-2 ${chosen(g.slug) ? "is-current" : ""}`}
                aria-current={chosen(g.slug) ? "true" : undefined}
              >
                <div>
                  <h2 id={`group-${g.slug}`} className="m-0 text-2xl text-heading">
                    {g.name}
                    {chosen(g.slug) && <span className="current-label ml-3 align-middle">you&rsquo;re browsing all of it</span>}
                  </h2>
                  <p className="m-0 mt-1 text-sm text-meta-plum">
                    {g.description} {areas.length > 1 ? `All ${areas.length} areas · ${plural(groupEvents, "upcoming event")}` : null}
                  </p>
                </div>
                {areas.length > 1 && !chosen(g.slug) && chooseForm(g.slug, `all of the ${g.name}`)}
              </div>
              <ul className="divide-y divide-rule border-b border-rule">
                {areas.map((r) => {
                  const isCurrent = chosen(r.slug);
                  return (
                    <li
                      key={r.slug}
                      className={`flex flex-wrap items-center justify-between gap-4 py-4 pl-4 ${isCurrent ? "is-current" : ""}`}
                      aria-current={isCurrent ? "true" : undefined}
                    >
                      <div>
                        <h3 className="m-0 text-lg text-heading">
                          {r.name}
                          {isCurrent && <span className="current-label ml-3 align-middle">you&rsquo;re browsing this one</span>}
                        </h3>
                        <p className="m-0 mt-1 text-sm text-meta-plum">
                          Around {hubs(r.hubs)} · {plural(groupCount.get(r.slug) ?? 0, "group")} ·{" "}
                          {plural(eventCount.get(r.slug) ?? 0, "upcoming event")}
                        </p>
                      </div>
                      {!isCurrent && chooseForm(r.slug, r.name)}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <h2>Coming soon</h2>
        <p className="mt-1 text-sm text-muted">
          {regionGroups.filter((g) => !live.some((r) => r.group === g.slug)).map((g) => g.name).join(", ")}
          {regions.some((r) => r.status === "coming_soon") &&
            `; and new areas: ${regions.filter((r) => r.status === "coming_soon").map((r) => r.name).join(", ")}`}
          .
        </p>
      </div>

      <aside className="text-sm md:col-start-1 md:row-start-1 md:pt-2">
        <h2 className="m-0 text-base font-sans font-bold">
          {regionGroups.filter((g) => live.some((r) => r.group === g.slug)).length} regions · {live.length} areas
        </h2>
        <p className="mt-1 text-muted">Each area is about 100 miles around its hub towns.</p>
        <p className="mt-4 text-muted">
          Don&rsquo;t see your area? <Link href="/suggest">Suggest one</Link>.
        </p>
      </aside>
    </div>
  );
}
