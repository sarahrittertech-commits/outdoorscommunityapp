import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  approveMember,
  declineMember,
  removeMember,
  setMemberRole,
  transferOwnership,
} from "@/app/actions/membership";
import { Notice } from "@/components/Notice";
import { requireViewer } from "@/lib/auth";
import { loadGroup } from "@/lib/groups";

export const metadata: Metadata = { title: "Members", robots: { index: false } };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** FR-MB-2, 5, 6, 7, 8. Members see the list; organizers manage it. */
export default async function MembersPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const viewer = await requireViewer(`/g/${slug}/members`);
  const { supabase, group, isMember, isOwner, canManage } = await loadGroup(slug);
  if (!isMember && !viewer.isSiteAdmin) redirect(`/g/${slug}?e=not_allowed`);

  const { data: rows } = await supabase
    .from("group_members")
    .select("user_id, role, status, join_answer, created_at, profiles(display_name)")
    .eq("group_id", group.id)
    .order("created_at");

  const byName = (a: NonNullable<typeof rows>[number], b: NonNullable<typeof rows>[number]) =>
    (a.profiles?.display_name ?? "").localeCompare(b.profiles?.display_name ?? "");
  const pending = (rows ?? []).filter((r) => r.status === "pending");
  const active = (rows ?? []).filter((r) => r.status === "active").sort(byName);
  const banned = (rows ?? []).filter((r) => r.status === "banned").sort(byName);
  const roleOrder = { owner: 0, admin: 1, member: 2 } as const;
  active.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

  return (
    <>
      <p className="text-sm">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> ›
      </p>
      <h1>Members</h1>
      <Notice params={await searchParams} />

      {canManage && pending.length > 0 && (
        <section>
          <h2>Waiting for approval</h2>
          <ul className="mt-2 divide-y divide-rule border-y border-rule">
            {pending.map((p) => (
              <li key={p.user_id} className="py-2">
                <Link href={`/u/${p.user_id}`}>{p.profiles?.display_name ?? "deleted user"}</Link>
                {p.join_answer && <blockquote className="mt-1 border-l-2 border-rule pl-3 text-sm">{p.join_answer}</blockquote>}
                <div className="mt-1 flex gap-3">
                  <form action={approveMember.bind(null, group.id, p.user_id, group.slug)}>
                    <button className="button">Approve</button>
                  </form>
                  <form action={declineMember.bind(null, group.id, p.user_id, group.slug)}>
                    <button className="button button-plain">Decline</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2>{active.length} members</h2>
      <ul className="mt-2 divide-y divide-rule border-y border-rule">
        {active.map((m) => (
          <li key={m.user_id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
            <span>
              <Link href={`/u/${m.user_id}`}>{m.profiles?.display_name ?? "deleted user"}</Link>
              {m.role !== "member" && <span className="ml-2 text-sm text-muted">{m.role}</span>}
            </span>
            {canManage && m.role !== "owner" && (
              <span className="flex flex-wrap gap-3 text-sm">
                {isOwner && m.role === "member" && (
                  <form action={setMemberRole.bind(null, group.id, m.user_id, "admin", group.slug)}>
                    <button className="link-button">make admin</button>
                  </form>
                )}
                {isOwner && m.role === "admin" && (
                  <>
                    <form action={setMemberRole.bind(null, group.id, m.user_id, "member", group.slug)}>
                      <button className="link-button">remove admin role</button>
                    </form>
                    <form action={transferOwnership.bind(null, group.id, m.user_id, group.slug)}>
                      <button className="link-button">make owner</button>
                    </form>
                  </>
                )}
                {(isOwner || m.role === "member") && (
                  <form action={removeMember.bind(null, group.id, m.user_id, group.slug)}>
                    <button className="link-button text-danger">remove and ban</button>
                  </form>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>

      {canManage && banned.length > 0 && (
        <>
          <h2>Removed</h2>
          <p className="mt-1 text-sm text-muted">These people can&apos;t rejoin.</p>
          <ul className="mt-2">
            {banned.map((b) => (
              <li key={b.user_id}>{b.profiles?.display_name ?? "deleted user"}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
