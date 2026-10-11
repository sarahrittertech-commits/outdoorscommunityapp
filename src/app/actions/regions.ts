"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isLiveRegion, REGION_COOKIE, REGION_COOKIE_MAX_AGE, regionReturnPath } from "@/lib/regions";

const chooseSchema = z.object({
  region: z.string().refine(isLiveRegion),
  next: z.string().max(500).optional(),
});

/**
 * Regions: remember the region a visitor picked on /regions, in a cookie
 * (functional, a year, this site only), and go back to where they were.
 * Nothing is written to the database; signed out works the same.
 */
export async function chooseRegion(formData: FormData) {
  const parsed = chooseSchema.safeParse({ region: formData.get("region"), next: formData.get("next") ?? undefined });
  if (!parsed.success) redirect("/regions?e=invalid");
  (await cookies()).set(REGION_COOKIE, parsed.data.region, {
    path: "/",
    maxAge: REGION_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  redirect(regionReturnPath(parsed.data.next));
}
