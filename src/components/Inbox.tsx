import Link from "next/link";

import { site } from "@/config/site";
import type { InboxRow } from "@/lib/conversations";
import { formatPostDate } from "@/lib/time";

/** FR-DM-3: the Inbox and Requests tabs. Plain links, no counts that update by themselves. */
export function InboxTabs({ current, requests }: { current: "inbox" | "requests"; requests: number }) {
  const tab = (href: string, label: string, active: boolean) => (
    <Link href={href} aria-current={active ? "page" : undefined}>
      {label}
    </Link>
  );
  return (
    <nav aria-label="Messages" className="tabs mt-3">
      {tab("/messages", "Inbox", current === "inbox")}
      {tab("/messages/requests", requests ? `Requests (${requests})` : "Requests", current === "requests")}
    </nav>
  );
}

/** One line per conversation, newest first. */
export function ConversationList({ rows, empty }: { rows: InboxRow[]; empty: string }) {
  if (!rows.length) return <p className="mt-4 text-muted">{empty}</p>;
  return (
    // Two kinds of text only: the name (a link) and gray details; "new" is a tag, not more text.
    <ul className="mt-4 divide-y divide-rule border-y border-rule">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
          <Link href={`/messages/${r.id}#latest`} className={r.unread ? "font-bold" : undefined}>
            {r.otherName}
          </Link>
          {r.unread && <span className="tag">new</span>}
          {r.status !== "accepted" && r.iStarted && <span className="text-sm text-muted">request sent</span>}
          <span className="ml-auto text-sm text-muted">{formatPostDate(r.lastMessageAt, site.defaultTimezone)}</span>
        </li>
      ))}
    </ul>
  );
}
