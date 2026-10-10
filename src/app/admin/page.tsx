import type { Metadata } from "next";
import Link from "next/link";

import { listCandidate, skipCandidate } from "@/app/actions/candidates";
import { approveClaim, declineClaim } from "@/app/actions/claims";
import { approveNewGroup, declineNewGroup, removeGroup, resolveReport, suspendUser, unsuspendUser } from "@/app/actions/moderation";
import { setSuggestionStatus } from "@/app/actions/suggestions";
import { AffinityTags } from "@/components/AffinityTags";
import { Notice } from "@/components/Notice";
import { ReportTargetLink, resolveReportTargets } from "@/components/ReportTarget";
import { site } from "@/config/site";
import { requireSiteAdmin } from "@/lib/auth";
import { siteAdminOnlyReports } from "@/lib/reports";
import { SUGGESTION_KIND_LABELS, SUGGESTION_STATUS_LABELS } from "@/lib/suggestions";
import { createClient } from "@/lib/supabase/server";
import { formatPostDate } from "@/lib/time";
import { SUGGESTION_KINDS } from "@/lib/validation";

export const metadata: Metadata = { title: "Site admin", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** FR-AD-2, FR-AD-6, FR-MD-3, FR-MD-6. The database refuses all of this to anyone but the site admin. */
export default async function AdminPage({ searchParams }: Props) {
  await requireSiteAdmin();
  const supabase = await createClient();
  const params = await searchParams;
  // FR-AD-6: ?kind= filters the suggestions; anything else shows them all.
  const kind = SUGGESTION_KINDS.find((k) => k === params.kind) ?? null;
  const back = kind ? `/admin?kind=${kind}#suggestions` : "/admin#suggestions";

  let suggestionQuery = supabase
    .from("suggestions")
    .select("id, user_id, kind, title, details, link, status, admin_note, created_at, profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (kind) suggestionQuery = suggestionQuery.eq("kind", kind);

  const [{ data: reports }, { data: log }, { data: suspended }, { data: claims }, { data: candidates }, { data: kept }, { data: newGroups }] = await Promise.all([
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
    supabase
      .from("group_claims")
      .select("id, user_id, note, created_at, groups(slug, name, source_url), profiles!group_claims_user_id_fkey(display_name)")
      .eq("status", "pending")
      .order("created_at")
      .limit(100),
    supabase.rpc("admin_candidates"),
    supabase.rpc("admin_candidate_counts"),
    // FR-GR-21: first groups waiting for review, oldest first.
    supabase
      .from("groups")
      .select("id, slug, name, description, area, created_at, subcategories(name), group_members(role, user_id, profiles(display_name))")
      .eq("review_status", "pending")
      .eq("group_members.role", "owner")
      .order("created_at")
      .limit(100),
  ]);
  const { data: suggestions } = await suggestionQuery;

  // Every report target and suspended profile in one batch, not one query per row.
  const targets = await resolveReportTargets(supabase, [
    ...(reports ?? []).map((r) => ({ type: r.target_type, id: r.target_id, groupSlug: r.groups?.slug })),
    ...(suspended ?? []).map((s) => ({ type: "profile" as const, id: s.id })),
  ]);

  const tz = site.defaultTimezone;
  // Reports about an organizer's own post reach only you (resolve_report's own_content rule).
  const organizerPosts = await siteAdminOnlyReports(supabase, reports ?? [], "");

  return (
    <>
      <h1>Site admin</h1>
      <Notice params={params} />

      <h2>Open reports ({reports?.length ?? 0})</h2>
      <p className="mt-1 text-sm text-muted">Oldest first. Group organizers see the ones about their own groups too.</p>
      <ul className="mt-2 divide-y divide-rule border-y border-rule">
        {reports?.map((r) => (
          <li key={r.id} className="py-3">
            <p>
              <strong>{r.reason.replace("_", " ")}</strong> · {r.target_type} ·{" "}
              <ReportTargetLink targets={targets} type={r.target_type} id={r.target_id} />
              {r.groups && (
                <span className="text-sm text-muted">
                  {" "}
                  in <Link href={`/g/${r.groups.slug}`}>{r.groups.name}</Link>
                </span>
              )}
              <span className="ml-2 text-sm text-muted">{formatPostDate(r.created_at, tz)}</span>
            </p>
            {r.note && <p className="mt-1 text-sm">&ldquo;{r.note}&rdquo;</p>}
            {organizerPosts.has(r.id) && (
              <p className="mt-1 text-sm text-muted">About an organizer&apos;s own post, so only you can close it.</p>
            )}
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

      <h2 id="new-groups">New groups ({newGroups?.length ?? 0})</h2>
      <p className="mt-1 text-sm text-muted">
        A person&apos;s first group waits here before it&apos;s listed, oldest first. Check it&apos;s a real outdoor group. Once one of their
        groups is approved, their next ones are listed at once. A reason for declining is shown to its page admin.
      </p>
      <ul className="mt-2 divide-y divide-rule border-y border-rule">
        {newGroups?.map((g) => {
          const owner = g.group_members?.[0];
          return (
            <li key={g.id} className="py-3">
              <p>
                <Link href={`/g/${g.slug}`}>
                  <strong>{g.name}</strong>
                </Link>{" "}
                <span className="text-sm text-muted">
                  · {g.subcategories?.name} · {g.area} · by{" "}
                  {owner ? <Link href={`/u/${owner.user_id}`}>{owner.profiles?.display_name ?? "deleted user"}</Link> : "nobody"} ·{" "}
                  {formatPostDate(g.created_at, tz)}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-line text-sm">{g.description}</p>
              <div className="mt-2 flex flex-wrap items-end gap-3 text-sm">
                <form action={approveNewGroup.bind(null, g.id)}>
                  <button className="button">Approve</button>
                </form>
                <form action={declineNewGroup.bind(null, g.id)} className="flex items-end gap-2">
                  <input name="reason" type="text" required maxLength={500} placeholder="Reason" aria-label="Reason for declining" className="mt-0 w-64" />
                  <button className="button button-plain">Decline</button>
                </form>
              </div>
            </li>
          );
        })}
        {!newGroups?.length && <li className="py-2 text-muted">No new groups waiting.</li>}
      </ul>

      <h2>Claim requests ({claims?.length ?? 0})</h2>
      <p className="mt-1 text-sm text-muted">
        People asking to run an unclaimed listing, or a group whose page admin deleted their account. Check them against the group&apos;s own
        website or its members before approving: the claimant becomes its page admin.
      </p>
      <ul className="mt-2 divide-y divide-rule border-y border-rule">
        {claims?.map((c) => (
          <li key={c.id} className="py-3">
            <p>
              <Link href={`/u/${c.user_id}`}>{c.profiles?.display_name ?? "deleted user"}</Link> wants to claim{" "}
              {c.groups && <Link href={`/g/${c.groups.slug}`}>{c.groups.name}</Link>}
              {c.groups?.source_url && (
                <span className="text-sm">
                  {" "}
                  (<a href={c.groups.source_url} rel="nofollow noopener">their website</a>)
                </span>
              )}
              <span className="ml-2 text-sm text-muted">{formatPostDate(c.created_at, tz)}</span>
            </p>
            <p className="mt-1 text-sm">&ldquo;{c.note}&rdquo;</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <form action={approveClaim.bind(null, c.id)}>
                <button className="button">Approve</button>
              </form>
              <form action={declineClaim.bind(null, c.id)}>
                <button className="button button-plain">Decline</button>
              </form>
            </div>
          </li>
        ))}
        {!claims?.length && <li className="py-2 text-muted">No claims waiting.</li>}
      </ul>

      <h2>Candidates ({candidates?.length ?? 0})</h2>
      <p className="mt-1 text-sm text-muted">
        Groups the weekly research agent found, oldest first. Check each against its source page; ones tagged <em>possible duplicate</em> look like something already on the board. <em>List it</em> puts it on the board as
        an unclaimed listing with its upcoming events; <em>Skip</em> means it won&apos;t be suggested again.
      </p>
      <ul className="mt-2 divide-y divide-rule border-y border-rule">
        {candidates?.map((c) => (
          <li key={c.id} className="py-3">
            <p>
              <strong>{c.name}</strong> <span className="text-sm text-muted">· {c.subcategory_name} · {c.area}</span>
              <AffinityTags tags={c.affinity_tags} className="ml-2 align-middle" />
              {c.out_of_region && <span className="tag ml-2">outside the region</span>}
              {c.possible_duplicate_of && <span className="tag tag-new ml-2">possible duplicate</span>}
            </p>
            {c.possible_duplicate_of && (
              <p className="mt-1 text-sm">
                May be the same as <strong>{c.possible_duplicate_of}</strong>
                {c.possible_duplicate_url && (
                  <>
                    {" "}
                    (
                    <a href={c.possible_duplicate_url} rel="nofollow noopener">
                      {c.possible_duplicate_url}
                    </a>
                    )
                  </>
                )}
                . Compare the two before listing; skip it if it&apos;s the same.
              </p>
            )}
            <p className="mt-1 text-sm">{c.description}</p>
            <p className="mt-1 text-sm text-muted">
              <a href={c.source_url} rel="nofollow noopener">
                {c.source_url}
              </a>{" "}
              · {c.upcoming_events} upcoming {c.upcoming_events === 1 ? "event" : "events"} · found {formatPostDate(c.found_at, tz)}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <form action={listCandidate.bind(null, c.id)}>
                <button className="button">List it</button>
              </form>
              <form action={skipCandidate.bind(null, c.id)}>
                <button className="button button-plain">Skip</button>
              </form>
            </div>
          </li>
        ))}
        {!candidates?.length && <li className="py-2 text-muted">No new candidates.</li>}
      </ul>
      {Boolean(kept?.length) && (
        <p className="mt-2 text-sm text-muted">
          Kept in the research area for later: {kept!.map((k) => `${k.kept} ${k.kept === 1 ? k.kind : k.kind === "business" ? "businesses" : `${k.kind}s`}`).join(", ")}.
        </p>
      )}

      <h2 id="suggestions">Suggestions ({suggestions?.length ?? 0})</h2>
      <p className="mt-1 text-sm text-muted">
        From members, newest first. Only you and the sender can read them. Your note is shown to the sender under My stuff.
      </p>
      <p className="mt-2 flex flex-wrap gap-x-3 text-sm">
        Show:{" "}
        {kind ? <Link href="/admin#suggestions">all</Link> : <strong>all</strong>}
        {SUGGESTION_KINDS.map((k) =>
          k === kind ? (
            <strong key={k}>{SUGGESTION_KIND_LABELS[k].toLowerCase()}</strong>
          ) : (
            <Link key={k} href={`/admin?kind=${k}#suggestions`}>
              {SUGGESTION_KIND_LABELS[k].toLowerCase()}
            </Link>
          ),
        )}
      </p>
      <ul className="mt-2 divide-y divide-rule border-y border-rule">
        {suggestions?.map((s) => (
          <li key={s.id} className="py-3">
            <p>
              <strong>{s.title}</strong>{" "}
              <span className="text-sm text-muted">
                · {SUGGESTION_KIND_LABELS[s.kind]} · from{" "}
                {s.user_id ? <Link href={`/u/${s.user_id}`}>{s.profiles?.display_name ?? "deleted user"}</Link> : "deleted user"} ·{" "}
                {formatPostDate(s.created_at, tz)}
              </span>
              <span className={s.status === "new" ? "tag tag-new ml-2" : "tag ml-2"}>{SUGGESTION_STATUS_LABELS[s.status]}</span>
            </p>
            {s.details && <p className="mt-1 whitespace-pre-line text-sm">{s.details}</p>}
            {s.link && (
              <p className="mt-1 text-sm">
                <a href={s.link} rel="nofollow noopener noreferrer">
                  {s.link}
                </a>
              </p>
            )}
            <form action={setSuggestionStatus.bind(null, s.id, back)} className="mt-2 flex flex-wrap items-end gap-2 text-sm">
              <select name="status" aria-label="Status" defaultValue={s.status === "new" ? "planned" : s.status} className="mt-0 w-auto">
                <option value="planned">Planned</option>
                <option value="done">Done</option>
                <option value="declined">Declined</option>
              </select>
              <input
                name="note"
                type="text"
                maxLength={500}
                defaultValue={s.admin_note ?? ""}
                placeholder="Note to the sender (optional)"
                aria-label="Note to the sender"
                className="mt-0 w-72"
              />
              <button className="button">Save</button>
            </form>
          </li>
        ))}
        {!suggestions?.length && <li className="py-2 text-muted">No suggestions{kind ? " of this kind" : ""}.</li>}
      </ul>

      <h2>Suspended accounts ({suspended?.length ?? 0})</h2>
      <ul className="mt-2">
        {suspended?.map((s) => (
          <li key={s.id} className="flex items-baseline gap-3">
            <ReportTargetLink targets={targets} type="profile" id={s.id} />
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
