import type { Metadata } from "next";
import Link from "next/link";

import { restoreGroup } from "@/app/actions/groups";
import { joinGroup, leaveGroup } from "@/app/actions/membership";
import { EventList } from "@/components/Listings";
import { Notice } from "@/components/Notice";
import { PlainText } from "@/components/PlainText";
import { loadGroup } from "@/lib/groups";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { group } = await loadGroup((await params).slug);
  return {
    title: group.name,
    description: group.description.slice(0, 160),
    openGraph: { title: group.name, description: group.description.slice(0, 160) },
    robots: group.status === "archived" ? { index: false } : undefined,
  };
}

/** FR-BR-6: readable signed out; discussions and the member list are not. */
export default async function GroupPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const loaded = await loadGroup(slug);
  const { supabase, group, viewer, membership, isMember, isAdmin, isOwner, isActive, canManage } = loaded;
  const now = new Date().toISOString();

  const [{ data: listing }, { data: organizers }, { data: upcoming }, { count: pastCount }, { count: pendingCount }] =
    await Promise.all([
      supabase.from("group_listings").select("category_slug, category_name, subcategory_slug, subcategory_name, member_count").eq("id", group.id).single(),
      supabase
        .from("group_members")
        .select("role, user_id, profiles(display_name)")
        .eq("group_id", group.id)
        .in("role", ["owner", "admin"])
        .eq("status", "active")
        .order("role"),
      supabase
        .from("event_listings")
        .select("id, title, starts_at, timezone, group_name, group_slug, location_name, status, going_count")
        .eq("group_id", group.id)
        .gt("ends_at", now)
        .order("starts_at")
        .limit(20),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("group_id", group.id).lte("ends_at", now),
      isAdmin
        ? supabase.from("group_members").select("user_id", { count: "exact", head: true }).eq("group_id", group.id).eq("status", "pending")
        : Promise.resolve({ count: 0 }),
    ]);

  return (
    <>
      <Notice params={await searchParams} />
      {listing && (
        <p className="text-sm">
          <Link href={`/c/${listing.category_slug}`}>{listing.category_name}</Link> ›{" "}
          <Link href={`/c/${listing.category_slug}/${listing.subcategory_slug}`}>{listing.subcategory_name}</Link> ›
        </p>
      )}
      <h1>{group.name}</h1>
      <p className="text-sm text-muted">
        {group.area} · {listing?.member_count ?? 0} {listing?.member_count === 1 ? "member" : "members"} ·{" "}
        {group.join_policy === "open" ? "anyone can join" : "approval to join"}
      </p>

      {group.status === "archived" && (
        <div role="status" className="mt-3 rounded bg-warning px-3 py-2">
          This group is archived. It is read-only and hidden from listings.
          {isOwner && (
            <form action={restoreGroup.bind(null, group.id, group.slug)} className="mt-2">
              <button className="button button-plain">Restore group</button>
            </form>
          )}
        </div>
      )}

      {/* Membership ------------------------------------------------------------ */}
      <section aria-label="Membership" className="mt-4">
        {!viewer ? (
          <Link href={`/signin?next=/g/${group.slug}`} className="button">
            Sign in to join
          </Link>
        ) : isMember ? (
          <div className="text-sm">
            You&apos;re {isOwner ? "the owner" : isAdmin ? "an admin" : "a member"}.{" "}
            {!isOwner && (
              <form action={leaveGroup.bind(null, group.id, group.slug)} className="inline">
                <button className="link-button">Leave group</button>
              </form>
            )}
          </div>
        ) : membership?.status === "pending" ? (
          <div className="text-sm">
            Your request to join is waiting for an organizer.{" "}
            <form action={leaveGroup.bind(null, group.id, group.slug)} className="inline">
              <button className="link-button">Cancel request</button>
            </form>
          </div>
        ) : membership?.status === "banned" ? (
          <p className="text-sm text-muted">You can&apos;t join this group.</p>
        ) : isActive ? (
          <form action={joinGroup.bind(null, group.id, group.slug)}>
            {group.join_policy === "approval" && group.join_question && (
              <>
                <label htmlFor="answer">{group.join_question}</label>
                <textarea id="answer" name="answer" maxLength={1000} className="min-h-20" />
              </>
            )}
            <button className="button mt-2">{group.join_policy === "open" ? "Join group" : "Ask to join"}</button>
          </form>
        ) : null}
      </section>

      {canManage && (
        <nav aria-label="Organizer tools" className="mt-4 flex flex-wrap gap-x-4 rounded bg-panel px-3 py-2 text-sm">
          <strong>Organizer:</strong>
          <Link href={`/g/${group.slug}/events/new`}>post an event</Link>
          <Link href={`/g/${group.slug}/members`}>members{pendingCount ? ` (${pendingCount} waiting)` : ""}</Link>
          <Link href={`/g/${group.slug}/edit`}>edit group</Link>
          <Link href={`/g/${group.slug}/reports`}>reports</Link>
        </nav>
      )}

      {/* About ------------------------------------------------------------------- */}
      <h2>About</h2>
      <PlainText text={group.description} className="mt-2" />
      {group.rules && (
        <>
          <h3 className="mt-4">Group rules</h3>
          <PlainText text={group.rules} className="mt-1" />
        </>
      )}

      <h2>Upcoming events</h2>
      <div className="mt-2">
        <EventList events={upcoming ?? []} showGroup={false} />
      </div>
      {Boolean(pastCount) && (
        <p className="mt-2 text-sm text-muted">
          {pastCount} past {pastCount === 1 ? "event" : "events"}. <Link href={`/g/${group.slug}/past`}>See them</Link>.
        </p>
      )}

      {group.discussions_enabled && (
        <>
          <h2>Discussions</h2>
          <p className="mt-2">
            {isMember ? (
              <Link href={`/g/${group.slug}/discussions`}>Go to the discussion board</Link>
            ) : (
              <span className="text-muted">The discussion board is for members.</span>
            )}
          </p>
        </>
      )}

      <h2>Organizers</h2>
      <ul className="mt-2">
        {organizers?.map((o) => (
          <li key={o.user_id}>
            <Link href={`/u/${o.user_id}`}>{o.profiles?.display_name ?? "deleted user"}</Link>{" "}
            <span className="text-sm text-muted">{o.role}</span>
          </li>
        ))}
      </ul>
      {isMember && (
        <p className="mt-2 text-sm">
          <Link href={`/g/${group.slug}/members`}>All members</Link>
        </p>
      )}

      {viewer && (
        <p className="mt-8 text-sm">
          <Link href={`/report?type=group&id=${group.id}&next=/g/${group.slug}`} className="text-muted">
            Report this group
          </Link>
        </p>
      )}
    </>
  );
}
