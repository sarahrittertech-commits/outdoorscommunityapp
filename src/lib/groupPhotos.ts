import "server-only";

import { randomBytes } from "node:crypto";

import sharp from "sharp";

import type { ServerClient } from "./supabase/server";

/**
 * FR-GR-12: the PRIVATE storage bucket for group galleries (TR-SEC-12).
 * Files are never public: the server creates short-lived signed URLs as the
 * viewer, and the storage policies only sign files the viewer may see.
 */
export const GROUP_PHOTO_BUCKET = "group-photos";

/** How long a signed photo URL works. A page reload makes new ones. */
const SIGNED_URL_SECONDS = 60 * 60;

const THUMB_EDGE = 400;

/** group-photos/<group_id>/<uploader_id>/<random>.webp, the layout the storage policies expect. */
export function groupPhotoPath(groupId: string, uploaderId: string): string {
  return `${groupId}/${uploaderId}/${randomBytes(12).toString("hex")}.webp`;
}

/** The 400px list thumbnail kept next to each photo (TR-PERF-7). */
export function groupPhotoThumbPath(path: string): string {
  return path.replace(/\.webp$/, "_t.webp");
}

/** A thumbnail from the already re-encoded full-size WebP. */
export async function groupPhotoThumb(full: Buffer): Promise<Buffer> {
  return sharp(full)
    .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();
}

/** Uploads both files as the signed-in user, so the storage policies decide. */
export async function uploadGroupPhoto(supabase: ServerClient, path: string, full: Buffer, thumb: Buffer) {
  const bucket = supabase.storage.from(GROUP_PHOTO_BUCKET);
  const first = await bucket.upload(path, full, { contentType: "image/webp", upsert: false });
  if (first.error) return first;
  const second = await bucket.upload(groupPhotoThumbPath(path), thumb, { contentType: "image/webp", upsert: false });
  if (second.error) await bucket.remove([path]);
  return second;
}

/** Best effort: the row is already gone from the gallery, and only members could read a leftover file. */
export async function removeGroupPhotoFiles(supabase: ServerClient, paths: string[]) {
  if (paths.length) await supabase.storage.from(GROUP_PHOTO_BUCKET).remove(paths.flatMap((p) => [p, groupPhotoThumbPath(p)]));
}

/** Signed URLs, created as the viewer, keyed by path. Missing when the viewer may not see a file. */
export async function signGroupPhotos(supabase: ServerClient, paths: string[]): Promise<Map<string, string>> {
  if (!paths.length) return new Map();
  const { data } = await supabase.storage.from(GROUP_PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  const out = new Map<string, string>();
  for (const row of data ?? []) if (row.path && row.signedUrl && !row.error) out.set(row.path, row.signedUrl);
  return out;
}
