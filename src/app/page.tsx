import Link from "next/link";

import { ActivityIcon } from "@/brand/ActivityIcon";
import { Ridgeline } from "@/brand/Ridgeline";
import { DestinationMap, type MapPoint } from "@/components/DestinationMap";
import { Notice } from "@/components/Notice";
import { site } from "@/config/site";
import { TownSelect } from "@/components/TownSelect";
import { defaultTown, distances, type Town } from "@/config/towns";
import { aboutMiles, countWithin, findTown, milesBetween, townForArea } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";
import { dateParts } from "@/lib/time";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const NEAR_MILES = 100;
/** Destination counts: one of the /events distances and time windows. */
const DEST_MILES = 25;
const DEST_DAYS = 90;

/**
 * The front door (8 October design): search by activity and town, the
 * activities as line drawings, events near a town you choose, and the
 * destinations map. The full Craigslist-style directory is one click away
 * at /browse.
 */
export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const str = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  const nearTown = findTown(str("near")) ?? findTown(defaultTown)!;
  const dest = str("dest");
  const where = str("where")?.trim().slice(0, 60) ?? "";

  const supabase = await createClient();
  const [{ data: categories }, { data: events }, { data: groups }] = await Promise.all([
    supabase.from("categories").select("slug, name").order("sort_order"),
    supabase
      .from("event_listings")
      .select("id, title, starts_at, timezone, group_name, group_slug, category_slug, location_name, going_count, is_unclaimed, is_paid, takes_rsvps")
      .eq("status", "scheduled")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(300),
    supabase.from("groups").select("slug, area").eq("status", "active"),
  ]);

  // Each event is placed at its group's town (UC-14).
  const townOfGroup = new Map<string, Town | undefined>((groups ?? []).map((g) => [g.slug, townForArea(g.area)]));
  const placed = (events ?? []).map((e) => ({ ...e, town: townOfGroup.get(e.group_slug ?? "") }));

  const nearby = placed
    .map((e) => ({ ...e, miles: e.town ? milesBetween(nearTown, e.town) : Infinity }))
    .filter((e) => e.miles <= NEAR_MILES)
    .slice(0, 8);

  // Destinations (UC-15): towns with events in the next DEST_DAYS days, for
  // one activity or all. Each count follows the same rules as the /events
  // page it links to: that window, and every event within DEST_MILES.
  const destUntil = new Date().getTime() + DEST_DAYS * 24 * 60 * 60 * 1000;
  const destEvents = placed.filter((e) => new Date(e.starts_at!).getTime() < destUntil && (!dest || e.category_slug === dest));
  const byTown = new Map<string, { town: Town; count: number; activities: Set<string> }>();
  for (const e of destEvents) {
    if (!e.town) continue;
    const entry = byTown.get(e.town.name) ?? { town: e.town, count: 0, activities: new Set<string>() };
    if (e.category_slug) entry.activities.add(e.category_slug);
    byTown.set(e.town.name, entry);
  }
  const destTowns = destEvents.map((e) => e.town);
  for (const entry of byTown.values()) entry.count = countWithin(entry.town, destTowns, DEST_MILES);
  const needle = where.toLowerCase();
  const destinations = [...byTown.values()]
    .filter((d) => !needle || d.town.name.toLowerCase().includes(needle) || d.town.state.toLowerCase() === needle)
    .sort((a, b) => b.count - a.count || a.town.name.localeCompare(b.town.name));
  const focus = findTown(where);
  const categoryName = new Map((categories ?? []).map((c) => [c.slug, c.name]));
  const eventsNear = (t: Town) => {
    const q = new URLSearchParams({ near: t.name, within: String(DEST_MILES), days: String(DEST_DAYS) });
    if (dest) q.set("category", dest);
    return `/events?${q}`;
  };
  const points: MapPoint[] = destinations.map((d) => ({
    name: d.town.name,
    lat: d.town.lat,
    lng: d.town.lng,
    count: d.count,
    href: eventsNear(d.town),
  }));

  const homeHref = (next: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { near: str("near"), dest, where: where || undefined, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <>
      <Notice params={params} />

      <section className="full-bleed -mt-6 border-b border-rule">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-10 md:pb-16 md:pt-14">
          <h1 className="hero-title m-0 whitespace-pre-line">{site.heroTitle}</h1>
          <p className="m-0 mt-3 max-w-xl text-lg text-subtle">{site.heroIntro}</p>

          <div className="mt-6 md:mt-8">
            <Ridgeline />
          </div>

          <form action="/events" role="search" className="hero-search mt-6 md:mt-8">
            <div>
              <label htmlFor="hero-activity">Activity</label>
              <select id="hero-activity" name="category" defaultValue="">
                <option value="">All activities</option>
                {categories?.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="hero-near">Location</label>
              {/* Anywhere by default: events whose group area isn't a known town only show without a town. */}
              <TownSelect id="hero-near" name="near" defaultValue="" anywhere />
            </div>
            <div>
              <label htmlFor="hero-within">Distance</label>
              <select id="hero-within" name="within" defaultValue="50">
                {distances.map((d) => (
                  <option key={d} value={d}>
                    Within {d} miles
                  </option>
                ))}
              </select>
            </div>
            <button className="button button-hero">Search</button>
          </form>
        </div>
      </section>

      <section aria-labelledby="by-activity" className="border-b border-rule py-10">
        <h2 id="by-activity" className="mt-0 text-center">
          Browse by activity
        </h2>
        <ul className="activity-row mt-6">
          {categories?.map((c) => (
            <li key={c.slug}>
              <Link href={`/c/${c.slug}`} prefetch={false} className="flex flex-col items-center gap-2 text-center text-ink no-underline hover:underline">
                <ActivityIcon slug={c.slug} />
                <span className="text-sm">{c.name}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/browse" className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="text-sm font-bold">Browse all →</span>
            </Link>
          </li>
        </ul>
      </section>

      <section aria-labelledby="near-you" className="py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="near-you" className="mt-0">
            Near {nearTown.name}
          </h2>
          <div className="flex items-baseline gap-4">
            <details className="change-town">
              <summary>Change</summary>
              <form action="/" className="mt-2 flex gap-2">
                <label htmlFor="near-town" className="sr-only">
                  Town
                </label>
                <TownSelect id="near-town" name="near" defaultValue={nearTown.name} />
                {dest && <input type="hidden" name="dest" value={dest} />}
                {where && <input type="hidden" name="where" value={where} />}
                <button className="button">Show</button>
              </form>
            </details>
            <Link href={`/events?near=${encodeURIComponent(nearTown.name)}&within=${NEAR_MILES}`}>all events near {nearTown.name}</Link>
          </div>
        </div>
        {nearby.length ? (
          <ul className="card-row mt-4">
            {nearby.map((e) => {
              const when = dateParts(e.starts_at!, e.timezone!);
              return (
                <li key={e.id} className="card flex flex-col">
                  <div className="flex items-start justify-between">
                    <p className="m-0 leading-tight">
                      <span className="font-serif text-3xl text-heading">{when.day}</span>
                      <br />
                      <span className="text-sm text-muted">
                        {when.weekday}, {when.month} · {when.time}
                      </span>
                    </p>
                    {e.category_slug && (
                      <span>
                        <ActivityIcon slug={e.category_slug} className="h-7 w-7" />
                        <span className="sr-only">{categoryName.get(e.category_slug) ?? e.category_slug}</span>
                      </span>
                    )}
                  </div>
                  <Link href={`/e/${e.id}`} className="mt-3 font-bold">
                    {e.title}
                  </Link>
                  <p className="m-0 mt-1 text-sm text-muted">
                    {e.town?.name ?? e.location_name} · {aboutMiles(e.miles)}
                  </p>
                  <p className="m-0 mt-auto flex justify-between border-t border-rule pt-2 text-sm text-muted">
                    <Link href={`/g/${e.group_slug}`}>{e.group_name}</Link>
                    <span>
                      {e.is_paid && "Paid · "}
                      {e.is_unclaimed ? "via organizer" : e.takes_rsvps ? `${e.going_count} going` : "sign up with the organizer"}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-muted">
            Nothing posted within {NEAR_MILES} miles of {nearTown.name} yet. <Link href="/events">See every event</Link> or{" "}
            <Link href="/groups/new">start a group</Link>.
          </p>
        )}
      </section>

      <section id="destinations" aria-labelledby="destinations-title" className="border-t border-rule py-10">
        <h2 id="destinations-title" className="mt-0">
          Explore destinations
        </h2>
        <p className="m-0 mt-1 text-subtle">Where people are heading next, and what they&rsquo;re doing there.</p>

        <ul className="chip-row mt-4" aria-label="Activity">
          <li>
            <Link href={`${homeHref({ dest: undefined })}#destinations`} className={dest ? "chip" : "chip chip-on"} aria-current={dest ? undefined : "true"}>
              All
            </Link>
          </li>
          {categories?.map((c) => (
            <li key={c.slug}>
              <Link
                href={`${homeHref({ dest: c.slug })}#destinations`}
                prefetch={false}
                className={dest === c.slug ? "chip chip-on" : "chip"}
                aria-current={dest === c.slug ? "true" : undefined}
              >
                <ActivityIcon slug={c.slug} className="h-4 w-4" /> {c.name}
              </Link>
            </li>
          ))}
        </ul>

        <div className="destinations mt-4">
          <div className="destinations-list">
            <form action="/#destinations" role="search" className="border-b border-rule p-3">
              <label htmlFor="dest-where" className="sr-only">
                Search a town
              </label>
              <input id="dest-where" name="where" type="search" defaultValue={where} placeholder={`Search a town, e.g. ${site.exampleArea}`} className="w-full max-w-none" />
              {dest && <input type="hidden" name="dest" value={dest} />}
              {str("near") && <input type="hidden" name="near" value={str("near")} />}
            </form>
            {destinations.length ? (
              <ol>
                {destinations.map((d) => (
                  <li key={d.town.name}>
                    <Link href={eventsNear(d.town)} className="flex items-center justify-between gap-3 px-3 py-2 no-underline hover:bg-band">
                      <span>
                        <span className="font-bold">
                          {d.town.name}, {d.town.state}
                        </span>
                        <span className="mt-0.5 flex gap-1 text-muted">
                          {[...d.activities].slice(0, 4).map((a) => (
                            <span key={a}>
                              <ActivityIcon slug={a} className="h-4 w-4" />
                              <span className="sr-only">{categoryName.get(a) ?? a}</span>
                            </span>
                          ))}
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-sm text-muted">
                        {d.count} event{d.count === 1 ? "" : "s"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="p-3 text-muted">
                No upcoming events{where ? ` matching “${where}”` : ""}.{" "}
                {(where || dest) && <Link href="/#destinations">Show every destination</Link>}
              </p>
            )}
          </div>
          <DestinationMap
            points={points}
            focus={focus ? { lat: focus.lat, lng: focus.lng } : undefined}
            tiles={site.mapTiles}
            center={site.mapCenter}
          />
        </div>
      </section>
    </>
  );
}
