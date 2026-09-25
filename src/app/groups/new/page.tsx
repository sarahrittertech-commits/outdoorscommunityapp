import type { Metadata } from "next";

import { createGroup } from "@/app/actions/groups";
import { GroupForm } from "@/components/GroupForm";
import { Notice } from "@/components/Notice";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Start a group", robots: { index: false } };

/** FR-GR-1. */
export default async function NewGroupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireViewer("/groups/new");

  return (
    <>
      <h1>Start a group</h1>
      <p className="mt-1 text-muted">
        You&apos;ll be its owner. You can add admins to help once people join. Each person can own up to three groups.
      </p>
      <Notice params={await searchParams} />
      {viewer.canWrite ? (
        <GroupForm action={createGroup} submitLabel="Create group" />
      ) : (
        <p className="mt-4">Your account can&apos;t create groups right now.</p>
      )}
    </>
  );
}
