import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createEvent } from "@/app/actions/events";
import { EventForm } from "@/components/EventForm";
import { Notice } from "@/components/Notice";
import { requireViewer } from "@/lib/auth";
import { loadGroup } from "@/lib/groups";

export const metadata: Metadata = { title: "Post an event", robots: { index: false } };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewEventPage({ params, searchParams }: Props) {
  const { slug } = await params;
  await requireViewer(`/g/${slug}/events/new`);
  const { group, canManage } = await loadGroup(slug);
  if (!canManage) redirect(`/g/${slug}?e=not_allowed`);

  return (
    <>
      <p className="text-sm">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> ›
      </p>
      <h1>Post an event</h1>
      <Notice params={await searchParams} />
      <EventForm action={createEvent.bind(null, group.id, group.slug)} submitLabel="Post event" />
    </>
  );
}
