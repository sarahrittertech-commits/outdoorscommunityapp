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
import { cancelManagerInvite, createInviteLink, inviteManager, inviteMembers, turnOffInviteLink } from "@/app/actions/invites";
import { CopyButton } from "@/components/CopyButton";
import { InviteMembersForm } from "@/components/InviteMembersForm";
import { Notice } from "@/components/Notice";
import { site } from "@/config/site";
import { requireViewer } from "@/lib/auth";
import { loadGroup, roleLabel } from "@/lib/groups";

export const metadata: Metadata = { title: "Members", robots: { index: false } };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** At most two page managers, counting open manager invites (FR-MB-11). */
const MAX_MANAGERS = 2;

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: site.defaultTimezone });

/**
 * FR-MB-2, 5, 6, 7, 8, 11 to 15. Members see the list; the page admin and
 * page managers manage it and invite people.
 */
export default async function MembersPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const viewer = await requireViewer(`/g/${slug}/members`);
  const { supabase, group, isMember, isAdmin, isOwner, isActive, canManage, seesMemberList } = await loadGroup(slug);
  const canInvite = Boolean(viewer.canWrite && isActive && isAdmin);
  // FR-MB-10: members always reach this page (with organizers only, they see
  // the organizers and the count); "anyone signed in" opens it to everyone.
  if (!isMember && !seesMemberList) redirect(`/g/${slug}?e=not_allowed`);

  const [{ data: rows }, { data: answerRows }, { data: link }, { data: managerInvites }, { data: memberCount }] = await Promise.all([
    supabase
      .from("group_members")
      .select("user_id, role, status, created_at, profiles(display_name)")
      .eq("group_id", group.id)
      .order("created_at"),
    // Organizers only (FR-MB-9); empty for everyone else.
    canManage ? supabase.rpc("join_answers", { p_group_id: group.id }) : Promise.resolve({ data: [] }),
    // Page admin and managers only (RLS); null for everyone else.
    supabase.from("group_invite_links").select("token, expires_at, revoked_at").eq("group_id", group.id).maybeSingle(),
    isOwner ? supabase.rpc("open_manager_invites", { p_group_id: group.id }) : Promise.resolve({ data: [] }),
    // Counts are always shown, whatever the list shows (FR-MB-10).
    supabase.rpc("group_member_count", { p_group_id: group.id }),
  ]);
  const now = new Date();
  const linkWorks = link && !link.revoked_at && (!link.expires_at || new Date(link.expires_at) > now);
  const linkUrl = link ? `${site.url}/join/${link.token}` : "";
  const answers = new Map((answerRows ?? []).map((a) => [a.user_id, a.join_answer]));

  const byName = (a: NonNullable<typeof rows>[number], b: NonNullable<typeof rows>[number]) =>
    (a.profiles?.display_name ?? "").localeCompare(b.profiles?.display_name ?? "");
  const pending = (rows ?? []).filter((r) => r.status === "pending");
  const active = (rows ?? []).filter((r) => r.status === "active").sort(byName);
  const banned = (rows ?? []).filter((r) => r.status === "banned").sort(byName);
  const roleOrder = { owner: 0, admin: 1, member: 2 } as const;
  active.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
  const managerCount = active.filter((m) => m.role === "admin").length;
  const managerPlaces = MAX_MANAGERS - managerCount - (managerInvites?.length ?? 0);

  return (
    <>
      <p className="breadcrumb">
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
                {answers.get(p.user_id) && (
                  <blockquote className="mt-1 border-l-2 border-rule pl-3 text-sm">{answers.get(p.user_id)}</blockquote>
                )}
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

      <h2>
        {memberCount ?? active.length} {(memberCount ?? active.length) === 1 ? "member" : "members"}
      </h2>
      {!seesMemberList && (
        <p className="mt-1 text-sm text-muted">This group shows its member list to organizers only.</p>
      )}
      <ul className="mt-2 divide-y divide-rule border-y border-rule">
        {active.map((m) => (
          <li key={m.user_id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
            <span>
              <Link href={`/u/${m.user_id}`}>{m.profiles?.display_name ?? "deleted user"}</Link>
              {m.role !== "member" && <span className="ml-2 text-sm text-muted">{roleLabel(m.role)}</span>}
            </span>
            {canManage && m.role !== "owner" && (
              <span className="flex flex-wrap gap-3 text-sm">
                {isOwner && m.role === "member" && managerPlaces > 0 && (
                  <form action={setMemberRole.bind(null, group.id, m.user_id, "admin", group.slug)}>
                    <button className="link-button">make page manager</button>
                  </form>
                )}
                {isOwner && m.role === "admin" && (
                  <>
                    <form action={setMemberRole.bind(null, group.id, m.user_id, "member", group.slug)}>
                      <button className="link-button">remove as page manager</button>
                    </form>
                    <form action={transferOwnership.bind(null, group.id, m.user_id, group.slug)}>
                      <button className="link-button">make page admin</button>
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

      {isOwner && isActive && (
        <section aria-labelledby="managers">
          <h2 id="managers">Page managers</h2>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Page managers post events, moderate discussions and approve or remove members. A group can have two; it has{" "}
            {managerCount} {managerCount === 1 ? "manager" : "managers"}
            {managerInvites?.length ? ` and ${managerInvites.length} open ${managerInvites.length === 1 ? "invite" : "invites"}` : ""}.
            Pick a member above with <em>make page manager</em>, or invite someone by email.
          </p>
          {managerInvites && managerInvites.length > 0 && (
            <ul className="mt-2">
              {managerInvites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-baseline gap-3 text-sm">
                  Invite sent {dateFormat.format(new Date(i.sent_at))}, open until {dateFormat.format(new Date(i.expires_at))}
                  <form action={cancelManagerInvite.bind(null, i.id, group.slug)}>
                    <button className="link-button">cancel</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {managerPlaces > 0 && (
            <form action={inviteManager.bind(null, group.id, group.slug)} className="mt-3">
              <fieldset disabled={!site.emailEnabled} className="disabled:opacity-60">
                <label htmlFor="manager-email">
                  Invite a page manager by email <span className="hint">The invite works for 7 days, for that address only.</span>
                </label>
                <input id="manager-email" name="email" type="email" required maxLength={254} autoComplete="off" />
                <button className="button mt-2">Send manager invite</button>
              </fieldset>
            </form>
          )}
          {!site.emailEnabled && managerPlaces > 0 && <EmailOffNote />}
        </section>
      )}

      {canInvite && (
        <section aria-labelledby="invite-link">
          <h2 id="invite-link">Invite link</h2>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Anyone with the link can join straight away, without asking. Share it where you choose; turn it off or make a new one
            to stop it.
          </p>
          {linkWorks ? (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={linkUrl}
                  aria-label="Invite link"
                  className="min-w-0 flex-1 font-mono text-sm"
                />
                <CopyButton text={linkUrl} />
              </div>
              <p className="mt-1 text-sm text-muted">
                {link.expires_at ? `Works until ${dateFormat.format(new Date(link.expires_at))}.` : "Works until turned off."}
              </p>
              <form action={turnOffInviteLink.bind(null, group.id, group.slug)} className="mt-2">
                <button className="button button-plain">Turn off</button>
              </form>
            </>
          ) : (
            <p className="mt-2 text-sm">{link ? "The last link has expired or was turned off." : "There is no invite link yet."}</p>
          )}
          <form action={createInviteLink.bind(null, group.id, group.slug)} className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="link-valid">{linkWorks ? "Make a new link (the current one stops)" : "Make a link"}</label>
              <select id="link-valid" name="valid" defaultValue="30">
                <option value="7">Works for 7 days</option>
                <option value="30">Works for 30 days</option>
                <option value="never">Works until turned off</option>
              </select>
            </div>
            <button className="button">Create link</button>
          </form>
        </section>
      )}

      {canInvite && (
        <section aria-labelledby="invite-people">
          <h2 id="invite-people">Invite people</h2>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Each address gets one plain email with a link to join. Addresses are used only for that: nobody else sees them and
            they&apos;re deleted after 30 days.
          </p>
          <InviteMembersForm action={inviteMembers.bind(null, group.id, group.slug)} disabled={!site.emailEnabled} />
          {!site.emailEnabled && <EmailOffNote />}
        </section>
      )}

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

function EmailOffNote() {
  return (
    <p className="mt-2 text-sm text-muted">
      Email invites start once the board&apos;s email is set up. Use the invite link meanwhile.
    </p>
  );
}
