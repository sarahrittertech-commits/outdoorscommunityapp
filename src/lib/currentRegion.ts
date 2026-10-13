import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";

import type { RegionGroup } from "@/config/regionGroups";
import type { Region } from "@/config/regions";

import { getViewer } from "./auth";
import {
  defaultRegion,
  getGroup,
  getRegion,
  isLiveGroup,
  isLiveRegion,
  liveAreasIn,
  REGION_COOKIE,
  REGION_PARAM_HEADER,
  resolveRegionSlug,
} from "./regions";
import { createClient } from "./supabase/server";

export type CurrentRegion = {
  region: Region;
  /** `?region=all`: the page shows every region. */
  all: boolean;
  /** A big region (UC-40): the page shows all of its areas; `region` is the one it centres on. */
  group?: RegionGroup;
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
  const needsProfile = !isLiveRegion(value) && !isLiveGroup(value) && !isLiveRegion(cookie) && !isLiveGroup(cookie);
  const resolved = resolveRegionSlug({ param: value, cookie, profileTown: needsProfile ? await profileTown() : null });
  return {
    region: getRegion(resolved.slug)!,
    all: resolved.all,
    ...(resolved.group ? { group: getGroup(resolved.group) } : {}),
    param: value && (resolved.all || value === resolved.slug || value === resolved.group) ? value : undefined,
  };
});

/** Database ids of the regions, by slug (one small query per request). */
export const regionIds = cache(async (): Promise<Map<string, string>> => {
  const supabase = await createClient();
  const { data } = await supabase.from("regions").select("id, slug");
  return new Map((data ?? []).map((r) => [r.slug, r.id]));
});

/**
 * The database ids of the areas to filter listings by: one area, every area
 * of a big region (UC-40), or null for every region (`?region=all`). An area
 * missing from the database filters to nothing rather than to everything.
 */
export async function regionFilterIds(current: CurrentRegion): Promise<string[] | null> {
  if (current.all) return null;
  const ids = await regionIds();
  const slugs = current.group ? liveAreasIn(current.group.slug).map((r) => r.slug) : [current.region.slug];
  const found = slugs.map((s) => ids.get(s)).filter((id): id is string => Boolean(id));
  return found.length ? found : ["00000000-0000-0000-0000-000000000000"];
}

/** What a list covers, for its heading: "Western North Carolina", "the Southeast", "every region". */
export function scopeName(current: CurrentRegion): string {
  if (current.all) return "every region";
  if (current.group) return `the ${current.group.name}`;
  return current.region.name;
}

/** The short area name for a listing's region id, shown on lists that span a big region. */
export async function areaNames(): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  for (const [slug, id] of await regionIds()) {
    const r = getRegion(slug);
    if (r) names.set(id, r.shortName);
  }
  return names;
}

/** The region a group is in, from its region_id; the default region if the id isn't on the list. */
export async function regionOfGroup(regionId: string | null | undefined): Promise<Region> {
  for (const [slug, id] of await regionIds()) if (id === regionId) return getRegion(slug) ?? defaultRegion();
  return defaultRegion();
}
