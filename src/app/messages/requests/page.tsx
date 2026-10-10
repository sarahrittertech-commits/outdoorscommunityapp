import type { Metadata } from "next";

import { ConversationList, InboxTabs } from "@/components/Inbox";
import { Notice } from "@/components/Notice";
import { requireViewer } from "@/lib/auth";
import { loadInbox } from "@/lib/conversations";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Message requests", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** FR-DM-1, FR-DM-3: first messages waiting for an answer. */
export default async function MessageRequestsPage({ searchParams }: Props) {
  const viewer = await requireViewer("/messages/requests");
  const supabase = await createClient();
  const { requests } = await loadInbox(supabase, viewer.id);

  return (
    <>
      <h1>Messages</h1>
      <InboxTabs current="requests" requests={requests.length} />
      <Notice params={await searchParams} />
      <p className="mt-3 max-w-prose text-sm text-muted">
        Open a request to read it, then accept, decline or block. Until you accept, the sender can&apos;t send anything
        more, and they aren&apos;t told if you decline.
      </p>
      <ConversationList rows={requests} empty="No requests." />
    </>
  );
}
