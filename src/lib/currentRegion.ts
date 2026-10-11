import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";

import type { Region } from "@/config/regions";

import { getViewer } from "./auth";
import { defaultRegion, getRegion, isLiveRegion, REGION_COOKIE, REGION_PARAM_HEADER, resolveRegionSlug } from "./regions";
import { createClient } from "./supabase/server";

export type CurrentRegion = {
  region: Region;
  /** `?region=all`: the page shows every region. */
  all: boolean;
  /** The `region` value to carry in the page's own links, if the address had one. */
  param?: string;
};

/** The viewer's home town from their profile (UC-33), readable by them only. */
const profileTown = cache(async (): Promise<string | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profile_about").select("town").eq("user_id", viewer.id).maybeSingle();
  return data?.town ?? null;
});

/**
 * The region this request is browsing (lib/regions resolveRegionSlug):
 * `?region=`, then the cookie, then the viewer's home town, then the default.
 * Pages pass their own `region` search param; the layout passes nothing and
 * reads the copy the proxy put in a request header.
 */
export const getCurrentRegion = cache(async (param?: string | string[]): Promise<CurrentRegion> => {
  const value = (Array.isArray(param) ? param[0] : param) ?? (await headers()).get(REGION_PARAM_HEADER) ?? undefined;
  const cookie = (await cookies()).get(REGION_COOKIE)?.value;
  // The profile is only looked up when the address and the cookie don't decide.
  const needsProfile = !isLiveRegion(value) && !isLiveRegion(cookie);
  const resolved = resolveRegionSlug({ param: value, cookie, profileTown: needsProfile ? await profileTown() : null });
  return {
    region: getRegion(resolved.slug)!,
    all: resolved.all,
    param: value && (resolved.all || value === resolved.slug) ? value : undefined,
  };
});

/** Database ids of the regions, by slug (one small query per request). */
export const regionIds = cache(async (): Promise<Map<string, string>> => {
  const supabase = await createClient();
  const { data } = await supabase.from("regions").select("id, slug");
  return new Map((data ?? []).map((r) => [r.slug, r.id]));
});

/**
 * The database id to filter listings by, or null for every region (`?region=all`).
 * A region missing from the database filters to nothing rather than to everything.
 */
export async function regionFilterId(current: CurrentRegion): Promise<string | null> {
  if (current.all) return null;
  return (await regionIds()).get(current.region.slug) ?? "00000000-0000-0000-0000-000000000000";
}

/** The region a group is in, from its region_id; the default region if the id isn't on the list. */
export async function regionOfGroup(regionId: string | null | undefined): Promise<Region> {
  for (const [slug, id] of await regionIds()) if (id === regionId) return getRegion(slug) ?? defaultRegion();
  return defaultRegion();
}
