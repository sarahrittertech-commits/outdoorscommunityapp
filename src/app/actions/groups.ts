"use server";

import { z } from "zod";

import { site } from "@/config/site";
import { actingUser, checkArgs, fail, failOnError, succeed } from "@/lib/actions";
import { errorCode } from "@/lib/db-errors";
import { reencodeEventPhoto } from "@/lib/eventPhotos";
import { groupCoverPath, removeGroupCover, uploadGroupCover } from "@/lib/groupCovers";
import { slugify, slugWithSuffix } from "@/lib/slug";
import { affinityTagsSchema, eventPhotoSchema, formFields, groupSchema, idSchema, slugSchema } from "@/lib/validation";

/** FR-GR-1. The database makes the creator the owner. */
export async function createGroup(formData: FormData) {
  const back = "/groups/new";
  const { viewer, supabase } = await actingUser(back);
  const parsed = groupSchema.safeParse(formFields(formData));
  const tags = affinityTagsSchema.safeParse(formData.getAll("affinityTags"));
  if (!parsed.success || !tags.success) fail(back, "invalid");
  const group = parsed.data;

  const { data: region } = await supabase.from("regions").select("id").eq("slug", site.defaultRegionSlug).single();
  if (!region) fail(back, "generic");

  // FR-GR-2: a readable, unique URL. Retry with a suffix if the name is taken.
  const base = slugify(group.name);
  for (const slug of [base, slugWithSuffix(base), slugWithSuffix(base)]) {
    const { error } = await supabase.from("groups").insert({
      slug,
      name: group.name,
      description: group.description,
      rules: group.rules,
      subcategory_id: group.subcategoryId,
      region_id: region.id,
      area: group.area,
      join_policy: group.joinPolicy,
      join_question: group.joinPolicy === "approval" ? group.joinQuestion : null,
      discussions_enabled: group.discussionsEnabled,
      affinity_tags: tags.data,
      website: group.website,
      member_list_visibility: group.memberListVisibility,
      group_type: group.groupType,
      created_by: viewer.id,
    });
    if (!error) {
      // UC-27: a first-time organizer's group waits for the site admin.
      const { data: created } = await supabase.from("groups").select("review_status").eq("slug", slug).maybeSingle();
      succeed(`/g/${slug}`, created?.review_status === "pending" ? "group_waiting" : "group_created");
    }
    if (error.code !== "23505") fail(back, errorCode(error));
  }
  fail(back, "generic");
}

/** FR-GR-3, FR-GR-4, FR-GR-5, with the type (FR-GR-16) and the cover photo kept, replaced or removed (FR-GR-14). */
export async function updateGroup(groupId: string, slug: string, formData: FormData) {
  const back = `/g/${slug}/edit`;
  const { supabase } = await actingUser(back);
  checkArgs(back, z.tuple([idSchema, slugSchema]), [groupId, slug]);
  const parsed = groupSchema.safeParse(formFields(formData));
  const tags = affinityTagsSchema.safeParse(formData.getAll("affinityTags"));
  if (!parsed.success || !tags.success) fail(back, "invalid");
  const group = parsed.data;

  // FR-GR-14: the same image rules as an event photo (FR-EV-24, TR-SEC-9).
  const coverFile = eventPhotoSchema.safeParse(formData.get("cover"));
  if (!coverFile.success) fail(back, "photo_invalid");
  let cover: Buffer | null = null;
  if (coverFile.data) {
    if (!group.coverAlt) fail(back, "photo_alt_required");
    cover = await reencodeEventPhoto(coverFile.data);
    if (!cover) fail(back, "photo_invalid");
  }

  const { data: current } = await supabase.from("groups").select("cover_image_path").eq("id", groupId).maybeSingle();
  if (!current) fail(back, "not_allowed");
  const keepCover = Boolean(current.cover_image_path) && !cover && !group.removeCover;
  if (keepCover && !group.coverAlt) fail(back, "photo_alt_required");

  // A new cover is uploaded first; the storage policies refuse anyone but
  // an active group's owner and admins.
  const newPath = cover ? groupCoverPath(groupId) : null;
  if (cover && newPath) {
    const { error: uploadError } = await uploadGroupCover(supabase, newPath, cover);
    if (uploadError) fail(back, "cover_failed");
  }
  const coverColumns = newPath
    ? { cover_image_path: newPath, cover_alt: group.coverAlt }
    : keepCover
      ? { cover_alt: group.coverAlt }
      : { cover_image_path: null, cover_alt: null };

  const { data, error } = await supabase
    .from("groups")
    .update({
      name: group.name,
      description: group.description,
      rules: group.rules,
      subcategory_id: group.subcategoryId,
      area: group.area,
      join_policy: group.joinPolicy,
      join_question: group.joinPolicy === "approval" ? group.joinQuestion : null,
      discussions_enabled: group.discussionsEnabled,
      affinity_tags: tags.data,
      website: group.website,
      member_list_visibility: group.memberListVisibility,
      group_type: group.groupType,
      ...coverColumns,
    })
    .eq("id", groupId)
    .select("id");
  if (error || !data?.length) {
    await removeGroupCover(supabase, newPath);
    failOnError(back, error);
    fail(back, "not_allowed");
  }
  if (!keepCover) await removeGroupCover(supabase, current.cover_image_path);
  succeed(`/g/${slug}`, "group_saved");
}

/** FR-GR-6. */
export async function archiveGroup(groupId: string, slug: string) {
  const back = `/g/${slug}/edit`;
  const { supabase } = await actingUser(back);
  checkArgs(back, z.tuple([idSchema, slugSchema]), [groupId, slug]);
  const { error } = await supabase.rpc("archive_group", { p_group_id: groupId });
  failOnError(back, error);
  succeed(`/g/${slug}`, "group_archived");
}

export async function restoreGroup(groupId: string, slug: string) {
  const back = `/g/${slug}`;
  const { supabase } = await actingUser(back);
  checkArgs(back, z.tuple([idSchema, slugSchema]), [groupId, slug]);
  const { error } = await supabase.rpc("restore_group", { p_group_id: groupId });
  failOnError(back, error);
  succeed(back, "group_restored");
}

/** FR-GR-21: the owner deletes a group the site admin declined, to start again. */
export async function deleteDeclinedGroup(groupId: string, slug: string) {
  const back = `/g/${slug}`;
  const { supabase } = await actingUser(back);
  checkArgs(back, z.tuple([idSchema, slugSchema]), [groupId, slug]);
  const { error } = await supabase.rpc("delete_declined_group", { p_group_id: groupId });
  failOnError(back, error);
  succeed("/groups/new", "group_deleted");
}
