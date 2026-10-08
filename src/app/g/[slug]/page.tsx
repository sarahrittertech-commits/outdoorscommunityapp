import type { Metadata } from "next";
import Link from "next/link";

import { requestClaim } from "@/app/actions/claims";
import { restoreGroup } from "@/app/actions/groups";
import { joinGroup, leaveGroup } from "@/app/actions/membership";
import { AffinityTags } from "@/components/AffinityTags";
import { EventList } from "@/components/Listings";
import { Notice } from "@/components/Notice";
import { PlainText } from "@/components/PlainText";
import { site } from "@/config/site";
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
    openGraph: {
      title: group.name,
      description: group.description.slice(0, 160),
    },
    robots: group.status === "archived" ? { index: false } : undefined,
  };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** FR-BR-6: readable signed out; discussions and the member list are not. */
export default async function GroupPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const loaded = await loadGroup(slug);
  const { supabase, group, viewer, membership, isMember, isAdmin, isOwner, isActive, canManage } = loaded;
  const now = new Date().toISOString();

  const [{ data: listing }, { data: organizers }, { data: upcoming }, { count: pastCount }, { count: pendingCount }, { data: myClaim }] =
    await Promise.all([
      supabase
        .from("group_listings")
        .select("category_slug, category_name, subcategory_slug, subcategory_name, member_count")
        .eq("id", group.id)
        .single(),
      supabase
        .from("group_members")
        .select("role, user_id, profiles(display_name)")
        .eq("group_id", group.id)
        .in("role", ["owner", "admin"])
        .eq("status", "active")
        .order("role"),
      supabase
        .from("event_listings")
        .select("id, title, starts_at, timezone, group_name, group_slug, location_name, status, going_count, is_unclaimed")
        .eq("group_id", group.id)
        .gt("ends_at", now)
        .order("starts_at")
        .limit(20),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("group_id", group.id).lte("ends_at", now),
      isAdmin
        ? supabase.from("group_members").select("user_id", { count: "exact", head: true }).eq("group_id", group.id).eq("status", "pending")
        : Promise.resolve({ count: 0 }),
      (group.is_unclaimed || group.needs_owner) && viewer
        ? supabase.from("group_claims").select("status").eq("group_id", group.id).eq("user_id", viewer.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const claimForm =
    myClaim?.status === "pending" ? (
      <p className="m-0 mt-1 text-sm">Your claim is waiting for the site admin to check it.</p>
    ) : myClaim?.status === "declined" ? (
      <p className="m-0 mt-1 text-sm text-muted">Your claim wasn&apos;t approved.</p>
    ) : !viewer ? (
      <p className="m-0 mt-1 text-sm">
        <Link href={`/signin?next=/g/${group.slug}`}>Sign in</Link> to claim it. Once approved you&apos;ll run it here: post events,
        take RSVPs and open a discussion board.
      </p>
    ) : (
      <form action={requestClaim.bind(null, group.id, group.slug)}>
        <label htmlFor="claim-note" className="mt-1 text-sm font-normal">
          Claim it: tell the site admin how you&apos;re connected to {group.name}, and how we can check (a club email address, your
          role on their website).
        </label>
        <textarea id="claim-note" name="note" required minLength={10} maxLength={1000} className="min-h-20" />
        <button className="button mt-2">Ask to claim</button>
      </form>
    );

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
      <AffinityTags tags={group.affinity_tags} className="mb-1" />
      <p className="text-sm text-muted">
        {group.area} ·{" "}
        {group.is_unclaimed ? (
          <>unclaimed listing</>
        ) : (
          <>
            {listing?.member_count ?? 0} {listing?.member_count === 1 ? "member" : "members"} ·{" "}
            {group.join_policy === "open" ? "anyone can join" : "approval to join"}
          </>
        )}
      </p>

      {group.status === "archived" && !group.needs_owner && (
        <div role="status" className="mt-3 rounded bg-warning px-3 py-2">
          This group is archived. It is read-only and hidden from listings.
          {isOwner && (
            <form action={restoreGroup.bind(null, group.id, group.slug)} className="mt-2">
              <button className="button button-plain">Restore group</button>
            </form>
          )}
        </div>
      )}

      {/* FR-AC-6 / FR-GR-10: its owner deleted their account. ------------------ */}
      {group.needs_owner && (
        <section aria-label="Needs an organizer" className="mt-4 rounded border border-rule bg-panel px-4 py-3">
          <p className="m-0">
            <strong>This group needs an organizer.</strong> Its owner has left {site.name}, so it is read-only and hidden from listings,
            and its upcoming events were cancelled. Members and past posts are kept.
          </p>
          <h2 className="mt-4 font-sans text-base font-bold text-ink">Want to run it?</h2>
          {claimForm}
        </section>
      )}

      {/* FR-GR-9 / FR-GR-10: a listing added from public information. ---------- */}
      {group.is_unclaimed && group.source_url && (
        <section aria-label="Unclaimed listing" className="mt-4 rounded border border-rule bg-panel px-4 py-3">
          <p className="m-0">
            <strong>Unclaimed listing.</strong> Added from public information so people can find this group. Nobody runs it on {site.name}{" "}
            yet, so there&apos;s no joining or RSVPs here.
          </p>
          <p className="m-0 mt-2">
            Find them at{" "}
            <a href={group.source_url} rel="nofollow noopener" className="font-bold">
              {hostOf(group.source_url)}
            </a>
          </p>
          <h2 className="mt-4 font-sans text-base font-bold text-ink">Are you the organizer?</h2>
          {claimForm}
        </section>
      )}

      {/* Membership ------------------------------------------------------------ */}
      {!group.is_unclaimed && (
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
      )}

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

      {!group.is_unclaimed && <h2>Organizers</h2>}
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
