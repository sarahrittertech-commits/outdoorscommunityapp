import Link from "next/link";

import { ActivityIcon } from "@/components/ActivityIcon";
import { Notice } from "@/components/Notice";
import { RidgeBand } from "@/components/RidgeBand";
import { site } from "@/config/site";
import { createClient } from "@/lib/supabase/server";
import { dateParts } from "@/lib/time";

/**
 * The front door: search, the activities as line drawings, and what's coming
 * up. The full Craigslist-style directory is one click away at /browse.
 */
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const [{ data: categories }, { data: events }] = await Promise.all([
    supabase.from("categories").select("slug, name").order("sort_order"),
    supabase
      .from("event_listings")
      .select("id, title, starts_at, timezone, group_name, group_slug, category_slug, location_name, going_count, is_unclaimed")
      .eq("status", "scheduled")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(8),
  ]);

  return (
    <>
      <Notice params={await searchParams} />

      <div className="-mt-6">
        <RidgeBand>
          <h1 className="ridge-title m-0 text-4xl sm:text-5xl">{site.heroTitle}</h1>
          <p className="ridge-tagline m-0 mt-3 max-w-xl text-lg">{site.heroIntro}</p>

          <form action="/search" role="search" className="hero-search mt-8">
            <label htmlFor="hero-category" className="sr-only">
              Activity
            </label>
            <select id="hero-category" name="category" defaultValue="">
              <option value="">All activities</option>
              {categories?.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <label htmlFor="hero-q" className="sr-only">
              Looking for
            </label>
            <input id="hero-q" name="q" type="search" placeholder={site.searchPlaceholder} />
            <button className="button button-hero">Search</button>
          </form>
        </RidgeBand>
      </div>

      <section aria-labelledby="by-activity" className="border-b border-rule py-10">
        <h2 id="by-activity" className="mt-0 text-center">
          Browse by activity
        </h2>
        <ul className="mt-6 grid grid-cols-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
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

      <section aria-labelledby="coming-up" className="py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="coming-up" className="mt-0">
            Coming up in {site.regionName}
          </h2>
          <Link href="/events">all events</Link>
        </div>
        {events && events.length ? (
          <ul className="card-row mt-4">
            {events.map((e) => {
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
                    {e.category_slug && <ActivityIcon slug={e.category_slug} className="h-7 w-7" />}
                  </div>
                  <Link href={`/e/${e.id}`} className="mt-3 font-bold">
                    {e.title}
                  </Link>
                  <p className="m-0 mt-1 text-sm text-muted">{e.location_name}</p>
                  <p className="m-0 mt-auto flex justify-between border-t border-rule pt-2 text-sm text-muted">
                    <Link href={`/g/${e.group_slug}`}>{e.group_name}</Link>
                    <span>{e.is_unclaimed ? "via organizer" : `${e.going_count} going`}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-muted">
            Nothing posted yet. <Link href="/groups/new">Start a group</Link> and post the first event.
          </p>
        )}
      </section>
    </>
  );
}
