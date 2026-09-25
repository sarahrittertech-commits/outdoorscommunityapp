"use server";

import { site } from "@/config/site";
import { actingUser, fail, failOnError, succeed } from "@/lib/actions";
import { errorCode } from "@/lib/db-errors";
import { slugify, slugWithSuffix } from "@/lib/slug";
import { formFields, groupSchema, idSchema } from "@/lib/validation";

/** FR-GR-1. The database makes the creator the owner. */
export async function createGroup(formData: FormData) {
  const back = "/groups/new";
  const { viewer, supabase } = await actingUser(back);
  const parsed = groupSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(back, "invalid");
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
      created_by: viewer.id,
    });
    if (!error) succeed(`/g/${slug}`, "group_created");
    if (error.code !== "23505") fail(back, errorCode(error));
  }
  fail(back, "generic");
}

/** FR-GR-3, FR-GR-4, FR-GR-5. */
export async function updateGroup(groupId: string, slug: string, formData: FormData) {
  const back = `/g/${slug}/edit`;
  const { supabase } = await actingUser(back);
  const parsed = groupSchema.safeParse(formFields(formData));
  if (!idSchema.safeParse(groupId).success || !parsed.success) fail(back, "invalid");
  const group = parsed.data;

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
    })
    .eq("id", groupId)
    .select("id");
  failOnError(back, error);
  if (!data?.length) fail(back, "not_allowed");
  succeed(`/g/${slug}`, "group_saved");
}

/** FR-GR-6. */
export async function archiveGroup(groupId: string, slug: string) {
  const back = `/g/${slug}/edit`;
  const { supabase } = await actingUser(back);
  const { error } = await supabase.rpc("archive_group", { p_group_id: groupId });
  failOnError(back, error);
  succeed(`/g/${slug}`, "group_archived");
}

export async function restoreGroup(groupId: string, slug: string) {
  const back = `/g/${slug}`;
  const { supabase } = await actingUser(back);
  const { error } = await supabase.rpc("restore_group", { p_group_id: groupId });
  failOnError(back, error);
  succeed(back, "group_restored");
}
