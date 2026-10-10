import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { removeGroupPhoto } from "@/app/actions/photos";
import { Notice } from "@/components/Notice";
import { site } from "@/config/site";
import { signGroupPhotos } from "@/lib/groupPhotos";
import { loadGroup } from "@/lib/groups";
import { formatPostDate } from "@/lib/time";
import { idSchema } from "@/lib/validation";

type Props = {
  params: Promise<{ slug: string; photoId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { group } = await loadGroup((await params).slug);
  return { title: `Photo · ${group.name}`, robots: { index: false } };
}

/** FR-GR-12, FR-GR-13: one photo full size, with delete, remove and report. */
export default async function GroupPhotoPage({ params, searchParams }: Props) {
  const { slug, photoId } = await params;
  if (!idSchema.safeParse(photoId).success) notFound();
  const { supabase, group, viewer, isActive, canManage } = await loadGroup(slug);

  // Visible photos the viewer may see only (RLS); anything else is not found.
  const { data: photo } = await supabase
    .from("group_photos")
    .select("id, path, alt, uploader_id, created_at, status, profiles(display_name)")
    .eq("id", photoId)
    .eq("group_id", group.id)
    .eq("status", "visible")
    .maybeSingle();
  if (!photo) notFound();

  const src = (await signGroupPhotos(supabase, [photo.path])).get(photo.path);
  const isUploader = Boolean(viewer && photo.uploader_id === viewer.id);
  const canDelete = Boolean(viewer?.canWrite && ((isUploader && isActive) || canManage));
  const path = `/g/${group.slug}/photos/${photo.id}`;

  return (
    <>
      <p className="breadcrumb">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> › <Link href={`/g/${group.slug}/photos`}>Photos</Link> ›
      </p>
      <Notice params={await searchParams} />
      <figure className="m-0 mt-2">
        {src ? (
          <Image src={src} alt={photo.alt} width={1600} height={1200} unoptimized className="h-auto w-full max-w-4xl rounded" />
        ) : (
          <p className="text-muted">This photo couldn&apos;t be loaded. Try reloading the page.</p>
        )}
        <figcaption className="mt-2">
          {photo.alt}
          <span className="block text-sm text-muted">
            Added by{" "}
            {photo.uploader_id ? (
              <Link href={`/u/${photo.uploader_id}`}>{photo.profiles?.display_name ?? "deleted user"}</Link>
            ) : (
              "deleted user"
            )}{" "}
            · {formatPostDate(photo.created_at, site.defaultTimezone)}
          </span>
        </figcaption>
      </figure>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 text-sm">
        {canDelete && (
          <form action={removeGroupPhoto.bind(null, photo.id, group.slug)}>
            <button className="link-button">{isUploader ? "Delete my photo" : "Remove photo"}</button>
          </form>
        )}
        {viewer && !isUploader && (
          <Link href={`/report?type=photo&id=${photo.id}&next=${encodeURIComponent(path)}`} className="text-muted">
            Report this photo
          </Link>
        )}
      </div>
    </>
  );
}
