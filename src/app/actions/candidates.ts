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

/**
 * UC-12 (first part): list a kept guide or shop as an unclaimed listing in
 * the region the site admin picked. The database refuses anyone but the
 * site admin, and any region that isn't live.
 */
export async function listBusinessCandidate(candidateId: string, formData: FormData) {
  const { supabase } = await actingUser("/admin#guides-and-shops");
  const region = regionSlug.safeParse(formData.get("region"));
  if (!idSchema.safeParse(candidateId).success || !region.success) fail("/admin#guides-and-shops", "invalid");
  const { data: row } = await supabase.from("regions").select("id").eq("slug", region.data).maybeSingle();
  if (!row) fail("/admin#guides-and-shops", "region_closed");
  const { error } = await supabase.rpc("list_business_candidate", { p_candidate_id: candidateId, p_region_id: row.id });
  failOnError("/admin#guides-and-shops", error);
  succeed("/admin#guides-and-shops", "business_listed");
}

export async function skipBusinessCandidate(candidateId: string) {
  const { supabase } = await actingUser("/admin#guides-and-shops");
  if (!idSchema.safeParse(candidateId).success) fail("/admin#guides-and-shops", "invalid");
  const { error } = await supabase.rpc("skip_business_candidate", { p_candidate_id: candidateId });
  failOnError("/admin#guides-and-shops", error);
  succeed("/admin#guides-and-shops", "candidate_skipped");
}

/** Takes a guide or shop listing off the board (closed, wrong, or asked to go). */
export async function removeBusiness(businessId: string) {
  const { supabase } = await actingUser("/guides-and-shops");
  if (!idSchema.safeParse(businessId).success) fail("/guides-and-shops", "invalid");
  const { error } = await supabase.rpc("remove_business", { p_business_id: businessId });
  failOnError("/guides-and-shops", error);
  succeed("/guides-and-shops", "business_removed");
}
