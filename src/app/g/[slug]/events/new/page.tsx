import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createEvent } from "@/app/actions/events";
import { EventForm } from "@/components/EventForm";
import { Notice } from "@/components/Notice";
import { requireViewer } from "@/lib/auth";
import { regionOfGroup } from "@/lib/currentRegion";
import { loadGroup } from "@/lib/groups";

export const metadata: Metadata = { title: "Post an event", robots: { index: false } };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewEventPage({ params, searchParams }: Props) {
  const { slug } = await params;
  await requireViewer(`/g/${slug}/events/new`);
  // Owner and page managers only: the site admin can't insert events (RLS).
  const { group, canManage, isAdmin } = await loadGroup(slug);
  if (!canManage || !isAdmin) redirect(`/g/${slug}?e=not_allowed`);

  return (
    <>
      <p className="breadcrumb">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> ›
      </p>
      <h1>Post an event</h1>
      <Notice params={await searchParams} />
      <EventForm action={createEvent.bind(null, group.id, group.slug)} region={await regionOfGroup(group.region_id)} submitLabel="Post event" />
    </>
  );
}
