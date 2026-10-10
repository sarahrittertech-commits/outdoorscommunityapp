import { describe, expect, it } from "vitest";

import { zipTowns } from "@/config/zips";

import { aboutMiles, countWithin, findTown, milesBetween, parseZip, resolveLocation, townForArea, townForZip } from "./geo";

describe("towns and distance", () => {
  it("finds towns by name or alias, ignoring case", () => {
    expect(findTown("brevard")?.name).toBe("Brevard");
    expect(findTown("Buncombe County")?.name).toBe("Asheville");
    expect(findTown("Atlantis")).toBeUndefined();
    expect(findTown(undefined)).toBeUndefined();
  });

  it("matches a group's area to its first town", () => {
    expect(townForArea("Boone and Blowing Rock")?.name).toBe("Boone");
    expect(townForArea("Red River Gorge, Kentucky")?.name).toBe("Red River Gorge");
    expect(townForArea("Western North Carolina")).toBeUndefined();
  });

  it("measures miles between towns", () => {
    const miles = milesBetween(findTown("Asheville")!, findTown("Brevard")!);
    expect(miles).toBeGreaterThan(20);
    expect(miles).toBeLessThan(30);
  });

  it("rounds distances for display", () => {
    expect(aboutMiles(2)).toBe("nearby");
    expect(aboutMiles(23)).toBe("about 25 miles");
    expect(aboutMiles(117)).toBe("about 120 miles");
  });

  it("counts places within a radius, skipping unknown towns", () => {
    const asheville = findTown("Asheville")!;
    const places = [asheville, findTown("Brevard"), findTown("West Asheville"), undefined, findTown("Red River Gorge")];
    expect(countWithin(asheville, places, 10)).toBe(2);
    expect(countWithin(asheville, places, 50)).toBe(3);
    expect(countWithin(asheville, [], 25)).toBe(0);
  });
});

describe("zip codes (FR-BR-12)", () => {
  it("parses a 5-digit zip, with or without the +4", () => {
    expect(parseZip("28712")).toBe("28712");
    expect(parseZip(" 28712-1234 ")).toBe("28712");
    expect(parseZip("2871")).toBeUndefined();
    expect(parseZip("287123")).toBeUndefined();
    expect(parseZip("Brevard")).toBeUndefined();
    expect(parseZip("")).toBeUndefined();
    expect(parseZip(undefined)).toBeUndefined();
  });

  it("maps every listed zip to a known town", () => {
    for (const [zip, town] of Object.entries(zipTowns)) {
      expect(zip).toMatch(/^\d{5}$/);
      expect(findTown(town), `${zip} -> ${town}`).toBeDefined();
    }
  });

  it("looks up a zip's town, and nothing for unknown ones", () => {
    expect(townForZip("28712")?.name).toBe("Brevard");
    expect(townForZip("28768")?.name).toBe("Brevard");
    expect(townForZip("90210")).toBeUndefined();
    expect(townForZip("toString")).toBeUndefined();
  });

  it("lets a known zip win over the town select", () => {
    expect(resolveLocation("Asheville", "28712")).toEqual({ town: findTown("Brevard"), zip: "28712" });
    expect(resolveLocation("Asheville", "")).toEqual({ town: findTown("Asheville") });
    expect(resolveLocation(undefined, undefined)).toEqual({ town: undefined });
  });

  it("reports an unknown or malformed zip and falls back to the town", () => {
    expect(resolveLocation("Asheville", "90210")).toEqual({ town: findTown("Asheville"), unknownZip: "90210" });
    expect(resolveLocation("", "abc")).toEqual({ town: undefined, unknownZip: "abc" });
  });
});
