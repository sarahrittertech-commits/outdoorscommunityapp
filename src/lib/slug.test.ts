import { describe, expect, it } from "vitest";

import { slugify, slugWithSuffix } from "./slug";

// UT-4: group URLs.
describe("slugify", () => {
  it("makes lowercase, URL-safe slugs", () => {
    expect(slugify("Brevard Saturday Paddlers!")).toBe("brevard-saturday-paddlers");
    expect(slugify("  Café & Crag  ")).toBe("cafe-and-crag");
  });

  it("never returns an empty slug", () => {
    expect(slugify("!!!")).toBe("group");
  });

  it("gives two groups with the same name distinct slugs", () => {
    const base = slugify("Trail Friends");
    const variant = slugWithSuffix(base, () => 0.5);
    expect(variant).not.toBe(base);
    expect(variant).toMatch(/^trail-friends-[a-z0-9]{4}$/);
  });

  it("matches the database's slug rule", () => {
    const rule = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    for (const name of ["A  B", "--x--", "Über Trail", "1st Saturday Hike"]) {
      expect(slugify(name)).toMatch(rule);
    }
  });
});
