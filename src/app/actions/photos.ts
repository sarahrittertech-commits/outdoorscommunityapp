"use server";

import { z } from "zod";

import { actingUser, checkArgs, fail, failOnError, succeed } from "@/lib/actions";
import { errorCode } from "@/lib/db-errors";
import { reencodeEventPhoto } from "@/lib/eventPhotos";
import { groupPhotoPath, groupPhotoThumb, removeGroupPhotoFiles, uploadGroupPhoto } from "@/lib/groupPhotos";
import type { ErrorCode } from "@/lib/messages";
import {
  eventPhotoSchema,
  GROUP_PHOTO_BATCH,
  GROUP_PHOTO_BATCH_BYTES,
  groupPhotoAltSchema,
  idSchema,
  slugSchema,
} from "@/lib/validation";

/**
 * FR-GR-12: a member adds up to 10 photos, each with its own alt text. Every
 * file is checked and re-encoded before any is stored, so a bad file stops
 * the whole batch; then each photo is uploaded and listed, as the member, so
 * the storage policies and the database limits decide.
 */
export async function uploadGroupPhotos(groupId: string, slug: string, formData: FormData) {
  const back = `/g/${slug}/photos`;
  checkArgs(back, z.tuple([idSchema, slugSchema]), [groupId, slug]);
  const { viewer, supabase } = await actingUser(back);

  const picked: { file: File; alt: string }[] = [];
  for (let i = 0; i < GROUP_PHOTO_BATCH; i++) {
    const file = eventPhotoSchema.safeParse(formData.get(`photo${i}`));
    if (!file.success) fail(back, "photo_invalid");
    if (!file.data) continue;
    const alt = groupPhotoAltSchema.safeParse(formData.get(`alt${i}`));
    if (!alt.success) fail(back, "photo_alt_required");
    picked.push({ file: file.data, alt: alt.data });
  }
  if (!picked.length) fail(back, "photos_none");
  if (picked.reduce((sum, p) => sum + p.file.size, 0) > GROUP_PHOTO_BATCH_BYTES) fail(back, "photos_too_many");

  const encoded: { full: Buffer; thumb: Buffer; alt: string }[] = [];
  for (const p of picked) {
    const full = await reencodeEventPhoto(p.file);
    if (!full) fail(back, "photo_invalid");
    encoded.push({ full, thumb: await groupPhotoThumb(full), alt: p.alt });
  }

  let saved = 0;
  let firstError: ErrorCode | null = null;
  for (const photo of encoded) {
    const path = groupPhotoPath(groupId, viewer.id);
    const { error: uploadError } = await uploadGroupPhoto(supabase, path, photo.full, photo.thumb);
    if (uploadError) {
      firstError ??= "photos_failed";
      break;
    }
    const { error } = await supabase.from("group_photos").insert({ group_id: groupId, uploader_id: viewer.id, path, alt: photo.alt });
    if (error) {
      await removeGroupPhotoFiles(supabase, [path]);
      firstError ??= errorCode(error, "photos_failed");
      break;
    }
    saved++;
  }

  if (!firstError) succeed(back, "photos_added");
  // Limits come back by name; anything else after some were saved is a partial upload.
  fail(back, saved && firstError !== "gallery_full" && firstError !== "rate_limited" ? "photos_failed" : firstError);
}

/** FR-GR-13: the uploader deletes their photo, or an organizer removes it (logged). */
export async function removeGroupPhoto(photoId: string, slug: string) {
  const back = `/g/${slug}/photos/${photoId}`;
  checkArgs(`/g/${slug}/photos`, z.tuple([idSchema, slugSchema]), [photoId, slug]);
  const { viewer, supabase } = await actingUser(back);
  const { data: photo } = await supabase.from("group_photos").select("uploader_id").eq("id", photoId).maybeSingle();
  if (!photo) fail(`/g/${slug}/photos`, "not_found");

  const { data: path, error } = await supabase.rpc("remove_group_photo", { p_photo_id: photoId, p_reason: "" });
  failOnError(back, error);
  if (path) await removeGroupPhotoFiles(supabase, [path]);
  succeed(`/g/${slug}/photos`, photo.uploader_id === viewer.id ? "photo_deleted" : "photo_removed");
}

/** FR-GR-12: the page admin makes the gallery public, or members-only again. */
export async function setGroupPhotosPublic(groupId: string, slug: string, formData: FormData) {
  const back = `/g/${slug}/photos`;
  checkArgs(back, z.tuple([idSchema, slugSchema]), [groupId, slug]);
  const visibility = z.enum(["public", "members"]).safeParse(formData.get("visibility"));
  if (!visibility.success) fail(back, "invalid");
  const { supabase } = await actingUser(back);
  const { error } = await supabase.rpc("set_group_photos_public", { p_group_id: groupId, p_public: visibility.data === "public" });
  failOnError(back, error);
  succeed(back, visibility.data === "public" ? "photos_public" : "photos_members");
}
