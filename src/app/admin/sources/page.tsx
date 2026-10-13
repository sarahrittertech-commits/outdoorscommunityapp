import type { Metadata } from "next";
import Link from "next/link";

import { addEventSource, setEventSourceStatus } from "@/app/actions/sources";
import { Notice } from "@/components/Notice";
import { requireSiteAdmin } from "@/lib/auth";
import { getRegion } from "@/lib/regions";
import { SOURCE_KIND_LABEL, SOURCE_KINDS, SOURCE_STATUS_LABEL, type SourceKind } from "@/lib/sources";
import { createClient } from "@/lib/supabase/server";
import { formatPostDate } from "@/lib/time";

export const metadata: Metadata = { title: "Event sources", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * UC-39, FR-ES-1, FR-ES-2, FR-ES-5, FR-ES-9: where each region's hosts post
 * dates, how well the weekly reader covers them, and what it changed. The
 * database refuses all of this to anyone but the site admin.
 */
export default async function EventSourcesPage({ searchParams }: Props) {
  await requireSiteAdmin();
  const supabase = await createClient();
  const params = await searchParams;
  const regionSlug = typeof params.region === "string" ? params.region : null;

  const [{ data: coverage }, { data: changes }] = await Promise.all([
    supabase.rpc("admin_source_coverage"),
    supabase.rpc("admin_event_changes", { p_limit: 30 }),
  ]);
  const region = coverage?.find((r) => r.region_slug === regionSlug) ?? null;
  const tz = getRegion(region?.region_slug)?.timezone ?? "America/New_York";
  const { data: sources } = await supabase.rpc("admin_event_sources", { p_region_id: region?.region_id ?? null });

  return (
    <>
      <p className="breadcrumb">
        <Link href="/admin">Site admin</Link> ›
      </p>
      <h1>Event sources</h1>
      <Notice params={params} />
      <p className="mt-1 text-sm text-muted">
        Every Monday the reader reads each active source: a listed host&apos;s own page, calendar feed, sign-up page, Meetup group or
        park programs. New dated events from the host go on the board; moved times and cancellations are updated and logged below.
        Groups that have been claimed are left to their organizers.
      </p>

      <h2>Coverage</h2>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-1 pr-3">Region</th>
              <th className="py-1 pr-3">Hosts</th>
              <th className="py-1 pr-3">With a source</th>
              <th className="py-1 pr-3">Read this week</th>
              <th className="py-1 pr-3">Need you</th>
              <th className="py-1 pr-3">Events: organizers</th>
              <th className="py-1">Events: research</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule border-y border-rule">
            {coverage?.map((r) => (
              <tr key={r.region_id} className={r.region_slug === regionSlug ? "is-current" : undefined}>
                <td className="py-1 pr-3">
                  <Link href={`/admin/sources?region=${r.region_slug}`}>{r.region_name}</Link>
                </td>
                <td className="py-1 pr-3">{r.hosts}</td>
                <td className="py-1 pr-3">{r.hosts_with_source}</td>
                <td className="py-1 pr-3">{r.sources_read_this_week}</td>
                <td className="py-1 pr-3">{r.needs_attention}</td>
                <td className="py-1 pr-3">{r.events_by_organizers}</td>
                <td className="py-1">{r.events_by_research}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>{region ? `Sources in ${region.region_name}` : "Sources that need you"}</h2>
      {region ? (
        <p className="mt-1 text-sm text-muted">
          <Link href="/admin/sources">Show only the quiet and broken sources</Link>
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">Quiet and broken sources in every region. Pick a region above to see all of its sources.</p>
      )}
      <ul className="mt-2 divide-y divide-rule border-y border-rule">
        {sources?.map((s) => (
          <li key={s.id} className="py-2 text-sm">
            <p>
              <strong>{s.host_name}</strong>{" "}
              <span className="text-muted">
                · {SOURCE_KIND_LABEL[s.kind as SourceKind] ?? s.kind} · {SOURCE_STATUS_LABEL[s.status] ?? s.status} · {s.events_given} events
                given
              </span>
            </p>
            <p className="mt-1 break-all">
              <a href={s.url} rel="nofollow noopener">
                {s.url}
              </a>
            </p>
            <p className="mt-1 text-muted">
              {s.last_read_at ? `Read ${formatPostDate(s.last_read_at, tz)}: ${s.last_result ?? "no result"}` : "Not read yet"}
            </p>
            <form action={setEventSourceStatus.bind(null, s.id, s.status === "active" ? "retired" : "active")} className="mt-1">
              <button className="button button-plain">{s.status === "active" ? "Retire" : "Make active"}</button>
            </form>
          </li>
        ))}
        {!sources?.length && <li className="py-2 text-muted">{region ? "No sources yet." : "Nothing needs you."}</li>}
      </ul>

      <h2>Add a source</h2>
      <form action={addEventSource} className="mt-2 grid max-w-xl gap-2 text-sm">
        <label htmlFor="source-host">
          Host, as <code>group:slug</code> or <code>business:slug</code> (the end of its page address)
        </label>
        <input id="source-host" name="host" required placeholder="group:pisgah-area-sorba" />
        <label htmlFor="source-url">Page or feed address</label>
        <input id="source-url" name="url" type="url" required maxLength={500} placeholder="https://example.org/events" />
        <label htmlFor="source-kind">Kind</label>
        <select id="source-kind" name="kind" defaultValue="own_page">
          {SOURCE_KINDS.map((k) => (
            <option key={k} value={k}>
              {SOURCE_KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <button className="button w-fit">Add source</button>
      </form>

      <h2>Changes the reader made</h2>
      <ul className="mt-2 divide-y divide-rule border-y border-rule">
        {changes?.map((c, i) => (
          <li key={i} className="py-2 text-sm">
            <strong>{c.title}</strong> <span className="text-muted">· {c.host_name}</span>
            <p className="mt-1">
              {c.what === "cancelled" ? "Cancelled on its page." : `${c.what === "time" ? "Time" : "Place"}: ${c.old_value} → ${c.new_value}`}
            </p>
            <p className="mt-1 text-muted">{formatPostDate(c.changed_at, tz)}</p>
          </li>
        ))}
        {!changes?.length && <li className="py-2 text-muted">No changes yet.</li>}
      </ul>
    </>
  );
}
