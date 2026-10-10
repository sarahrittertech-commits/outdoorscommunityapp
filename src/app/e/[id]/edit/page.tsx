import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { updateEvent } from "@/app/actions/events";
import { EventForm } from "@/components/EventForm";
import { Notice } from "@/components/Notice";
import { requireViewer } from "@/lib/auth";
import { eventPhotoUrl } from "@/lib/eventPhotos";
import { loadEvent } from "@/lib/events";
import { loadGroup } from "@/lib/groups";

export const metadata: Metadata = { title: "Edit event", robots: { index: false } };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** FR-EV-2. */
export default async function EditEventPage({ params, searchParams }: Props) {
  const { id } = await params;
  await requireViewer(`/e/${id}/edit`);
  const { supabase, event, group } = await loadEvent(id);
  const { canManage } = await loadGroup(group.slug);
  if (!canManage) redirect(`/e/${id}?e=not_allowed`);

  const [{ data: details }, { data: faqs }] = await Promise.all([
    supabase.from("event_private_details").select("address").eq("event_id", event.id).maybeSingle(),
    supabase.from("event_faqs").select("question, answer").eq("event_id", event.id).order("position"),
  ]);

  return (
    <>
      <p className="breadcrumb">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> › <Link href={`/e/${event.id}`}>{event.title}</Link> ›
      </p>
      <h1>Edit event</h1>
      <Notice params={await searchParams} />
      <EventForm
        action={updateEvent.bind(null, event.id)}
        event={event}
        address={details?.address}
        photoUrl={event.photo_path ? eventPhotoUrl(supabase, event.photo_path) : null}
        faqs={faqs ?? []}
        submitLabel="Save changes"
      />
    </>
  );
}
