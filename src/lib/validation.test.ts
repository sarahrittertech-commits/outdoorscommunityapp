import { describe, expect, it } from "vitest";

import {
  affinityTagsSchema,
  eventSchema,
  groupSchema,
  inviteTokenSchema,
  localPathSchema,
  onboardingSchema,
  parseInviteEmails,
  replySchema,
  slugSchema,
} from "./validation";

// UT-5: form schemas.
describe("form validation", () => {
  const validGroup = {
    name: "Trail Friends",
    description: "Weekly hikes for everyone.",
    subcategoryId: "11111111-1111-4111-8111-000000000001",
    area: "Brevard",
    joinPolicy: "open",
  };

  it("accepts a valid group and reads the checkbox", () => {
    const parsed = groupSchema.parse({ ...validGroup, discussionsEnabled: "on" });
    expect(parsed.discussionsEnabled).toBe(true);
    expect(parsed.rules).toBeNull();
  });

  it("rejects missing and over-long group fields", () => {
    expect(groupSchema.safeParse({ ...validGroup, name: "" }).success).toBe(false);
    expect(groupSchema.safeParse({ ...validGroup, name: "x".repeat(81) }).success).toBe(false);
    expect(groupSchema.safeParse({ ...validGroup, joinPolicy: "secret" }).success).toBe(false);
  });

  const validEvent = {
    title: "Saturday paddle",
    startsLocal: "2026-10-03T09:00",
    endsLocal: "2026-10-03T12:00",
    timezone: "America/New_York",
    locationName: "Put-in",
    addressVisibility: "members",
    capacity: "",
  };

  it("converts event times to UTC and treats an empty capacity as no limit", () => {
    const parsed = eventSchema.parse(validEvent);
    expect(parsed.startsAt).toBe("2026-10-03T13:00:00.000Z");
    expect(parsed.capacity).toBeNull();
  });

  it("rejects an event that ends before it starts, or an unknown zone", () => {
    expect(eventSchema.safeParse({ ...validEvent, endsLocal: "2026-10-03T08:00" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...validEvent, timezone: "Nowhere/Here" }).success).toBe(false);
  });

  it("requires both the 18+ box and the terms box", () => {
    expect(onboardingSchema.safeParse({ displayName: "Sam", confirmAdult: "on" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ displayName: "Sam", confirmAdult: "on", acceptTerms: "on" }).success).toBe(true);
  });

  it("limits reply length", () => {
    expect(replySchema.safeParse({ body: "x".repeat(10001) }).success).toBe(false);
    expect(replySchema.safeParse({ body: "   " }).success).toBe(false);
  });

  it("accepts only listed affinity tags, once each (FR-GR-11)", () => {
    expect(affinityTagsSchema.parse(["women", "bipoc", "women"])).toEqual(["women", "bipoc"]);
    expect(affinityTagsSchema.parse([])).toEqual([]);
    expect(affinityTagsSchema.safeParse(["ninjas"]).success).toBe(false);
  });
});

describe("bound action arguments", () => {
  it("accepts slugs as slugify makes them", () => {
    for (const slug of ["blue-ridge-hikers", "g1", "trail-friends-x7k2"]) expect(slugSchema.safeParse(slug).success).toBe(true);
    for (const slug of ["", "../admin", "Blue", "a--b", "-a", "a b", "x".repeat(81)]) expect(slugSchema.safeParse(slug).success).toBe(false);
  });

  it("accepts only canonical paths on this site", () => {
    expect(localPathSchema.safeParse("/g/x/discussions/0b6f7a2e-1c1d-4c3b-9b1a-2f8e9d6c5b4a").success).toBe(true);
    expect(localPathSchema.safeParse("/admin").success).toBe(true);
    for (const path of ["//evil.com", "/\\evil.com", "https://evil.com", "/.//evil.com", "admin"]) {
      expect(localPathSchema.safeParse(path).success).toBe(false);
    }
  });
});

// UC-31: pasted invite addresses (FR-MB-13).
describe("parseInviteEmails", () => {
  it("splits on commas, spaces and new lines, lowercases and dedupes", () => {
    expect(parseInviteEmails("A@x.org, b@x.org\nc@x.org  a@X.org;b@x.org")).toEqual({
      valid: ["a@x.org", "b@x.org", "c@x.org"],
      invalid: [],
    });
  });
  it("lists back what isn't an address", () => {
    expect(parseInviteEmails("ok@x.org nope bad@").invalid).toEqual(["nope", "bad@"]);
  });
  it("only accepts real invite codes", () => {
    expect(inviteTokenSchema.safeParse("a".repeat(64)).success).toBe(true);
    expect(inviteTokenSchema.safeParse("badtoken").success).toBe(false);
  });
});
