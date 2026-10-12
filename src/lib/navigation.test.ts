import { describe, expect, it } from "vitest";

import { pastPasswordStep, safeNext, withMessage } from "./navigation";

// Every payload a browser could read as another host.
const offsite = [
  "//evil.com",
  "/\\evil.com",
  "/\\/evil.com",
  "\\\\evil.com",
  "/%09/evil.com",
  "/%5Cevil.com",
  "/%2F/evil.com",
  "/\t/evil.com",
  "/\n/evil.com",
  "/.//evil.com",
  "/./\\evil.com",
  "https://evil.com",
  "evil.com",
  "javascript:alert(1)",
  "/%E0%A4%A",
  "",
];

describe("safeNext", () => {
  it.each(offsite)("rejects %j", (value) => {
    expect(safeNext(value)).toBe("/");
  });

  it("keeps ordinary paths with their query and fragment", () => {
    expect(safeNext("/g/blue-ridge-hikers?tab=events#next")).toBe("/g/blue-ridge-hikers?tab=events#next");
    expect(safeNext("/")).toBe("/");
  });

  it("uses the fallback for missing values", () => {
    expect(safeNext(null, "/me")).toBe("/me");
    expect(safeNext(undefined)).toBe("/");
  });
});

describe("withMessage", () => {
  it("adds a notice and replaces an earlier one", () => {
    expect(withMessage("/g/x?e=generic", { m: "joined" })).toBe("/g/x?m=joined");
  });

  it.each(offsite.filter(Boolean))("never returns an offsite path for %j", (value) => {
    const result = withMessage(value, { e: "generic" });
    expect(result).toBe("/?e=generic");
  });
});

describe("pastPasswordStep", () => {
  it("unwraps a failed sign-up link's password step to where it was going", () => {
    expect(pastPasswordStep("/set-password?next=%2Fg%2Fpisgah")).toBe("/g/pisgah");
    expect(pastPasswordStep("/set-password?next=%2Fset-password%3Fnext%3D%252Fevents")).toBe("/events");
    expect(pastPasswordStep("/reset-password")).toBe("/");
    expect(pastPasswordStep("/events?days=7")).toBe("/events?days=7");
  });
});
