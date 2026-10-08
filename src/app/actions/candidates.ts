"use server";

import { actingUser, fail, failOnError, succeed } from "@/lib/actions";
import { idSchema } from "@/lib/validation";

/** FR-RS-6: list a research candidate as an unclaimed group. The database refuses anyone but the site admin. */
export async function listCandidate(candidateId: string) {
  const { supabase } = await actingUser("/admin");
  if (!idSchema.safeParse(candidateId).success) fail("/admin", "invalid");
  const { error } = await supabase.rpc("list_candidate", { p_candidate_id: candidateId });
  failOnError("/admin", error);
  succeed("/admin", "candidate_listed");
}

export async function skipCandidate(candidateId: string) {
  const { supabase } = await actingUser("/admin");
  if (!idSchema.safeParse(candidateId).success) fail("/admin", "invalid");
  const { error } = await supabase.rpc("skip_candidate", { p_candidate_id: candidateId });
  failOnError("/admin", error);
  succeed("/admin", "candidate_skipped");
}
