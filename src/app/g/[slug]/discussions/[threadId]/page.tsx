import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  deleteOwnPost,
  editReply,
  editThread,
  postReply,
  removePost,
  setThreadFlags,
} from "@/app/actions/discussions";
import { Notice } from "@/components/Notice";
import { PlainText } from "@/components/PlainText";
import { site } from "@/config/site";
import { requireViewer } from "@/lib/auth";
import { loadGroup } from "@/lib/groups";
import type { Enums } from "@/lib/supabase/database.types";
import { formatPostDate } from "@/lib/time";
import { idSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Thread", robots: { index: false } };

type Props = {
  params: Promise<{ slug: string; threadId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function statusText(status: Enums<"post_status">): string | null {
  if (status === "removed") return "Removed by a moderator.";
  if (status === "deleted_by_author") return "Deleted by the author.";
  return null;
}

/** FR-DS-2, 4, 5: flat replies, oldest first. */
export default async function ThreadPage({ params, searchParams }: Props) {
  const { slug, threadId } = await params;
  const path = `/g/${slug}/discussions/${threadId}`;
  const viewer = await requireViewer(path);
  const { supabase, group, isMember, isActive, canManage } = await loadGroup(slug);
  if (!isMember && !viewer.isSiteAdmin) redirect(`/g/${slug}?e=not_allowed`);
  if (!idSchema.safeParse(threadId).success) notFound();

  const [{ data: thread }, { data: replies }] = await Promise.all([
    supabase
      .from("threads")
      .select("id, title, body, status, is_pinned, is_locked, author_id, created_at, edited_at, profiles(display_name)")
      .eq("id", threadId)
      .eq("group_id", group.id)
      .maybeSingle(),
    supabase
      .from("replies")
      .select("id, body, status, author_id, created_at, edited_at, profiles(display_name)")
      .eq("thread_id", threadId)
      .order("created_at"),
  ]);
  if (!thread) notFound();

  const query = await searchParams;
  const editing = typeof query.edit === "string" ? query.edit : null;
  const open = group.discussions_enabled && isActive && viewer.canWrite;
  const canReply = open && isMember && !thread.is_locked && thread.status === "visible";
  const tz = site.defaultTimezone;

  return (
    <>
      <p className="text-sm">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> › <Link href={`/g/${group.slug}/discussions`}>discussions</Link> ›
      </p>
      <Notice params={query} />

      <article>
        <h1>
          {thread.title}
          {thread.is_locked && <span className="ml-2 text-base font-normal text-muted">[locked]</span>}
        </h1>
        <p className="text-sm text-muted">
          {thread.author_id ? <Link href={`/u/${thread.author_id}`}>{thread.profiles?.display_name ?? "deleted user"}</Link> : "deleted user"} ·{" "}
          {formatPostDate(thread.created_at, tz)}
          {thread.edited_at && " · edited"}
        </p>

        {statusText(thread.status) ? (
          <p className="mt-3 italic text-muted">{statusText(thread.status)}</p>
        ) : editing === thread.id && thread.author_id === viewer.id && open ? (
          <form action={editThread.bind(null, thread.id, path)} className="mt-3">
            <label htmlFor="title">Title</label>
            <input id="title" name="title" type="text" required maxLength={150} defaultValue={thread.title} />
            <label htmlFor="body">Message</label>
            <textarea id="body" name="body" required maxLength={10000} defaultValue={thread.body} />
            <button className="button mt-2">Save</button> <Link href={path}>cancel</Link>
          </form>
        ) : (
          <PlainText text={thread.body} className="mt-3" />
        )}

        <PostTools
          type="thread"
          id={thread.id}
          path={path}
          isAuthor={thread.author_id === viewer.id}
          visible={thread.status === "visible"}
          open={open}
          canManage={canManage}
        />
        {canManage && (
          <div className="mt-1 flex gap-4 text-sm">
            <form action={setThreadFlags.bind(null, thread.id, { pinned: !thread.is_pinned }, path)}>
              <button className="link-button">{thread.is_pinned ? "unpin" : "pin"}</button>
            </form>
            <form action={setThreadFlags.bind(null, thread.id, { locked: !thread.is_locked }, path)}>
              <button className="link-button">{thread.is_locked ? "unlock" : "lock"}</button>
            </form>
          </div>
        )}
      </article>

      <h2>{replies?.length ?? 0} {replies?.length === 1 ? "reply" : "replies"}</h2>
      <ol className="mt-2 divide-y divide-rule border-y border-rule">
        {replies?.map((r, i) => (
          <li key={r.id} id={i === replies.length - 1 ? "latest" : `reply-${r.id}`} className="py-3">
            <p className="text-sm text-muted">
              {r.author_id ? <Link href={`/u/${r.author_id}`}>{r.profiles?.display_name ?? "deleted user"}</Link> : "deleted user"} ·{" "}
              {formatPostDate(r.created_at, tz)}
              {r.edited_at && " · edited"}
            </p>
            {statusText(r.status) ? (
              <p className="mt-1 italic text-muted">{statusText(r.status)}</p>
            ) : editing === r.id && r.author_id === viewer.id && open ? (
              <form action={editReply.bind(null, r.id, path)} className="mt-1">
                <label htmlFor={`body-${r.id}`} className="sr-only">
                  Reply
                </label>
                <textarea id={`body-${r.id}`} name="body" required maxLength={10000} defaultValue={r.body} />
                <button className="button mt-2">Save</button> <Link href={path}>cancel</Link>
              </form>
            ) : (
              <PlainText text={r.body} className="mt-1" />
            )}
            <PostTools
              type="reply"
              id={r.id}
              path={path}
              isAuthor={r.author_id === viewer.id}
              visible={r.status === "visible"}
              open={open}
              canManage={canManage}
            />
          </li>
        ))}
      </ol>

      {canReply ? (
        <form action={postReply.bind(null, thread.id, path)} className="mt-6">
          <label htmlFor="reply">Reply</label>
          <textarea id="reply" name="body" required maxLength={10000} />
          <button className="button mt-2">Post reply</button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-muted">
          {thread.is_locked ? "This thread is locked." : !group.discussions_enabled ? "Discussions are switched off." : null}
        </p>
      )}
    </>
  );
}

function PostTools({
  type,
  id,
  path,
  isAuthor,
  visible,
  open,
  canManage,
}: {
  type: "thread" | "reply";
  id: string;
  path: string;
  isAuthor: boolean;
  visible: boolean;
  open: boolean;
  canManage: boolean;
}) {
  if (!visible) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-4 text-sm">
      {isAuthor && open && <Link href={`${path}?edit=${id}`}>edit</Link>}
      {isAuthor && (
        <form action={deleteOwnPost.bind(null, type, id, path)}>
          <button className="link-button">delete</button>
        </form>
      )}
      {canManage && !isAuthor && (
        <form action={removePost.bind(null, type, id, path)}>
          <button className="link-button text-danger">remove</button>
        </form>
      )}
      {!isAuthor && (
        <Link href={`/report?type=${type}&id=${id}&next=${encodeURIComponent(path)}`} className="text-muted">
          report
        </Link>
      )}
    </div>
  );
}
