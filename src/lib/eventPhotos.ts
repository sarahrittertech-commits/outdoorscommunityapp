import "server-only";

import { randomBytes } from "node:crypto";

import sharp from "sharp";

import type { ServerClient } from "./supabase/server";

/** FR-EV-24: the public storage bucket for event photos (TR-SEC-12). */
export const EVENT_PHOTO_BUCKET = "event-photos";

const MAX_EDGE = 1600;

/**
 * TR-SEC-9: decode the upload and write a new WebP, so the original file is
 * never stored or served. The image is turned upright from its EXIF
 * orientation first; sharp then writes no metadata (no location, no camera).
 * Returns null when the file isn't a JPEG, PNG or WebP image, whatever its
 * name or declared type say.
 */
export async function reencodeEventPhoto(file: File): Promise<Buffer | null> {
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { failOn: "error", limitInputPixels: 50_000_000 });
    const { format } = await image.metadata();
    if (format !== "jpeg" && format !== "png" && format !== "webp") return null;
    return await image
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return null;
  }
}

/** event-photos/<group_id>/<event_id>/<random>.webp, the layout the storage policies expect. */
export function eventPhotoPath(groupId: string, eventId: string): string {
  return `${groupId}/${eventId}/${randomBytes(12).toString("hex")}.webp`;
}

/** Uploads as the signed-in user, so the storage policies decide. */
export async function uploadEventPhoto(supabase: ServerClient, path: string, body: Buffer) {
  return supabase.storage.from(EVENT_PHOTO_BUCKET).upload(path, body, { contentType: "image/webp", upsert: false });
}

/** Best effort: a leftover file is harmless, and the event no longer points at it. */
export async function removeEventPhoto(supabase: ServerClient, path: string | null | undefined) {
  if (path) await supabase.storage.from(EVENT_PHOTO_BUCKET).remove([path]);
}

export function eventPhotoUrl(supabase: ServerClient, path: string): string {
  return supabase.storage.from(EVENT_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}
