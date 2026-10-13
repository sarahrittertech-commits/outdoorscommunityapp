import { describe, expect, it } from "vitest";

import { regionGroups } from "@/config/regionGroups";
import { regions } from "@/config/regions";
import { site } from "@/config/site";
import { towns } from "@/config/towns";
import { zipPrefixTowns, zipTowns } from "@/config/zips";

import { findTown, milesBetween, townForArea, townForZip, townKey } from "./geo";
import {
  getRegion,
  groupOf,
  hubTown,
  isLiveGroup,
  liveAreasIn,
  liveRegions,
  nearestRegion,
  regionForTown,
  regionReturnPath,
  resolveRegionSlug,
  townsInRegion,
} from "./regions";

describe("the region list (config/regions.ts)", () => {
  it("has unique slugs, and the default region is live", () => {
    expect(new Set(regions.map((r) => r.slug)).size).toBe(regions.length);
    expect(getRegion(site.defaultRegionSlug)?.status).toBe("live");
  });

  it("names hub towns that are on the town list, in that region", () => {
    for (const r of regions) {
      expect(r.hubs.length, r.slug).toBeGreaterThan(0);
      for (const hub of r.hubs) expect(findTown(hub)?.region, `${r.slug} hub ${hub}`).toBe(r.slug);
      expect(findTown(r.exampleTown)?.region, `${r.slug} example town`).toBe(r.slug);
      expect(townForZip(r.exampleZip)?.region, `${r.slug} example zip`).toBe(r.slug);
    }
  });

  it("has a valid time zone and a radius the database accepts", () => {
    for (const r of regions) {
      expect(() => new Intl.DateTimeFormat("en-US", { timeZone: r.timezone })).not.toThrow();
      expect(r.radiusMiles).toBeGreaterThanOrEqual(10);
      expect(r.radiusMiles).toBeLessThanOrEqual(250);
    }
  });
});

describe("towns (config/towns.ts)", () => {
  it("are unique by name and state", () => {
    const keys = towns.map((t) => `${t.name}, ${t.state}`.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("each have a unique key that finds them again", () => {
    const keys = towns.map(townKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const t of towns) expect(findTown(townKey(t)), townKey(t)).toBe(t);
  });

  it("belong to a region that exists, near its center", () => {
    for (const t of towns.filter((t) => t.region)) {
      const region = getRegion(t.region);
      expect(region, t.name).toBeDefined();
      expect(milesBetween(t, region!.center), `${t.name} from ${t.region}`).toBeLessThan(150);
    }
  });

  it("give every live region some towns", () => {
    for (const r of liveRegions()) expect(townsInRegion(r.slug).length, r.slug).toBeGreaterThanOrEqual(20);
  });
});

describe("a name used in two states", () => {
  it("is keyed with its state", () => {
    expect(townKey(findTown("Fayetteville, WV")!)).toBe("Fayetteville, WV");
    expect(townKey(findTown("Fayetteville, NC")!)).toBe("Fayetteville, NC");
    expect(townKey(findTown("Brevard")!)).toBe("Brevard");
  });

  it("means the default region's town when saved without a state", () => {
    expect(findTown("Fayetteville")?.state).toBe("NC");
    expect(townForArea("Fayetteville")?.state).toBe("NC");
  });

  it("is found by its state, abbreviated or spelled out", () => {
    expect(findTown("fayetteville, wv")?.state).toBe("WV");
    expect(townForArea("Fayetteville, West Virginia")?.state).toBe("WV");
    expect(townForArea("Fayetteville, WV and Ansted")?.region).toBe("new-river-gorge");
  });
});

describe("zip codes", () => {
  it("map every prefix to a known town", () => {
    for (const [prefix, town] of Object.entries(zipPrefixTowns)) {
      expect(prefix).toMatch(/^\d{3}$/);
      expect(findTown(town), `${prefix} -> ${town}`).toBeDefined();
    }
    for (const [zip, town] of Object.entries(zipTowns)) expect(findTown(town), `${zip} -> ${town}`).toBeDefined();
  });

  it("use the 5-digit table first, then the prefix", () => {
    expect(townForZip("98225")?.name).toBe("Bellingham");
    expect(townForZip("98199")?.name).toBe("Seattle");
    expect(townForZip("80302")?.name).toBe("Boulder");
    expect(townForZip("80218")?.name).toBe("Denver");
    expect(townForZip("25840")?.state).toBe("WV");
    expect(townForZip("28301")?.state).toBe("NC");
    expect(townForZip("37919")?.name).toBe("Knoxville");
    expect(townForZip("27609")?.name).toBe("Raleigh");
    expect(townForZip("59601")).toBeUndefined();
  });
});

describe("regions of places", () => {
  it("finds a town's region", () => {
    expect(regionForTown("Boulder")?.slug).toBe("front-range");
    expect(regionForTown("Durham")?.slug).toBe("triangle");
    expect(regionForTown("Brevard")?.slug).toBe("western-nc");
    expect(regionForTown("Red River Gorge")).toBeUndefined();
    expect(regionForTown("Atlantis")).toBeUndefined();
  });

  it("finds the nearest region within its radius", () => {
    expect(nearestRegion(47.61, -122.33)?.slug).toBe("puget-sound");
    expect(nearestRegion(39.74, -104.99)?.slug).toBe("front-range");
    expect(nearestRegion(35.96, -83.92)?.slug).toBe("east-tennessee");
    expect(nearestRegion(41.88, -87.63)).toBeUndefined(); // Chicago
    expect(nearestRegion(41.88, -87.63, { anyDistance: true })).toBeDefined();
  });

  it("starts Near you at the first hub", () => {
    expect(hubTown(getRegion("front-range")!).name).toBe("Denver");
    expect(hubTown(getRegion("new-river-gorge")!).state).toBe("WV");
  });
});

describe("which region a visitor is browsing", () => {
  it("takes the address first", () => {
    expect(resolveRegionSlug({ param: "triangle", cookie: "front-range", profileTown: "Seattle" })).toEqual({ slug: "triangle", all: false });
  });

  it("then the cookie", () => {
    expect(resolveRegionSlug({ cookie: "front-range", profileTown: "Seattle" })).toEqual({ slug: "front-range", all: false });
  });

  it("then the profile's home town", () => {
    expect(resolveRegionSlug({ profileTown: "Seattle" })).toEqual({ slug: "puget-sound", all: false });
  });

  it("then the default", () => {
    expect(resolveRegionSlug({})).toEqual({ slug: site.defaultRegionSlug, all: false });
    expect(resolveRegionSlug({ profileTown: "Red River Gorge" }).slug).toBe(site.defaultRegionSlug);
  });

  it("skips anything that isn't a live region", () => {
    expect(resolveRegionSlug({ param: "atlantis", cookie: "nowhere" }).slug).toBe(site.defaultRegionSlug);
    expect(resolveRegionSlug({ param: ["triangle", "front-range"] }).slug).toBe("triangle");
  });

  it("shows every region for all, keeping the region it would have used", () => {
    expect(resolveRegionSlug({ param: "all", cookie: "triangle" })).toEqual({ slug: "triangle", all: true });
  });
});

describe("big regions over local areas (UC-40)", () => {
  it("put every area in a big region that exists, with unique slugs that never clash with an area's", () => {
    expect(new Set(regionGroups.map((g) => g.slug)).size).toBe(regionGroups.length);
    for (const r of regions) expect(groupOf(r), r.slug).toBeDefined();
    for (const g of regionGroups) expect(getRegion(g.slug), g.slug).toBeUndefined();
  });

  it("group the Southeast's areas and know which big regions have none yet", () => {
    expect(liveAreasIn("southeast").map((r) => r.slug)).toEqual(expect.arrayContaining(["western-nc", "charlotte", "triangle", "upstate-sc", "east-tennessee"]));
    expect(groupOf(getRegion("new-river-gorge")!).slug).toBe("mid-atlantic");
    expect(isLiveGroup("southeast")).toBe(true);
    expect(isLiveGroup("midwest")).toBe(false);
  });

  it("browse a whole big region from the address, centred on the remembered area if it is in it", () => {
    expect(resolveRegionSlug({ param: "southeast", cookie: "charlotte" })).toEqual({ slug: "charlotte", all: false, group: "southeast" });
    expect(resolveRegionSlug({ param: "southeast", cookie: "front-range" })).toEqual({ slug: liveAreasIn("southeast")[0].slug, all: false, group: "southeast" });
  });

  it("remember a big region in the cookie, and let an area in the address win", () => {
    expect(resolveRegionSlug({ cookie: "rockies" })).toEqual({ slug: liveAreasIn("rockies")[0].slug, all: false, group: "rockies" });
    expect(resolveRegionSlug({ param: "wasatch", cookie: "rockies" })).toEqual({ slug: "wasatch", all: false });
  });

  it("skip a big region with no live area", () => {
    expect(resolveRegionSlug({ param: "midwest", cookie: "triangle" })).toEqual({ slug: "triangle", all: false });
  });
});

describe("returning after choosing a region", () => {
  it("stays on this site and drops the old region", () => {
    expect(regionReturnPath("/events?region=triangle&days=7")).toBe("/events?days=7");
    expect(regionReturnPath("//evil.example")).toBe("/");
    expect(regionReturnPath("/g/x?m=joined&region=wasatch")).toBe("/g/x");
    expect(regionReturnPath("https://evil.example")).toBe("/");
    expect(regionReturnPath(undefined)).toBe("/");
  });
});
