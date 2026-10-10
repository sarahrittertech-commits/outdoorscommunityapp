import type { Metadata } from "next";
import Link from "next/link";

import { unblockMember } from "@/app/actions/messages";
import { ConversationList, InboxTabs } from "@/components/Inbox";
import { Notice } from "@/components/Notice";
import { requireViewer } from "@/lib/auth";
import { loadInbox } from "@/lib/conversations";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** FR-DM-3: the inbox. An ordinary page: new messages show when it loads. */
export default async function MessagesPage({ searchParams }: Props) {
  const viewer = await requireViewer("/messages");
  const supabase = await createClient();
  const { inbox, requests, blocked } = await loadInbox(supabase, viewer.id);

  return (
    <>
      <h1>Messages</h1>
      <InboxTabs current="inbox" requests={requests.length} />
      <Notice params={await searchParams} />
      <ConversationList rows={inbox} empty="No conversations yet. To write to someone, open their profile and choose Message." />
      <p className="mt-6 max-w-prose text-sm text-muted">
        Only you and the other person can read a conversation. A first message arrives as a request, and nothing more can
        be sent until it&apos;s accepted.
      </p>

      {blocked.length > 0 && (
        <section className="mt-8">
          <h2>Blocked</h2>
          <p className="text-sm text-muted">They can&apos;t message you, and they aren&apos;t told.</p>
          <ul className="mt-2 divide-y divide-rule">
            {blocked.map((b) => (
              <li key={b.id} className="flex flex-wrap items-baseline gap-x-3 py-2">
                <Link href={`/u/${b.id}`}>{b.name}</Link>
                <form action={unblockMember.bind(null, b.id)} className="ml-auto">
                  <button className="link-button">unblock</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
