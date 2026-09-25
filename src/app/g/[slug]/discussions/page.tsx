import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createThread } from "@/app/actions/discussions";
import { Notice } from "@/components/Notice";
import { pageFrom, Pagination } from "@/components/Pagination";
import { site } from "@/config/site";
import { requireViewer } from "@/lib/auth";
import { loadGroup } from "@/lib/groups";
import { formatShortDate } from "@/lib/time";

export const metadata: Metadata = { title: "Discussions", robots: { index: false } };

const PAGE_SIZE = 30;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** FR-DS-3: pinned first, then by latest reply, like forums always were. */
export default async function DiscussionBoard({ params, searchParams }: Props) {
  const { slug } = await params;
  const viewer = await requireViewer(`/g/${slug}/discussions`);
  const { supabase, group, isMember, isActive } = await loadGroup(slug);
  if (!isMember && !viewer.isSiteAdmin) redirect(`/g/${slug}?e=not_allowed`);

  const query = await searchParams;
  const page = pageFrom(query.page);
  const { data: threads, count } = await supabase
    .from("threads")
    .select("id, title, status, is_pinned, is_locked, reply_count, last_activity_at, profiles(display_name)", { count: "exact" })
    .eq("group_id", group.id)
    .order("is_pinned", { ascending: false })
    .order("last_activity_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const canPost = group.discussions_enabled && isActive && isMember && viewer.canWrite;

  return (
    <>
      <p className="text-sm">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> ›
      </p>
      <h1>Discussions</h1>
      <p className="mt-1 text-sm text-muted">Visible to members only. Most recent activity first.</p>
      <Notice params={query} />
      {!group.discussions_enabled && (
        <p className="mt-2 rounded bg-warning px-3 py-2 text-sm">Discussions are switched off. Older threads stay readable.</p>
      )}

      <ul className="mt-4 divide-y divide-rule border-y border-rule">
        {threads?.map((t) => (
          <li key={t.id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2">
            <span>
              {t.is_pinned && <span className="mr-1 text-sm font-semibold">[pinned]</span>}
              {t.is_locked && <span className="mr-1 text-sm text-muted">[locked]</span>}
              <Link href={`/g/${group.slug}/discussions/${t.id}`}>{t.title}</Link>
              <span className="ml-2 text-sm text-muted">by {t.profiles?.display_name ?? "deleted user"}</span>
            </span>
            <span className="text-sm text-muted">
              {t.reply_count} {t.reply_count === 1 ? "reply" : "replies"} · {formatShortDate(t.last_activity_at, site.defaultTimezone)}
            </span>
          </li>
        ))}
        {!threads?.length && <li className="py-2 text-muted">No threads yet.</li>}
      </ul>
      <Pagination basePath={`/g/${group.slug}/discussions`} page={page} pageCount={Math.ceil((count ?? 0) / PAGE_SIZE)} />

      {canPost && (
        <section className="mt-8">
          <h2>Start a thread</h2>
          <form action={createThread.bind(null, group.id, group.slug)}>
            <label htmlFor="title">Title</label>
            <input id="title" name="title" type="text" required maxLength={150} />
            <label htmlFor="body">Message</label>
            <textarea id="body" name="body" required maxLength={10000} />
            <p className="hint mt-1">Plain text. Links work. Be kind.</p>
            <button className="button mt-3">Post thread</button>
          </form>
        </section>
      )}
    </>
  );
}
