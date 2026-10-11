"use server";

import { z } from "zod";

import { actingUser, fail, failOnError, succeed } from "@/lib/actions";
import { isLiveRegion } from "@/lib/regions";
import { idSchema } from "@/lib/validation";

const regionSlug = z.string().refine(isLiveRegion);

/**
 * FR-RS-6: list a research candidate as an unclaimed group, in the region
 * the site admin picked. The database refuses anyone but the site admin,
 * and any region that isn't live (region_closed).
 */
export async function listCandidate(candidateId: string, formData: FormData) {
  const { supabase } = await actingUser("/admin");
  const region = regionSlug.safeParse(formData.get("region"));
  if (!idSchema.safeParse(candidateId).success || !region.success) fail("/admin", "invalid");
  const { data: row } = await supabase.from("regions").select("id").eq("slug", region.data).maybeSingle();
  if (!row) fail("/admin", "region_closed");
  const { error } = await supabase.rpc("list_candidate", { p_candidate_id: candidateId, p_region_id: row.id });
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
