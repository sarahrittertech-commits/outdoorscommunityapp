import { regionGroups, type RegionGroup } from "@/config/regionGroups";
import { regions, type Region } from "@/config/regions";
import { site } from "@/config/site";
import { towns, type Town } from "@/config/towns";

import { findTown, milesBetween } from "./geo";
import { safeNext } from "./navigation";

/** The cookie that remembers the region a visitor chose on /regions. Functional only; no account needed. */
export const REGION_COOKIE = "region";
/** A year, in seconds. */
export const REGION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
/** Set by the proxy from `?region=`, so the layout (which gets no search params) agrees with the page. */
export const REGION_PARAM_HEADER = "x-region-param";
/** Set by the proxy: the requested path and query, for the header's "change region" link. */
export const REQUEST_PATH_HEADER = "x-request-path";
/** `?region=all`: every region at once, on the pages that offer it. */
export const ALL_REGIONS = "all";

const bySlug = new Map(regions.map((r) => [r.slug, r]));

/** A region by slug, or undefined. */
export function getRegion(slug: string | null | undefined): Region | undefined {
  return slug ? bySlug.get(slug) : undefined;
}

/** The region a visitor sees until they choose one. */
export function defaultRegion(): Region {
  return bySlug.get(site.defaultRegionSlug)!;
}

/** Regions that take groups and visitors, in list order. */
export function liveRegions(): Region[] {
  return regions.filter((r) => r.status === "live");
}

/** Whether a slug names a live region. */
export function isLiveRegion(slug: unknown): slug is string {
  return typeof slug === "string" && getRegion(slug)?.status === "live";
}

/** A big region by slug (UC-40), or undefined. */
export function getGroup(slug: string | null | undefined): RegionGroup | undefined {
  return slug ? regionGroups.find((g) => g.slug === slug) : undefined;
}

/** The big region an area belongs to. */
export function groupOf(region: Region): RegionGroup {
  return getGroup(region.group)!;
}

/** An area's live neighbours in its big region, itself included, in list order. */
export function liveAreasIn(groupSlug: string): Region[] {
  return liveRegions().filter((r) => r.group === groupSlug);
}

/** Whether a slug names a big region with at least one live area. */
export function isLiveGroup(slug: unknown): slug is string {
  return typeof slug === "string" && liveAreasIn(slug).length > 0;
}

/** The region a town (a Town, or a name or key) is in. */
export function regionForTown(town: Town | string | null | undefined): Region | undefined {
  const t = typeof town === "string" ? findTown(town) : town;
  return getRegion(t?.region);
}

/** The towns in a region, in list order. */
export function townsInRegion(slug: string): Town[] {
  return towns.filter((t) => t.region === slug);
}

/** The region's first hub town: where *Near you* starts. */
export function hubTown(region: Region): Town {
  return findTown(region.hubs[0]) ?? townsInRegion(region.slug)[0];
}

/**
 * The live region whose center is nearest a point, if it is within that
 * region's radius; with `anyDistance`, the nearest whatever the distance.
 */
export function nearestRegion(lat: number, lng: number, { anyDistance = false } = {}): Region | undefined {
  let best: { region: Region; miles: number } | undefined;
  for (const region of liveRegions()) {
    const miles = milesBetween({ lat, lng }, region.center);
    if (!best || miles < best.miles) best = { region, miles };
  }
  if (!best) return undefined;
  return anyDistance || best.miles <= best.region.radiusMiles ? best.region : undefined;
}

/**
 * Which area a visitor is browsing, in this order:
 *
 * 1. `?region=` in the address (a shared link; "All regions": `all`; a big
 *    region such as `southeast`, UC-40);
 * 2. the `region` cookie, set when they chose an area or a big region on
 *    /regions;
 * 3. the area of the home town on their profile, if signed in;
 * 4. the board's default area.
 *
 * Anything that isn't a live area or a big region with one is skipped.
 * With a big region, `slug` is the area its pages centre on (the remembered
 * area if it is in that region, else the region's first). Nothing here is
 * stored.
 */
export function resolveRegionSlug(sources: { param?: unknown; cookie?: string | null; profileTown?: string | null }): {
  slug: string;
  all: boolean;
  group?: string;
} {
  const param = Array.isArray(sources.param) ? sources.param[0] : sources.param;
  const fallback = () => {
    if (isLiveRegion(sources.cookie)) return sources.cookie;
    if (isLiveGroup(sources.cookie)) return liveAreasIn(sources.cookie)[0].slug;
    const fromTown = regionForTown(sources.profileTown);
    if (fromTown?.status === "live") return fromTown.slug;
    return site.defaultRegionSlug;
  };
  const inGroup = (group: string) => {
    const area = fallback();
    return getRegion(area)?.group === group ? area : liveAreasIn(group)[0].slug;
  };
  if (param === ALL_REGIONS) return { slug: fallback(), all: true };
  if (isLiveRegion(param)) return { slug: param, all: false };
  if (isLiveGroup(param)) return { slug: inGroup(param), all: false, group: param };
  if (param === undefined && isLiveGroup(sources.cookie)) return { slug: inGroup(sources.cookie), all: false, group: sources.cookie };
  return { slug: fallback(), all: false };
}

/**
 * The page to return to after choosing a region: a path on this site only
 * (lib/navigation safeNext), with any old `region=` dropped so the new
 * choice shows.
 */
export function regionReturnPath(next: unknown): string {
  const path = safeNext(typeof next === "string" ? next : null);
  const url = new URL(path, "http://local.invalid");
  url.searchParams.delete("region");
  // An old notice (?m=joined, ?e=…) would show again after the switch.
  url.searchParams.delete("m");
  url.searchParams.delete("e");
  return url.pathname + url.search + url.hash;
}
