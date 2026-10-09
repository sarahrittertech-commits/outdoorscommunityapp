import type { Metadata } from "next";
import Link from "next/link";

import { ActivityIcon } from "@/brand/ActivityIcon";
import { EventList } from "@/components/Listings";
import { site } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Upcoming events",
  description: "Every upcoming event on the board, soonest first, by activity.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const WINDOWS = [
  { days: 7, label: "next 7 days" },
  { days: 30, label: "next 30 days" },
  { days: 90, label: "next 3 months" },
] as const;

/** FR-BR-4: upcoming events, soonest first, filtered by activity and time window. */
export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;
  const days = WINDOWS.find((w) => String(w.days) === params.days)?.days ?? 30;

  const supabase = await createClient();
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // TR-SEC-12: the activity filter and the sidebar counts both go to the
  // database. Filtering a truncated page in here used to hide events past the
  // 300th and cap every count at whatever landed in those first rows.
  const startsInWindow = { from: now.toISOString(), to: until.toISOString() };

  let listing = supabase
    .from("event_listings")
    .select(
      "id, title, starts_at, timezone, group_name, group_slug, category_slug, location_name, status, going_count, is_unclaimed",
    )
    .eq("status", "scheduled")
    .gt("starts_at", startsInWindow.from)
    .lt("starts_at", startsInWindow.to);
  if (category) listing = listing.eq("category_slug", category);

  const [{ data: all }, { data: categories }, { data: countRows }] = await Promise.all([
    listing.order("starts_at").limit(300),
    supabase.from("categories").select("slug, name").order("sort_order"),
    supabase
      .from("event_listings")
      .select("category_slug")
      .eq("status", "scheduled")
      .gt("starts_at", startsInWindow.from)
      .lt("starts_at", startsInWindow.to),
  ]);
  const events = all ?? [];

  // Counts per activity, for the sidebar: over the whole window, not the page.
  const counts = new Map<string, number>();
  for (const e of countRows ?? []) counts.set(e.category_slug ?? "", (counts.get(e.category_slug ?? "") ?? 0) + 1);

  // Group by month, in the board's time zone.
  const monthOf = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: site.defaultTimezone, month: "long", year: "numeric" }).format(new Date(iso));
  const months: { label: string; events: typeof events }[] = [];
  for (const e of events) {
    const label = monthOf(e.starts_at!);
    if (months.at(-1)?.label !== label) months.push({ label, events: [] });
    months.at(-1)!.events.push(e);
  }

  const href = (next: { category?: string; days?: number }) => {
    const q = new URLSearchParams();
    const c = "category" in next ? next.category : category;
    const d = next.days ?? days;
    if (c) q.set("category", c);
    if (d !== 30) q.set("days", String(d));
    const s = q.toString();
    return s ? `/events?${s}` : "/events";
  };

  const current = categories?.find((c) => c.slug === category);

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

      <h2 className="filter-heading">activity</h2>
      <ul className="mt-1 space-y-0.5">
        <li>
          {category ? <Link href={href({ category: undefined })}>all</Link> : <strong>all</strong>}{" "}
          <span className="text-muted">({all?.length ?? 0})</span>
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

      <h2 className="filter-heading">when</h2>
      <ul className="mt-1 space-y-0.5">
        {WINDOWS.map((w) => (
          <li key={w.days}>{w.days === days ? <strong>{w.label}</strong> : <Link href={href({ days: w.days })}>{w.label}</Link>}</li>
        ))}
      </ul>
    </>
  );

  return (
    <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
      {/* Phones: the filters fold into a card, open until a filter is picked. Computers: a side column. */}
      <details className="filter-card text-sm md:hidden" open={!category}>
        <summary>{!category ? "Browse by activity and date" : "Change activity or date"}</summary>
        <div>{filters("card")}</div>
      </details>
      <aside aria-label="Filters" className="hidden text-sm md:block">
        {filters("side")}
      </aside>

      <div>
        <h1 className="m-0 flex items-center gap-3">
          {current && <ActivityIcon slug={current.slug} />}
          {current ? `${current.name} events` : "Events"}
        </h1>
        <p className="mt-2 border-b border-rule pb-3 text-subtle">
          {events.length} upcoming in the {WINDOWS.find((w) => w.days === days)!.label}, soonest first
        </p>
        {months.length ? (
          months.map((m) => (
            <section key={m.label} aria-label={m.label}>
              <h2 className="section-bar">{m.label}</h2>
              <EventList events={m.events} />
            </section>
          ))
        ) : (
          <p className="mt-4 text-muted">
            Nothing scheduled{current ? ` for ${current.name.toLowerCase()}` : ""} in this window.{" "}
            {days !== 90 && <Link href={href({ days: 90 })}>Look further ahead</Link>}
          </p>
        )}
      </div>
    </div>
  );
}
