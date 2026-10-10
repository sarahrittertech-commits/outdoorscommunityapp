import type { Metadata } from "next";
import Link from "next/link";

import { ActivityIcon } from "@/brand/ActivityIcon";
import { GroupTypeIcon } from "@/brand/GroupTypeIcon";
import { EventList } from "@/components/Listings";
import { LocationFilter, UnknownZip } from "@/components/LocationFilter";
import { site } from "@/config/site";
import { distances } from "@/config/towns";
import { milesBetween, resolveLocation, townForArea } from "@/lib/geo";
import { GROUP_TYPES, isGroupType } from "@/lib/groupTypes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Upcoming events",
  description: "Every upcoming event on the board, soonest first, by activity.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const monthFormat = new Intl.DateTimeFormat("en-US", { timeZone: site.defaultTimezone, month: "long", year: "numeric" });

const WINDOWS = [
  { days: 7, label: "next 7 days" },
  { days: 30, label: "next 30 days" },
  { days: 90, label: "next 3 months" },
] as const;

/**
 * FR-BR-4: upcoming events, soonest first, filtered by activity, group type
 * (FR-GR-17), time window, and distance from a town or zip code (FR-BR-12).
 */
export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;
  const days = WINDOWS.find((w) => String(w.days) === params.days)?.days ?? 30;
  const type = isGroupType(params.type) ? params.type : undefined;
  // UC-14: near a town or zip code the visitor gives, never their device's location.
  const location = resolveLocation(params.near, params.zip);
  const near = location.town;
  const place = near && (location.zip ? `${location.zip} (${near.name})` : near.name);
  const within = distances.find((d) => String(d) === params.within) ?? 50;

  const supabase = await createClient();
  // event_listings doesn't carry the group's type or town, so both come from
  // the groups themselves. The type filter goes to the database as a list of
  // group slugs, so it holds past the 300-row page like the activity filter.
  const { data: groupRows } = await supabase.from("groups").select("slug, area, group_type");
  const typeOf = new Map((groupRows ?? []).map((g) => [g.slug, g.group_type]));
  const ofType = (groupSlug: string | null) => !type || typeOf.get(groupSlug ?? "") === type;
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // TR-SEC-12: the activity filter and the sidebar counts both go to the
  // database. Filtering a truncated page in here used to hide events past the
  // 300th and cap every count at whatever landed in those first rows.
  const startsInWindow = { from: now.toISOString(), to: until.toISOString() };

  let listing = supabase
    .from("event_listings")
    .select(
      "id, title, starts_at, timezone, group_name, group_slug, category_slug, location_name, status, going_count, is_unclaimed, is_paid, takes_rsvps",
    )
    .eq("status", "scheduled")
    .gt("starts_at", startsInWindow.from)
    .lt("starts_at", startsInWindow.to);
  if (category) listing = listing.eq("category_slug", category);
  if (type) listing = listing.in("group_slug", (groupRows ?? []).filter((g) => g.group_type === type).map((g) => g.slug));

  const [{ data: all }, { data: categories }, { data: countRows }] = await Promise.all([
    listing.order("starts_at").limit(300),
    supabase.from("categories").select("slug, name").order("sort_order"),
    supabase
      .from("event_listings")
      .select("category_slug, group_slug")
      .eq("status", "scheduled")
      .gt("starts_at", startsInWindow.from)
      .lt("starts_at", startsInWindow.to),
  ]);

  // Distance from the chosen town to each event's group town.
  const milesOf = new Map<string, number>();
  if (near) {
    for (const g of groupRows ?? []) {
      const t = townForArea(g.area);
      if (t) milesOf.set(g.slug, milesBetween(near, t));
    }
  }
  const inRange = (groupSlug: string | null) => !near || (milesOf.get(groupSlug ?? "") ?? Infinity) <= within;
  const events = (all ?? []).filter((e) => inRange(e.group_slug));

  // Counts for the sidebar: over the whole window, not the page. Each list
  // counts what its links would show: activities under the chosen type and
  // place, types under the chosen activity and place.
  const placed = (countRows ?? []).filter((r) => inRange(r.group_slug));
  const counts = new Map<string, number>();
  for (const e of placed.filter((r) => ofType(r.group_slug))) counts.set(e.category_slug ?? "", (counts.get(e.category_slug ?? "") ?? 0) + 1);
  // "all" is every activity together, whichever one is picked.
  const allCount = [...counts.values()].reduce((a, b) => a + b, 0);
  const typeCounts = new Map<string, number>();
  for (const e of placed.filter((r) => !category || r.category_slug === category)) {
    const t = typeOf.get(e.group_slug ?? "");
    if (t) typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }
  const anyTypeCount = placed.filter((r) => !category || r.category_slug === category).length;

  // Near a town, events whose group area isn't a known town have no
  // distance, so they drop out; the page says how many (UC-14).
  const unplaced = near
    ? (countRows ?? []).filter((r) => (!category || r.category_slug === category) && ofType(r.group_slug) && !milesOf.has(r.group_slug ?? ""))
        .length
    : 0;

  // Group by month, in the board's time zone.
  const monthOf = (iso: string) => monthFormat.format(new Date(iso));
  const months: { label: string; events: typeof events }[] = [];
  for (const e of events) {
    const label = monthOf(e.starts_at!);
    if (months.at(-1)?.label !== label) months.push({ label, events: [] });
    months.at(-1)!.events.push(e);
  }

  const href = (next: { category?: string; type?: string; days?: number; anywhere?: boolean }) => {
    const q = new URLSearchParams();
    const c = "category" in next ? next.category : category;
    const t = "type" in next ? next.type : type;
    const d = next.days ?? days;
    if (c) q.set("category", c);
    if (t) q.set("type", t);
    if (d !== 30) q.set("days", String(d));
    if (near && !next.anywhere) {
      if (location.zip) q.set("zip", location.zip);
      else q.set("near", near.name);
      q.set("within", String(within));
    }
    const s = q.toString();
    return s ? `/events?${s}` : "/events";
  };

  const current = categories?.find((c) => c.slug === category);
  const typeLabel = GROUP_TYPES.find((t) => t.value === type)?.label;

  const filters = (where: string) => (
    <>
      <form action="/search" role="search">
        <label htmlFor={`events-q-${where}`} className="mt-0">
          keyword
        </label>
        <div className="flex gap-1">
          <input id={`events-q-${where}`} name="q" type="search" placeholder="waterfall, beginner…" className="mt-1 min-w-0 flex-1 py-1 text-sm" />
          <button className="button mt-1 px-2 py-1 text-sm">go</button>
        </div>
      </form>

      <h2 className="filter-heading">location</h2>
      <LocationFilter
        action="/events"
        idPrefix={`events-${where}`}
        keep={{ category, type, days: days !== 30 ? String(days) : undefined }}
        town={location.zip ? undefined : near?.name}
        zip={location.zip ?? location.unknownZip}
        within={within}
      />

      <h2 className="filter-heading">activity</h2>
      <ul className="mt-1 space-y-0.5">
        <li>
          {category ? <Link href={href({ category: undefined })}>all</Link> : <strong>all</strong>}{" "}
          <span className="text-muted">({allCount})</span>
        </li>
        {categories?.map((c) => (
          <li key={c.slug}>
            {c.slug === category ? (
              <strong>{c.name}</strong>
            ) : (
              <Link href={href({ category: c.slug })} prefetch={false}>
                {c.name}
              </Link>
            )}{" "}
            <span className="text-muted">({counts.get(c.slug) ?? 0})</span>
          </li>
        ))}
      </ul>

      {/* FR-GR-17: plain links, so the filter works without JavaScript. */}
      <h2 className="filter-heading">type</h2>
      <ul className="mt-1 space-y-0.5">
        <li>
          {type ? <Link href={href({ type: undefined })}>any</Link> : <strong>any</strong>}{" "}
          <span className="text-muted">({anyTypeCount})</span>
        </li>
        {GROUP_TYPES.map((t) => (
          <li key={t.value}>
            {t.value === type ? (
              <strong>
                <GroupTypeIcon type={t.value} />
              </strong>
            ) : (
              <Link href={href({ type: t.value })} prefetch={false}>
                <GroupTypeIcon type={t.value} />
              </Link>
            )}{" "}
            <span className="text-muted">({typeCounts.get(t.value) ?? 0})</span>
          </li>
        ))}
      </ul>

      <h2 className="filter-heading">when</h2>
      <ul className="mt-1 space-y-0.5">
        {WINDOWS.map((w) => (
          <li key={w.days}>{w.days === days ? <strong>{w.label}</strong> : <Link href={href({ days: w.days })}>{w.label}</Link>}</li>
        ))}
      </ul>
    </>
  );

  return (
    // The h1 comes first in the source; grid placement puts the filters on the left.
    <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
      <div className="md:col-start-2 md:row-start-1">
        <h1 className="m-0 flex items-center gap-3">
          {current && <ActivityIcon slug={current.slug} />}
          {current ? `${current.name} events` : "Events"}
          {near ? ` near ${place}` : ""}
          {typeLabel && <span className="text-subtle"> · {typeLabel}</span>}
        </h1>
        <p className="mt-2 border-b border-rule pb-3 text-subtle">
          {events.length} upcoming in the {WINDOWS.find((w) => w.days === days)!.label}
          {near ? `, within ${within} miles of ${place}` : ""}, soonest first
        </p>
        {location.unknownZip && <UnknownZip zip={location.unknownZip} fallback={near?.name} />}
        {unplaced > 0 && (
          <p className="mt-2 text-sm text-muted">
            {unplaced} event{unplaced === 1 ? "" : "s"} without a known town {unplaced === 1 ? "isn’t" : "aren’t"} shown —{" "}
            <Link href={href({ anywhere: true })}>see all events</Link>
          </p>
        )}
        {months.length ? (
          months.map((m) => (
            <section key={m.label} aria-label={m.label}>
              <h2 className="section-bar">{m.label}</h2>
              <EventList events={m.events} />
            </section>
          ))
        ) : (
          <p className="mt-4 text-muted">
            Nothing scheduled{current ? ` for ${current.name.toLowerCase()}` : ""}
            {typeLabel ? ` by a ${typeLabel.toLowerCase()}` : ""} in this window.{" "}
            {days !== 90 && <Link href={href({ days: 90 })}>Look further ahead</Link>}
          </p>
        )}
      </div>

      {/* Phones: the filters fold into a card above the list, open until a filter is picked. Computers: a side column. */}
      <details className="filter-card order-first text-sm md:hidden" open={!category && !type}>
        <summary>{!category && !type ? "Browse by activity, type and date" : "Change filters"}</summary>
        <div>{filters("card")}</div>
      </details>
      <aside aria-label="Filters" className="hidden text-sm md:col-start-1 md:row-start-1 md:block">
        {filters("side")}
      </aside>
    </div>
  );
}
