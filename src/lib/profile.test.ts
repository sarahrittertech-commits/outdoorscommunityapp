import { describe, expect, it } from "vitest";

import { site } from "@/config/site";

import { goalsDoneLine, goalYear, promptText, PROFILE_SECTION_VALUES } from "./profile";
import { aboutMeInput, aboutMeSchema, clearSectionSchema, onboardingSchema } from "./validation";

// UC-33: the About me form (FR-PR-2 to FR-PR-7, FR-PR-10).
describe("About me profile", () => {
  const cat = "11111111-1111-4111-8111-000000000001";

  function form(fields: Record<string, string | string[]>): FormData {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
    }
    return data;
  }

  it("collects the form's rows and Show/Hide selects", () => {
    const input = aboutMeInput(
      form({
        displayName: "Sam",
        activity: [cat, cat],
        promptKey1: "always_wanted",
        promptAnswer1: "snowboarding",
        goal1: "Summit Mount Mitchell",
        goalDone1: "on",
        goal3: "Paddle Section 9",
        show_town: "hide",
        show_goals: "show",
        shareWithMembers: "on",
      }),
    );
    expect(input.prompts).toHaveLength(3);
    expect(input.goals).toHaveLength(10);
    expect(input.hidden).toEqual(["town"]);

    const parsed = aboutMeSchema.parse(input);
    expect(parsed.activities).toEqual([cat]);
    expect(parsed.prompts).toEqual([{ key: "always_wanted", answer: "snowboarding" }]);
    expect(parsed.goals).toEqual([
      { body: "Summit Mount Mitchell", done: true },
      { body: "Paddle Section 9", done: false },
    ]);
    expect(parsed.shareWithMembers).toBe(true);
    expect(parsed.town).toBeNull();
  });

  it("is private by default: no sharing, nothing hidden", () => {
    const parsed = aboutMeSchema.parse(aboutMeInput(form({ displayName: "Sam" })));
    expect(parsed.shareWithMembers).toBe(false);
    expect(parsed.hidden).toEqual([]);
    expect(parsed.prompts).toEqual([]);
    expect(parsed.goals).toEqual([]);
  });

  it("refuses prompts that aren't on this board's list, or asked twice", () => {
    const unknown = aboutMeSchema.safeParse(aboutMeInput(form({ displayName: "Sam", promptKey1: "made_up", promptAnswer1: "x" })));
    expect(unknown.success).toBe(false);
    expect(unknown.error?.issues[0]?.message).toBe("prompt_invalid");

    const twice = aboutMeSchema.safeParse(
      aboutMeInput(
        form({ displayName: "Sam", promptKey1: "trail_snack", promptAnswer1: "a", promptKey2: "trail_snack", promptAnswer2: "b" }),
      ),
    );
    expect(twice.success).toBe(false);
  });

  it("ignores the prompt picked for a blank answer", () => {
    const parsed = aboutMeSchema.parse(aboutMeInput(form({ displayName: "Sam", promptKey1: "made_up", promptAnswer1: "  " })));
    expect(parsed.prompts).toEqual([]);
  });

  it("enforces the lengths the database checks", () => {
    expect(aboutMeSchema.safeParse(aboutMeInput(form({ displayName: "S" }))).success).toBe(false);
    expect(aboutMeSchema.safeParse(aboutMeInput(form({ displayName: "Sam", bio: "b".repeat(281) }))).success).toBe(false);
    expect(
      aboutMeSchema.safeParse(aboutMeInput(form({ displayName: "Sam", promptKey1: "trail_snack", promptAnswer1: "a".repeat(61) })))
        .success,
    ).toBe(false);
    expect(aboutMeSchema.safeParse(aboutMeInput(form({ displayName: "Sam", goal1: "g".repeat(101) }))).success).toBe(false);
    expect(aboutMeSchema.safeParse(aboutMeInput(form({ displayName: "Sam", activity: "not-an-id" }))).success).toBe(false);
  });

  it("has a key of the shape the database accepts for every prompt", () => {
    for (const p of site.profilePrompts) expect(p.key).toMatch(/^[a-z][a-z0-9_]{1,39}$/);
    expect(new Set(site.profilePrompts.map((p) => p.key)).size).toBe(site.profilePrompts.length);
    expect(promptText("always_wanted")).toBe("I've always wanted to try");
    expect(promptText("gone")).toBeUndefined();
  });

  it("counts goals done and uses the UTC year", () => {
    expect(goalsDoneLine([{ done: true }, { done: false }, { done: true }])).toBe("2 of 3 done");
    expect(goalYear(new Date("2026-12-31T23:30:00-05:00"))).toBe(2027);
  });

  it("lets the site admin clear every section but Groups", () => {
    expect(clearSectionSchema.safeParse({ section: "photo" }).success).toBe(true);
    expect(clearSectionSchema.safeParse({ section: "groups" }).success).toBe(false);
    expect(PROFILE_SECTION_VALUES).toContain("groups");
  });

  it("takes the welcome form's home town from the town list", () => {
    const base = { displayName: "Sam", confirmAdult: "on", acceptTerms: "on" };
    expect(onboardingSchema.parse({ ...base, area: "brevard" }).area).toBe("Brevard");
    expect(onboardingSchema.parse({ ...base, area: "" }).area).toBeNull();
    expect(onboardingSchema.safeParse({ ...base, area: "Atlantis" }).success).toBe(false);
  });
});
