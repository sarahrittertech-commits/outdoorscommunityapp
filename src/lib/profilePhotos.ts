import "server-only";

import { randomBytes } from "node:crypto";

import sharp from "sharp";

import type { ServerClient } from "./supabase/server";

/**
 * FR-PR-1: the PRIVATE storage bucket for profile photos (TR-SEC-12). Files
 * are never public: the server creates a short-lived signed URL as the
 * viewer, and the storage policies sign only a photo the viewer may see.
 */
export const PROFILE_PHOTO_BUCKET = "profile-photos";

/** Shown small and square: 320 x 320, center-cropped. */
export const PROFILE_PHOTO_EDGE = 320;

const SIGNED_URL_SECONDS = 60 * 60;

/** profile-photos/<user_id>/<random>.webp, the layout the storage policies expect. */
export function profilePhotoPath(userId: string): string {
  return `${userId}/${randomBytes(12).toString("hex")}.webp`;
}

/**
 * TR-SEC-9: decode the upload and write a new 320px square WebP, cropped
 * from the center, so the original is never stored. Turned upright from its
 * EXIF orientation first; sharp then writes no metadata (no location, no
 * camera). Null when the file isn't a JPEG, PNG or WebP image.
 */
export async function reencodeProfilePhoto(file: File): Promise<Buffer | null> {
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { failOn: "error", limitInputPixels: 50_000_000 });
    const { format } = await image.metadata();
    if (format !== "jpeg" && format !== "png" && format !== "webp") return null;
    return await image
      .rotate()
      .resize({ width: PROFILE_PHOTO_EDGE, height: PROFILE_PHOTO_EDGE, fit: "cover", position: "centre" })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return null;
  }
}

/** Uploads as the signed-in member, so the storage policies decide. */
export async function uploadProfilePhoto(supabase: ServerClient, path: string, body: Buffer) {
  return supabase.storage.from(PROFILE_PHOTO_BUCKET).upload(path, body, { contentType: "image/webp", upsert: false });
}

/** Best effort: nobody can read a file that is no longer someone's photo. */
export async function removeProfilePhotoFile(supabase: ServerClient, path: string | null | undefined) {
  if (path) await supabase.storage.from(PROFILE_PHOTO_BUCKET).remove([path]);
}

/** A signed URL created as the viewer, or null when they may not see the photo. */
export async function signProfilePhoto(supabase: ServerClient, path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(PROFILE_PHOTO_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  return data?.signedUrl ?? null;
}
