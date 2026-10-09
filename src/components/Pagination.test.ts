import { describe, expect, it } from "vitest";

import { pageFrom } from "./Pagination";

// UT-6: a page number from the URL is bounded before it reaches a query.
describe("pageFrom", () => {
  it("reads a sensible page number", () => {
    expect(pageFrom("3")).toBe(3);
    expect(pageFrom(["2"])).toBe(2);
  });

  it("falls back to the first page for anything else", () => {
    expect(pageFrom(undefined)).toBe(1);
    expect(pageFrom("0")).toBe(1);
    expect(pageFrom("-4")).toBe(1);
    expect(pageFrom("2.5")).toBe(1);
    expect(pageFrom("tuesday")).toBe(1);
  });

  it("clamps a huge page so no query asks for a huge offset", () => {
    expect(pageFrom("99999999")).toBe(1000);
    expect(pageFrom("99999999", 7)).toBe(7);
    expect(pageFrom("5", 7)).toBe(5);
  });
});
