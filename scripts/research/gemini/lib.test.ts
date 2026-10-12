import { describe, expect, it } from "vitest";

import { pageNames, pageShowsDate, parseFinds, pick, shapeProblem } from "./lib.mjs";

const subs = ["mountain-biking", "day-hikes"];
const good = {
  kind: "group",
  name: "Pisgah Area SORBA",
  subcategory: "mountain-biking",
  area: "Brevard",
  description: "Mountain bike club and trail advocacy group for the Pisgah area.",
  source_url: "https://www.pisgahareasorba.org",
};

describe("gemini sweep helpers", () => {
  it("takes areas in turn, then the next pass", () => {
    const config = { areas: [{ area: "A" }, { area: "B" }], passes: ["p1", "p2"] };
    expect([0, 1, 2, 3].map((n) => `${pick(config, n).area}${pick(config, n).pass}`)).toEqual(["Ap1", "Bp1", "Ap2", "Bp2"]);
  });

  it("reads a JSON array from a fenced or bare answer, and nothing from prose", () => {
    expect(parseFinds('Here:\n```json\n[{"name":"X"}]\n```')).toEqual([{ name: "X" }]);
    expect(parseFinds('[{"name":"Y"}]')).toEqual([{ name: "Y" }]);
    expect(parseFinds("I could not find anything.")).toEqual([]);
  });

  it("checks the shape the database requires, and refuses contact details", () => {
    expect(shapeProblem(good, subs)).toBeNull();
    expect(shapeProblem({ ...good, subcategory: "kiting" }, subs)).toBe("subcategory");
    expect(shapeProblem({ ...good, kind: "company" }, subs)).toBeNull();
    expect(shapeProblem({ ...good, kind: "person" }, subs)).toBe("kind");
    expect(shapeProblem({ ...good, description: "Call 828-555-1212 to join our rides." }, subs)).toBe("contact details in description");
  });

  it("wants the page to name the organization", () => {
    expect(pageNames("Welcome to Pisgah Area SORBA, building trails since 1990", "Pisgah Area SORBA")).toBe(true);
    expect(pageNames("Domain for sale", "Pisgah Area SORBA")).toBe(false);
  });

  it("finds the event's date on its page in common formats", () => {
    const start = "2026-11-07T09:00:00-05:00";
    expect(pageShowsDate("Saturday, November 7, 2026 9am", start, "America/New_York")).toBe(true);
    expect(pageShowsDate("Sat Nov 7 · 9:00 AM", start, "America/New_York")).toBe(true);
    expect(pageShowsDate("11/7/2026", start, "America/New_York")).toBe(true);
    expect(pageShowsDate("November 14, 2026", start, "America/New_York")).toBe(false);
  });
});
