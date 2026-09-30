"use server";

import { actingUser, fail, failOnError, succeed } from "@/lib/actions";
import { claimSchema, formFields, idSchema } from "@/lib/validation";

/** FR-GR-10: ask to claim an unclaimed listing. The database checks it is one. */
export async function requestClaim(groupId: string, slug: string, formData: FormData) {
  const back = `/g/${slug}`;
  const { viewer, supabase } = await actingUser(back);
  const parsed = claimSchema.safeParse(formFields(formData));
  if (!idSchema.safeParse(groupId).success || !parsed.success) fail(back, "invalid");

  const { error } = await supabase.from("group_claims").insert({ group_id: groupId, user_id: viewer.id, note: parsed.data.note });
  if (error?.code === "23505") fail(back, "claim_exists");
  failOnError(back, error);
  succeed(back, "claim_sent");
}

/** FR-GR-10: the site admin decides. The database refuses anyone else. */
export async function approveClaim(claimId: string) {
  const { supabase } = await actingUser("/admin");
  if (!idSchema.safeParse(claimId).success) fail("/admin", "invalid");
  const { error } = await supabase.rpc("approve_claim", {
    p_claim_id: claimId,
  });
  failOnError("/admin", error);
  succeed("/admin", "claim_approved");
}

export async function declineClaim(claimId: string) {
  const { supabase } = await actingUser("/admin");
  if (!idSchema.safeParse(claimId).success) fail("/admin", "invalid");
  const { error } = await supabase.rpc("decline_claim", {
    p_claim_id: claimId,
  });
  failOnError("/admin", error);
  succeed("/admin", "claim_declined");
}
