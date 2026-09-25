import { describe, expect, it } from "vitest";

import { eventSchema, groupSchema, onboardingSchema, replySchema } from "./validation";

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
});
