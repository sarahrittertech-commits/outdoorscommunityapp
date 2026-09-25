import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { archiveGroup, updateGroup } from "@/app/actions/groups";
import { GroupForm } from "@/components/GroupForm";
import { Notice } from "@/components/Notice";
import { requireViewer } from "@/lib/auth";
import { loadGroup } from "@/lib/groups";

export const metadata: Metadata = { title: "Edit group", robots: { index: false } };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** FR-GR-3, FR-GR-6. */
export default async function EditGroupPage({ params, searchParams }: Props) {
  const { slug } = await params;
  await requireViewer(`/g/${slug}/edit`);
  const { group, isOwner, canManage } = await loadGroup(slug);
  if (!canManage) redirect(`/g/${slug}?e=not_allowed`);

  return (
    <>
      <p className="text-sm">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> ›
      </p>
      <h1>Edit group</h1>
      <Notice params={await searchParams} />
      <GroupForm action={updateGroup.bind(null, group.id, group.slug)} group={group} submitLabel="Save changes" />

      {isOwner && (
        <section className="mt-12 border-t border-rule pt-4">
          <h2 className="mt-0">Archive this group</h2>
          <p className="mt-1 text-sm text-muted">
            An archived group leaves the listings and becomes read-only. Its page still works, and you can restore it
            later.
          </p>
          <form action={archiveGroup.bind(null, group.id, group.slug)} className="mt-2">
            <button className="button button-danger">Archive group</button>
          </form>
        </section>
      )}
    </>
  );
}
