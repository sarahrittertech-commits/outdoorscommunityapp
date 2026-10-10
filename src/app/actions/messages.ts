"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { actingUser, checkArgs, fail, failOnError, succeed } from "@/lib/actions";
import { getViewer } from "@/lib/auth";
import { withMessage } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { formFields, idSchema, localPathSchema, messageSchema } from "@/lib/validation";

/**
 * FR-DM-1, FR-DM-6: send a message. The database decides whether it starts a
 * request, joins an open conversation or is refused (waiting, declined,
 * blocked, limits), and returns the conversation.
 */
export async function sendMessage(back: string, formData: FormData) {
  checkArgs("/messages", z.tuple([localPathSchema.refine((v) => v.startsWith("/messages"))]), [back]);
  const { supabase } = await actingUser(back);
  const parsed = messageSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(back, "invalid");

  const { data: conversationId, error } = await supabase.rpc("send_message", { p_to: parsed.data.to, p_body: parsed.data.body });
  failOnError(back, error);
  const isNew = back.startsWith("/messages/new");
  redirect(withMessage(`/messages/${conversationId}#latest`, { m: isNew ? "request_sent" : "message_sent" }));
}

/** FR-DM-2: the recipient accepts or declines. Declining works for a suspended account too. */
export async function answerRequest(conversationId: string, accept: boolean) {
  const back = `/messages/${conversationId}`;
  checkArgs("/messages", z.tuple([idSchema, z.boolean()]), [conversationId, accept]);
  const supabase = await signedIn(back, accept);
  const { error } = await supabase.rpc("answer_message_request", { p_conversation_id: conversationId, p_accept: accept });
  failOnError(back, error);
  if (accept) succeed(back, "request_accepted");
  succeed("/messages/requests", "request_declined");
}

/** FR-DM-2: either side can block at any time. The blocked person isn't told. */
export async function blockMember(userId: string, back: string) {
  checkArgs("/messages", z.tuple([idSchema, localPathSchema.refine((v) => v.startsWith("/messages"))]), [userId, back]);
  const supabase = await signedIn(back, false);
  const viewer = await getViewer();
  const { error } = await supabase.from("message_blocks").insert({ blocker_id: viewer!.id, blocked_id: userId });
  // Already blocked is fine.
  if (error && error.code !== "23505") failOnError(back, error);
  succeed("/messages", "member_blocked");
}

export async function unblockMember(userId: string) {
  const back = "/messages";
  checkArgs(back, z.tuple([idSchema]), [userId]);
  const supabase = await signedIn(back, false);
  const viewer = await getViewer();
  const { error } = await supabase.from("message_blocks").delete().eq("blocker_id", viewer!.id).eq("blocked_id", userId);
  failOnError(back, error);
  succeed(back, "member_unblocked");
}

/**
 * Blocking and declining protect the person doing them, so a suspended
 * account may still do both; anything that writes a message goes through
 * actingUser(), which turns suspended accounts away.
 */
async function signedIn(back: string, needsWrite: boolean) {
  if (needsWrite) return (await actingUser(back)).supabase;
  const viewer = await getViewer();
  if (!viewer) redirect(`/signin?next=${encodeURIComponent(back)}`);
  if (!viewer.onboarded) redirect(`/welcome?next=${encodeURIComponent(back)}`);
  return createClient();
}
