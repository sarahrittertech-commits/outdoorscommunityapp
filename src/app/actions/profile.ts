"use server";

import { z } from "zod";

import { actingUser, checkArgs, fail, failOnError, succeed } from "@/lib/actions";
import { findTown } from "@/lib/geo";
import {
  profilePhotoPath,
  reencodeProfilePhoto,
  removeProfilePhotoFile,
  uploadProfilePhoto,
} from "@/lib/profilePhotos";
import {
  aboutMeInput,
  aboutMeSchema,
  clearSectionSchema,
  eventPhotoSchema,
  formFields,
  idSchema,
  profilePhotoAltSchema,
} from "@/lib/validation";

const EDIT = "/me/profile";

/**
 * UC-33: the About me form, saved in one transaction by save_about_me(),
 * which runs as the member so the same policies and limits apply.
 */
export async function saveAboutMe(formData: FormData) {
  const { viewer, supabase } = await actingUser(EDIT);
  const parsed = aboutMeSchema.safeParse(aboutMeInput(formData));
  if (!parsed.success) {
    fail(EDIT, parsed.error.issues.some((i) => i.message === "prompt_invalid") ? "prompt_invalid" : "invalid");
  }
  const form = parsed.data;

  // FR-PR-2: a town from the list, or the free-text area the member already
  // had (kept until they pick a town).
  let town = form.town;
  if (town) {
    const listed = findTown(town);
    if (listed) town = listed.name;
    else {
      const { data: current } = await supabase.from("profile_about").select("town").eq("user_id", viewer.id).maybeSingle();
      if (current?.town !== town) fail(EDIT, "town_invalid");
    }
  }

  const { error } = await supabase.rpc("save_about_me", {
    p_display_name: form.displayName,
    p_town: town,
    p_bio: form.bio,
    p_share_with_members: form.shareWithMembers,
    p_hidden: form.hidden,
    p_category_ids: form.activities,
    p_prompt_keys: form.prompts.map((p) => p.key),
    p_prompt_answers: form.prompts.map((p) => p.answer),
    p_goal_bodies: form.goals.map((g) => g.body),
    p_goal_done: form.goals.map((g) => g.done),
  });
  failOnError(EDIT, error);
  succeed(EDIT, "profile_saved");
}

/**
 * FR-PR-1: add or replace the photo, or change its description. The new
 * file is uploaded before the row points at it, and the old one is removed
 * after, so a failed upload changes nothing.
 */
export async function saveProfilePhoto(formData: FormData) {
  const { viewer, supabase } = await actingUser(EDIT);
  const file = eventPhotoSchema.safeParse(formData.get("photo"));
  if (!file.success) fail(EDIT, "photo_invalid");
  const alt = profilePhotoAltSchema.safeParse(formData.get("photoAlt") ?? "");
  if (!alt.success) fail(EDIT, "invalid");
  const description = alt.data ?? viewer.displayName ?? "Profile photo";

  const { data: current } = await supabase.from("profile_about").select("photo_path").eq("user_id", viewer.id).maybeSingle();

  if (!file.data) {
    // Only the description changes; there has to be a photo to describe.
    if (!current?.photo_path) fail(EDIT, "photo_invalid");
    const { error } = await supabase.from("profile_about").update({ photo_alt: description }).eq("user_id", viewer.id);
    failOnError(EDIT, error);
    succeed(EDIT, "profile_photo_saved");
  }

  const body = await reencodeProfilePhoto(file.data);
  if (!body) fail(EDIT, "photo_invalid");
  const path = profilePhotoPath(viewer.id);
  const { error: uploadError } = await uploadProfilePhoto(supabase, path, body);
  if (uploadError) fail(EDIT, "profile_photo_failed");

  // The about row may not exist yet. (No upsert: the owner can't update user_id.)
  const { error } = current
    ? await supabase.from("profile_about").update({ photo_path: path, photo_alt: description }).eq("user_id", viewer.id)
    : await supabase.from("profile_about").insert({ user_id: viewer.id, photo_path: path, photo_alt: description });
  if (error) {
    await removeProfilePhotoFile(supabase, path);
    failOnError(EDIT, error);
  }
  if (current?.photo_path) await removeProfilePhotoFile(supabase, current.photo_path);
  succeed(EDIT, "profile_photo_saved");
}

/** FR-PR-1: remove the photo and its file. */
export async function removeProfilePhoto() {
  const { viewer, supabase } = await actingUser(EDIT);
  const { data: current } = await supabase.from("profile_about").select("photo_path").eq("user_id", viewer.id).maybeSingle();
  if (current?.photo_path) {
    const { error } = await supabase.from("profile_about").update({ photo_path: null, photo_alt: null }).eq("user_id", viewer.id);
    failOnError(EDIT, error);
    await removeProfilePhotoFile(supabase, current.photo_path);
  }
  succeed(EDIT, "profile_photo_removed");
}

/** FR-PR-9: the site admin clears one section of someone's profile, logged. */
export async function clearProfileSection(userId: string, formData: FormData) {
  const back = `/u/${userId}`;
  checkArgs("/", z.tuple([idSchema]), [userId]);
  const { supabase } = await actingUser(back);
  const parsed = clearSectionSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(back, "invalid");

  const { data: path, error } = await supabase.rpc("clear_profile_section", {
    p_user: userId,
    p_section: parsed.data.section,
    p_reason: parsed.data.reason ?? "",
  });
  failOnError(back, error);
  if (path) await removeProfilePhotoFile(supabase, path);
  succeed(back, "profile_section_cleared");
}
