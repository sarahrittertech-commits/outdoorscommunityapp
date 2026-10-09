import { describe, expect, it } from "vitest";

import { aboutMiles, findTown, milesBetween, townForArea } from "./geo";

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
});
