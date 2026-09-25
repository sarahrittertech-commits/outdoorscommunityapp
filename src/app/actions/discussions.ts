"use server";

import { actingUser, fail, failOnError, succeed } from "@/lib/actions";
import { errorCode } from "@/lib/db-errors";
import { formFields, idSchema, replySchema, threadSchema } from "@/lib/validation";

/** FR-DS-1. */
export async function createThread(groupId: string, slug: string, formData: FormData) {
  const back = `/g/${slug}/discussions`;
  const { viewer, supabase } = await actingUser(back);
  const parsed = threadSchema.safeParse(formFields(formData));
  if (!idSchema.safeParse(groupId).success || !parsed.success) fail(back, "invalid");

  const { data, error } = await supabase
    .from("threads")
    .insert({ group_id: groupId, author_id: viewer.id, title: parsed.data.title, body: parsed.data.body })
    .select("id")
    .single();
  if (error || !data) fail(back, errorCode(error));
  succeed(`/g/${slug}/discussions/${data.id}`, "thread_created");
}

/** FR-DS-2. */
export async function postReply(threadId: string, path: string, formData: FormData) {
  const { viewer, supabase } = await actingUser(path);
  const parsed = replySchema.safeParse(formFields(formData));
  if (!idSchema.safeParse(threadId).success || !parsed.success) fail(path, "invalid");

  const { error } = await supabase
    .from("replies")
    .insert({ thread_id: threadId, author_id: viewer.id, body: parsed.data.body });
  failOnError(path, error);
  succeed(`${path}#latest`, "reply_posted");
}

/** FR-DS-4: authors edit their own posts. */
export async function editThread(threadId: string, path: string, formData: FormData) {
  const { supabase } = await actingUser(path);
  const parsed = threadSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(path, "invalid");
  const { data, error } = await supabase
    .from("threads")
    .update({ title: parsed.data.title, body: parsed.data.body })
    .eq("id", threadId)
    .select("id");
  failOnError(path, error);
  if (!data?.length) fail(path, "not_allowed");
  succeed(path, "post_saved");
}

export async function editReply(replyId: string, path: string, formData: FormData) {
  const { supabase } = await actingUser(path);
  const parsed = replySchema.safeParse(formFields(formData));
  if (!parsed.success) fail(path, "invalid");
  const { data, error } = await supabase.from("replies").update({ body: parsed.data.body }).eq("id", replyId).select("id");
  failOnError(path, error);
  if (!data?.length) fail(path, "not_allowed");
  succeed(path, "post_saved");
}

export async function deleteOwnPost(targetType: "thread" | "reply", targetId: string, path: string) {
  const { supabase } = await actingUser(path);
  const { error } = await supabase.rpc("delete_own_post", { p_target_type: targetType, p_target_id: targetId });
  failOnError(path, error);
  succeed(path, "post_deleted");
}

/** FR-DS-5: moderator removal. */
export async function removePost(targetType: "thread" | "reply", targetId: string, path: string) {
  const { supabase } = await actingUser(path);
  const { error } = await supabase.rpc("remove_post", { p_target_type: targetType, p_target_id: targetId, p_reason: "" });
  failOnError(path, error);
  succeed(path, "post_removed");
}

export async function setThreadFlags(threadId: string, flags: { pinned?: boolean; locked?: boolean }, path: string) {
  const { supabase } = await actingUser(path);
  const { error } = await supabase.rpc("set_thread_flags", {
    p_thread_id: threadId,
    p_pinned: flags.pinned,
    p_locked: flags.locked,
  });
  failOnError(path, error);
  succeed(path, "thread_updated");
}
