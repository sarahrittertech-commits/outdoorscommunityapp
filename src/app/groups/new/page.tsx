import type { Metadata } from "next";

import { createGroup } from "@/app/actions/groups";
import { GroupForm } from "@/components/GroupForm";
import { Notice } from "@/components/Notice";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Start a group", robots: { index: false } };

/** FR-GR-1. */
export default async function NewGroupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireViewer("/groups/new");
  // FR-GR-22: say before they submit that a first group is checked first.
  const supabase = await createClient();
  const { data: firstGroup } = await supabase.rpc("first_group_needs_review");

  return (
    <>
      <h1>Start a group</h1>
      <p className="mt-1 text-muted">
        You&apos;ll be its page admin. You can add up to two page managers to help. Each person can own up to three groups.
      </p>
      {firstGroup && (
        <p className="mt-2 rounded bg-notice px-3 py-2">
          <strong>Your first group is checked before it&apos;s listed.</strong> The site admin looks at it to make sure it&apos;s a real
          outdoor group. Until then only you can see it, though you can edit it and post events. Once one of your groups is approved,
          your next ones are listed straight away.
        </p>
      )}
      <Notice params={await searchParams} />
      {viewer.canWrite ? (
        <GroupForm action={createGroup} submitLabel="Create group" />
      ) : (
        <p className="mt-4">Your account can&apos;t create groups right now.</p>
      )}
    </>
  );
}
