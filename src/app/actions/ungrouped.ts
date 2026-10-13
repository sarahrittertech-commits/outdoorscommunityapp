"use server";

import { z } from "zod";

import { actingUser, fail, failOnError, succeed } from "@/lib/actions";

const BACK = "/admin/ungrouped";

const assignSchema = z.object({
  listing: z.string().trim().regex(/^(group|business):[a-z0-9]+(-[a-z0-9]+)*$/),
  area: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
});

/**
 * UC-41 step 4: the site admin puts a listing that is in no area yet into a
 * live area. The listing is "group:<slug>" or "business:<slug>". The
 * database refuses anyone but the site admin, and a closed area.
 */
export async function assignArea(formData: FormData) {
  const { supabase } = await actingUser(BACK);
  const parsed = assignSchema.safeParse({ listing: formData.get("listing"), area: formData.get("area") });
  if (!parsed.success) fail(BACK, "invalid");
  const [kind, slug] = parsed.data.listing.split(":");
  const { error } = await supabase.rpc("assign_area", { p_kind: kind, p_slug: slug, p_region_slug: parsed.data.area });
  failOnError(BACK, error);
  succeed(BACK, "area_assigned");
}
