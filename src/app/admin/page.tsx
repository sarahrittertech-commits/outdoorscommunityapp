import type { Metadata } from "next";
import Link from "next/link";

import { removeGroup, resolveReport, suspendUser, unsuspendUser } from "@/app/actions/moderation";
import { Notice } from "@/components/Notice";
import { ReportTarget } from "@/components/ReportTarget";
import { site } from "@/config/site";
import { requireSiteAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPostDate } from "@/lib/time";

export const metadata: Metadata = { title: "Site admin", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** FR-AD-2, FR-MD-3, FR-MD-6. The database refuses all of this to anyone but the site admin. */
export default async function AdminPage({ searchParams }: Props) {
  await requireSiteAdmin();
  const supabase = await createClient();

  const [{ data: reports }, { data: log }, { data: suspended }] = await Promise.all([
    supabase
      .from("reports")
      .select("id, target_type, target_id, reason, note, group_id, created_at, groups(slug, name)")
      .eq("status", "open")
      .order("created_at")
      .limit(100),
    supabase
      .from("moderation_actions")
      .select("id, action, target_type, target_id, reason, created_at, profiles(display_name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("accounts").select("id").not("suspended_at", "is", null),
  ]);

  const tz = site.defaultTimezone;

  return (
    <>
      <h1>Site admin</h1>
      <Notice params={await searchParams} />

      <h2>Open reports ({reports?.length ?? 0})</h2>
      <p className="mt-1 text-sm text-muted">Oldest first. Group organizers see the ones about their own groups too.</p>
      <ul className="mt-2 divide-y divide-rule border-y border-rule">
        {reports?.map((r) => (
          <li key={r.id} className="py-3">
            <p>
              <strong>{r.reason.replace("_", " ")}</strong> · {r.target_type} ·{" "}
              <ReportTarget type={r.target_type} id={r.target_id} groupSlug={r.groups?.slug} />
              {r.groups && (
                <span className="text-sm text-muted">
                  {" "}
                  in <Link href={`/g/${r.groups.slug}`}>{r.groups.name}</Link>
                </span>
              )}
              <span className="ml-2 text-sm text-muted">{formatPostDate(r.created_at, tz)}</span>
            </p>
            {r.note && <p className="mt-1 text-sm">&ldquo;{r.note}&rdquo;</p>}
            <div className="mt-2 flex flex-wrap items-end gap-3 text-sm">
              <form action={resolveReport.bind(null, r.id, "actioned", "/admin")}>
                <button className="button">Dealt with</button>
              </form>
              <form action={resolveReport.bind(null, r.id, "dismissed", "/admin")}>
                <button className="button button-plain">Dismiss</button>
              </form>
              {r.target_type === "profile" && (
                <form action={suspendUser.bind(null, r.target_id)} className="flex items-end gap-2">
                  <input name="reason" type="text" required maxLength={500} placeholder="Reason" aria-label="Reason for suspension" className="mt-0 w-48" />
                  <button className="button button-danger">Suspend account</button>
                </form>
              )}
              {r.target_type === "group" && (
                <form action={removeGroup.bind(null, r.target_id)} className="flex items-end gap-2">
                  <input name="reason" type="text" required maxLength={500} placeholder="Reason" aria-label="Reason for removal" className="mt-0 w-48" />
                  <button className="button button-danger">Remove group</button>
                </form>
              )}
            </div>
          </li>
        ))}
        {!reports?.length && <li className="py-2 text-muted">Nothing to review.</li>}
      </ul>

      <h2>Suspended accounts ({suspended?.length ?? 0})</h2>
      <ul className="mt-2">
        {suspended?.map((s) => (
          <li key={s.id} className="flex items-baseline gap-3">
            <ReportTarget type="profile" id={s.id} />
            <form action={unsuspendUser.bind(null, s.id)}>
              <button className="link-button text-sm">unsuspend</button>
            </form>
          </li>
        ))}
      </ul>

      <h2>Moderation log</h2>
      <p className="mt-1 text-sm text-muted">Latest 50 actions. Entries can&apos;t be edited or deleted.</p>
      <table className="mt-2 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-rule">
            <th className="py-1 pr-3">When</th>
            <th className="py-1 pr-3">Who</th>
            <th className="py-1 pr-3">Action</th>
            <th className="py-1">Reason</th>
          </tr>
        </thead>
        <tbody>
          {log?.map((entry) => (
            <tr key={entry.id} className="border-b border-rule align-top">
              <td className="py-1 pr-3 whitespace-nowrap">{formatPostDate(entry.created_at, tz)}</td>
              <td className="py-1 pr-3">{entry.profiles?.display_name ?? "—"}</td>
              <td className="py-1 pr-3">
                {entry.action.replace("_", " ")} ({entry.target_type})
              </td>
              <td className="py-1">{entry.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
