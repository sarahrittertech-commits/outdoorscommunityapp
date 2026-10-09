import "server-only";

import { randomBytes } from "node:crypto";

import type { ServerClient } from "./supabase/server";

/**
 * FR-GR-14: the public storage bucket for group cover photos (TR-SEC-12).
 * The image rules are the event photo's (FR-EV-24): reencodeEventPhoto in
 * ./eventPhotos turns the upload into a new WebP before it is stored.
 */
export const GROUP_COVER_BUCKET = "group-covers-v2";

/** group-covers-v2/<group_id>/<random>.webp, the layout the storage policies expect. */
export function groupCoverPath(groupId: string): string {
  return `${groupId}/${randomBytes(12).toString("hex")}.webp`;
}

/** Uploads as the signed-in user, so the storage policies decide. */
export async function uploadGroupCover(supabase: ServerClient, path: string, body: Buffer) {
  return supabase.storage.from(GROUP_COVER_BUCKET).upload(path, body, { contentType: "image/webp", upsert: false });
}

/** Best effort: a leftover file is harmless, and the group no longer points at it. */
export async function removeGroupCover(supabase: ServerClient, path: string | null | undefined) {
  if (path) await supabase.storage.from(GROUP_COVER_BUCKET).remove([path]);
}

export function groupCoverUrl(supabase: ServerClient, path: string): string {
  return supabase.storage.from(GROUP_COVER_BUCKET).getPublicUrl(path).data.publicUrl;
}
