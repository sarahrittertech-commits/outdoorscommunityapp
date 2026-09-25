import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveReport } from "@/app/actions/moderation";
import { Notice } from "@/components/Notice";
import { ReportTarget } from "@/components/ReportTarget";
import { site } from "@/config/site";
import { requireViewer } from "@/lib/auth";
import { loadGroup } from "@/lib/groups";
import { formatPostDate } from "@/lib/time";

export const metadata: Metadata = { title: "Reports", robots: { index: false } };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** FR-MD-2: a group's own report queue, oldest first. */
export default async function GroupReportsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  await requireViewer(`/g/${slug}/reports`);
  const { supabase, group, canManage } = await loadGroup(slug);
  if (!canManage) redirect(`/g/${slug}?e=not_allowed`);

  const { data: reports } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, note, created_at")
    .eq("group_id", group.id)
    .eq("status", "open")
    .order("created_at");

  const path = `/g/${group.slug}/reports`;

  return (
    <>
      <p className="text-sm">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> ›
      </p>
      <h1>Reports</h1>
      <p className="mt-1 text-sm text-muted">
        Reports about events and posts in this group. Remove what breaks your rules, then close the report. The site
        admin sees these too.
      </p>
      <Notice params={await searchParams} />
      {!reports?.length ? (
        <p className="mt-4">No open reports.</p>
      ) : (
        <ul className="mt-4 divide-y divide-rule border-y border-rule">
          {reports.map((r) => (
            <li key={r.id} className="py-3">
              <p>
                <strong>{r.reason.replace("_", " ")}</strong> · {r.target_type} ·{" "}
                <ReportTarget type={r.target_type} id={r.target_id} groupSlug={group.slug} />
                <span className="ml-2 text-sm text-muted">{formatPostDate(r.created_at, site.defaultTimezone)}</span>
              </p>
              {r.note && <p className="mt-1 text-sm">&ldquo;{r.note}&rdquo;</p>}
              <div className="mt-2 flex gap-3 text-sm">
                <form action={resolveReport.bind(null, r.id, "actioned", path)}>
                  <button className="button">Dealt with</button>
                </form>
                <form action={resolveReport.bind(null, r.id, "dismissed", path)}>
                  <button className="button button-plain">Dismiss</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
