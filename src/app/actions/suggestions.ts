"use server";

import { z } from "zod";

import { actingUser, checkArgs, fail, failOnError, succeed } from "@/lib/actions";
import { formFields, idSchema, localPathSchema, suggestionSchema, suggestionStatusSchema } from "@/lib/validation";

/** FR-AD-4, FR-AD-7: the database checks the sender and the daily limit. */
export async function submitSuggestion(formData: FormData) {
  const back = "/suggest";
  const { viewer, supabase } = await actingUser(back);
  const parsed = suggestionSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(back, "invalid");

  const { error } = await supabase.from("suggestions").insert({
    user_id: viewer.id,
    kind: parsed.data.kind,
    title: parsed.data.title,
    details: parsed.data.details,
    link: parsed.data.link,
  });
  failOnError(back, error);
  succeed("/me#suggestions", "suggestion_sent");
}

/** FR-AD-6: site admin only; the database refuses anyone else. */
export async function setSuggestionStatus(suggestionId: string, back: string, formData: FormData) {
  const { supabase } = await actingUser("/admin");
  checkArgs("/admin", z.tuple([idSchema, localPathSchema.refine((v) => v.startsWith("/admin"))]), [suggestionId, back]);
  const parsed = suggestionStatusSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(back, "invalid");

  const { error } = await supabase.rpc("set_suggestion_status", {
    p_suggestion_id: suggestionId,
    p_status: parsed.data.status,
    p_note: parsed.data.note,
  });
  failOnError(back, error);
  succeed(back, "suggestion_updated");
}
