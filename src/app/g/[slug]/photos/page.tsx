import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { setGroupPhotosPublic, uploadGroupPhotos } from "@/app/actions/photos";
import { Notice } from "@/components/Notice";
import { groupPhotoThumbPath, signGroupPhotos } from "@/lib/groupPhotos";
import { loadGroup } from "@/lib/groups";
import { GROUP_PHOTO_BATCH } from "@/lib/validation";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { group } = await loadGroup((await params).slug);
  return { title: `Photos · ${group.name}`, robots: { index: false } };
}

/** How many photo rows show before "Add more". */
const OPEN_ROWS = 3;

function PhotoRow({ index }: { index: number }) {
  return (
    <div className="mt-3 rounded border border-rule p-2">
      <label htmlFor={`photo${index}`}>Photo {index + 1}</label>
      <input id={`photo${index}`} name={`photo${index}`} type="file" accept="image/jpeg,image/png,image/webp" />
      <label htmlFor={`alt${index}`}>
        Describe it <span className="hint">Required with a photo, for people who can&apos;t see it</span>
      </label>
      <input id={`alt${index}`} name={`alt${index}`} maxLength={200} />
    </div>
  );
}

/**
 * FR-GR-12: the group's gallery, newest first. Members only unless the page
 * admin made it public; the database and the private bucket decide, and the
 * thumbnails are signed as the viewer.
 */
export default async function GroupPhotosPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const { supabase, group, viewer, isMember, isOwner, isActive } = await loadGroup(slug);

  const canView = Boolean(group.photos_public || isMember || viewer?.isSiteAdmin);
  const { data: photos } = canView
    ? await supabase
        .from("group_photos")
        .select("id, path, alt")
        .eq("group_id", group.id)
        .eq("status", "visible")
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [] };
  const urls = await signGroupPhotos(supabase, (photos ?? []).map((p) => groupPhotoThumbPath(p.path)));
  const canUpload = Boolean(isMember && isActive && viewer?.canWrite);
  const canSetVisibility = Boolean(isActive && viewer?.canWrite && (isOwner || viewer?.isSiteAdmin));

  return (
    <>
      <p className="breadcrumb">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> ›
      </p>
      <h1>Photos</h1>
      <p className="mt-1 text-sm text-muted">
        {group.photos_public ? "Anyone can see these photos." : "Only members can see these photos."} Newest first.
        {!isActive && " This group is archived, so the gallery is read-only."}
      </p>
      <Notice params={query} />

      {!canView ? (
        <p className="mt-4">
          The photos are for members. <Link href={`/g/${group.slug}`}>Join the group</Link> to see them.
        </p>
      ) : photos?.length ? (
        <ul className="mt-4 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p) => {
            const src = urls.get(groupPhotoThumbPath(p.path));
            return (
              <li key={p.id} className="m-0">
                <Link href={`/g/${group.slug}/photos/${p.id}`} className="block">
                  {src ? (
                    <Image
                      src={src}
                      alt={p.alt}
                      width={400}
                      height={300}
                      unoptimized
                      className="aspect-[4/3] h-auto w-full rounded object-cover"
                    />
                  ) : (
                    <span>{p.alt}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-muted">No photos yet.</p>
      )}

      {canUpload && (
        <form action={uploadGroupPhotos.bind(null, group.id, group.slug)} className="mt-8">
          <h2>Add photos</h2>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Up to {GROUP_PHOTO_BATCH} at a time: JPEG, PNG or WebP, at most 5 MB each and 25 MB together. Location and
            camera details are removed. Members see them; you can delete yours, and the page admin and managers can remove
            any.
          </p>
          {Array.from({ length: OPEN_ROWS }, (_, i) => (
            <PhotoRow key={i} index={i} />
          ))}
          <details className="mt-3">
            <summary>Add more (up to {GROUP_PHOTO_BATCH})</summary>
            {Array.from({ length: GROUP_PHOTO_BATCH - OPEN_ROWS }, (_, i) => (
              <PhotoRow key={i + OPEN_ROWS} index={i + OPEN_ROWS} />
            ))}
          </details>
          <button className="button mt-3">Add photos</button>
        </form>
      )}

      {canSetVisibility && (
        <form action={setGroupPhotosPublic.bind(null, group.id, group.slug)} className="mt-8">
          <fieldset>
            <legend className="font-semibold">Who sees the photos</legend>
            <label className="check mt-1">
              <input type="radio" name="visibility" value="members" defaultChecked={!group.photos_public} />
              Members only
            </label>
            <label className="check mt-1">
              <input type="radio" name="visibility" value="public" defaultChecked={group.photos_public} />
              Anyone, signed in or not
            </label>
          </fieldset>
          <button className="button mt-2">Save</button>
        </form>
      )}
    </>
  );
}
