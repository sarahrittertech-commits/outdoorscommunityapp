import type { Metadata } from "next";
import Link from "next/link";

import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Post", robots: { index: false } };

/**
 * Where the header's "+ post" leads: post an event for a group you run, or
 * start a new group. Events always belong to a group (FR-EV-1).
 */
export default async function PostPage() {
  const viewer = await requireViewer("/post");
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("group_members")
    .select("role, groups(slug, name, status)")
    .eq("user_id", viewer.id)
    .in("role", ["owner", "admin"]);

  const groups = (memberships ?? [])
    .map((m) => m.groups)
    .filter((g) => g && g.status === "active")
    .sort((a, b) => a!.name.localeCompare(b!.name));

  return (
    <div className="max-w-2xl">
      <h1>Post</h1>

      <h2>An event</h2>
      {groups.length ? (
        <>
          <p className="text-muted">Events belong to a group. Pick the group it&apos;s for:</p>
          <ul className="mt-2 divide-y divide-rule border-y border-rule">
            {groups.map((g) => (
              <li key={g!.slug} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <Link href={`/g/${g!.slug}`}>{g!.name}</Link>
                <Link href={`/g/${g!.slug}/events/new`} className="button button-plain py-1 text-sm">
                  Post an event
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-muted">
          Events are posted by the people who run a group. You don&apos;t run one yet: start one below, or ask an organizer of a group you belong
          to.
        </p>
      )}

      <h2>A group</h2>
      <p className="text-muted">Bring people together around an activity. You&apos;ll be its page admin and can add up to two page managers later.</p>
      <p className="mt-3">
        <Link href="/groups/new" className="button">
          Start a group
        </Link>
      </p>
    </div>
  );
}
