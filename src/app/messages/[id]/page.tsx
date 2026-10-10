import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { answerRequest, blockMember, sendMessage, unblockMember } from "@/app/actions/messages";
import { Notice } from "@/components/Notice";
import { PlainText } from "@/components/PlainText";
import { site } from "@/config/site";
import { requireViewer } from "@/lib/auth";
import { DELETED_USER, namesById, otherPerson } from "@/lib/conversations";
import { createClient } from "@/lib/supabase/server";
import { formatPostDate } from "@/lib/time";
import { idSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** The most recent messages shown on one page. */
const SHOWN = 200;

/**
 * FR-DM-1 to FR-DM-5: one conversation, oldest at the top and newest at the
 * bottom, with the reply form under it. Plain page and plain form: no live
 * updates, typing indicators, read receipts or online status.
 */
export default async function ConversationPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const path = `/messages/${id}`;
  const viewer = await requireViewer(path);
  const supabase = await createClient();

  // RLS returns it only to the two people, or to the site admin once reported.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, starter_id, recipient_id, status, reported_at")
    .eq("id", id)
    .maybeSingle();
  if (!conversation) notFound();

  const isParticipant = viewer.id === conversation.starter_id || viewer.id === conversation.recipient_id;
  const other = otherPerson(conversation, viewer.id);

  const [{ data: newest }, nameOf, { data: myBlock }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(SHOWN),
    namesById(supabase, [conversation.starter_id, conversation.recipient_id]),
    supabase.from("message_blocks").select("blocked_id").eq("blocker_id", viewer.id).eq("blocked_id", other).maybeSingle(),
  ]);
  const messages = (newest ?? []).reverse();

  // FR-DM-4: the viewer's own last-read time, for their own unread count only.
  if (isParticipant) {
    await supabase
      .from("conversation_reads")
      .upsert({ conversation_id: id, user_id: viewer.id, last_read_at: new Date().toISOString() }, { onConflict: "conversation_id,user_id" });
  }

  const otherName = nameOf(other);
  const otherDeleted = otherName === DELETED_USER;
  const iBlocked = Boolean(myBlock);
  const iAmRecipient = viewer.id === conversation.recipient_id;
  const tz = site.defaultTimezone;
  const lastId = messages.at(-1)?.id;

  return (
    <>
      <p className="text-sm">
        <Link href="/messages">← Messages</Link>
      </p>
      {isParticipant ? (
        <h1>{otherDeleted ? otherName : <Link href={`/u/${other}`}>{otherName}</Link>}</h1>
      ) : (
        <>
          <h1>
            {nameOf(conversation.starter_id)} and {nameOf(conversation.recipient_id)}
          </h1>
          <p className="max-w-prose text-sm text-muted">
            A reported conversation. You can read it because a message in it was reported; only the two people in it can
            write.
          </p>
        </>
      )}
      <Notice params={await searchParams} />

      <ol className="mt-4 space-y-4">
        {messages.map((m) => (
          <li key={m.id} id={m.id === lastId ? "latest" : `m-${m.id}`} className="max-w-prose">
            <p className="text-sm text-muted">
              <span className="font-semibold text-ink">{m.sender_id === viewer.id ? "You" : nameOf(m.sender_id)}</span> ·{" "}
              {formatPostDate(m.created_at, tz)}
              {isParticipant && m.sender_id !== viewer.id && (
                <>
                  {" · "}
                  <Link href={`/report?type=message&id=${m.id}&next=${encodeURIComponent(path)}`} className="text-muted">
                    report
                  </Link>
                </>
              )}
            </p>
            <PlainText text={m.body} className="mt-1" />
          </li>
        ))}
      </ol>

      {isParticipant && (
        <section className="mt-6 border-t border-rule pt-4">
          {otherDeleted ? (
            <p className="text-muted">This account has been deleted, so nothing more can be sent.</p>
          ) : iBlocked ? (
            <>
              <p className="text-muted">You&apos;ve blocked {otherName}. They can&apos;t message you.</p>
              <form action={unblockMember.bind(null, other)} className="mt-2">
                <button className="link-button">unblock</button>
              </form>
            </>
          ) : conversation.status === "accepted" ? (
            <form action={sendMessage.bind(null, path)}>
              <input type="hidden" name="to" value={other} />
              <label htmlFor="body">Write back</label>
              <textarea id="body" name="body" required maxLength={2000} className="min-h-24" />
              <p className="hint">Plain text, up to 2,000 characters.</p>
              <button className="button mt-2">Send</button>
            </form>
          ) : iAmRecipient ? (
            <>
              <p>
                {conversation.status === "requested"
                  ? `${otherName} would like to message you.`
                  : `You declined this request. You can still accept it.`}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <form action={answerRequest.bind(null, id, true)}>
                  <button className="button">Accept</button>
                </form>
                {conversation.status === "requested" && (
                  <form action={answerRequest.bind(null, id, false)}>
                    <button className="button button-plain">Decline</button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <p className="text-muted">Request sent. You can write again once {otherName} accepts it.</p>
          )}

          {!otherDeleted && !iBlocked && (
            <form action={blockMember.bind(null, other, path)} className="mt-6">
              <button className="link-button text-sm">Block {otherName}</button>{" "}
              <span className="text-sm text-muted">They won&apos;t be able to message you, and they aren&apos;t told.</span>
            </form>
          )}
        </section>
      )}
    </>
  );
}
