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
 * Which region a visitor is browsing, in this order:
 *
 * 1. `?region=` in the address (a shared link, or "All regions": `all`);
 * 2. the `region` cookie, set when they chose one on /regions;
 * 3. the region of the home town on their profile, if signed in;
 * 4. the board's default region.
 *
 * Anything that isn't a live region is skipped. Nothing here is stored.
 */
export function resolveRegionSlug(sources: { param?: unknown; cookie?: string | null; profileTown?: string | null }): {
  slug: string;
  all: boolean;
} {
  const param = Array.isArray(sources.param) ? sources.param[0] : sources.param;
  const fallback = () => {
    if (isLiveRegion(sources.cookie)) return sources.cookie;
    const fromTown = regionForTown(sources.profileTown);
    if (fromTown?.status === "live") return fromTown.slug;
    return site.defaultRegionSlug;
  };
  if (param === ALL_REGIONS) return { slug: fallback(), all: true };
  if (isLiveRegion(param)) return { slug: param, all: false };
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
  return url.pathname + url.search + url.hash;
}
