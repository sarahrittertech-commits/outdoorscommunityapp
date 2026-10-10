import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { addSponsor, removeSponsor } from "@/app/actions/events";
import { Notice } from "@/components/Notice";
import { requireViewer } from "@/lib/auth";
import { eventPhotoUrl } from "@/lib/eventPhotos";
import { loadEvent } from "@/lib/events";
import { loadGroup } from "@/lib/groups";

export const metadata: Metadata = { title: "Sponsors", robots: { index: false } };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const MAX_SPONSORS = 5;

/**
 * FR-EV-14: the group's organizers add up to 5 sponsors, shown in the order
 * added under "Sponsored by" on the event page only. The database checks
 * who may add or remove them and the limit.
 */
export default async function SponsorsPage({ params, searchParams }: Props) {
  const { id } = await params;
  await requireViewer(`/e/${id}/sponsors`);
  const { supabase, event, group } = await loadEvent(id);
  const { canManage } = await loadGroup(group.slug);
  if (!canManage) redirect(`/e/${id}?e=not_allowed`);

  const { data: sponsors } = await supabase
    .from("event_sponsors")
    .select("id, name, website_url, logo_path")
    .eq("event_id", event.id)
    .order("created_at");
  const list = sponsors ?? [];

  return (
    <>
      <p className="breadcrumb">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> › <Link href={`/e/${event.id}`}>{event.title}</Link> ›
      </p>
      <h1>Sponsors</h1>
      <Notice params={await searchParams} />
      <p className="mt-2 text-sm text-muted">
        Shown under &ldquo;Sponsored by&rdquo; on the event page only, never in lists or search. Up to {MAX_SPONSORS}.
      </p>

      {list.length === 0 ? (
        <p className="mt-4">No sponsors yet.</p>
      ) : (
        <ol className="mt-4 list-decimal pl-6">
          {list.map((s) => (
            <li key={s.id} className="py-2">
              <span className="flex flex-wrap items-center gap-3">
                {s.logo_path && (
                  <Image src={eventPhotoUrl(supabase, s.logo_path)} alt="" width={80} height={40} className="h-10 w-auto object-contain" />
                )}
                <strong>{s.name}</strong>
                {s.website_url && <span className="text-sm text-muted">{s.website_url}</span>}
                <form action={removeSponsor.bind(null, event.id, s.id)} className="inline">
                  <button className="link-button text-danger">
                    Remove<span className="sr-only"> {s.name}</span>
                  </button>
                </form>
              </span>
            </li>
          ))}
        </ol>
      )}

      {list.length < MAX_SPONSORS && (
        <form action={addSponsor.bind(null, event.id)} className="mt-6">
          <h2>Add a sponsor</h2>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" required minLength={2} maxLength={100} />
          <label htmlFor="websiteUrl">
            Website <span className="hint">Optional</span>
          </label>
          <input id="websiteUrl" name="websiteUrl" type="url" maxLength={500} placeholder="https://" />
          <label htmlFor="logo">
            Logo <span className="hint">Optional. JPEG, PNG or WebP, up to 1 MB. The sponsor&apos;s name is its description.</span>
          </label>
          <input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" />
          <button className="button mt-4">Add sponsor</button>
        </form>
      )}
    </>
  );
}
