import { describe, expect, it } from "vitest";

import {
  affinityTagsSchema,
  eventPhotoSchema,
  eventSchema,
  groupSchema,
  inviteTokenSchema,
  localPathSchema,
  onboardingSchema,
  parseInviteEmails,
  replySchema,
  slugSchema,
  suggestionSchema,
  suggestionStatusSchema,
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

  // FR-GR-16, FR-GR-14
  it("takes one of the five group types, or none, and optional cover alt text", () => {
    expect(groupSchema.parse(validGroup).groupType).toBeNull();
    expect(groupSchema.parse({ ...validGroup, groupType: "" }).groupType).toBeNull();
    expect(groupSchema.parse({ ...validGroup, groupType: "volunteer" }).groupType).toBe("volunteer");
    expect(groupSchema.safeParse({ ...validGroup, groupType: "cult" }).success).toBe(false);
    expect(groupSchema.parse({ ...validGroup, coverAlt: "  " }).coverAlt).toBeNull();
    expect(groupSchema.safeParse({ ...validGroup, coverAlt: "x".repeat(201) }).success).toBe(false);
  });

  const validEvent = {
    title: "Saturday paddle",
    startsLocal: "2026-10-03T09:00",
    endsLocal: "2026-10-03T12:00",
    timezone: "America/New_York",
    locationName: "Put-in",
    addressVisibility: "members",
    capacity: "",
    description: "An easy paddle for beginners.",
    price: "free",
    takesRsvps: "on",
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

  it("requires a description and a fee for a paid event (FR-EV-23, FR-EV-25)", () => {
    expect(eventSchema.safeParse({ ...validEvent, description: "" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...validEvent, description: "x".repeat(2001) }).success).toBe(false);
    expect(eventSchema.safeParse({ ...validEvent, price: "paid" }).success).toBe(false);
    const paid = eventSchema.parse({ ...validEvent, price: "paid", registrationFee: "$25", totalCost: "about $60" });
    expect(paid.isPaid).toBe(true);
    const free = eventSchema.parse({ ...validEvent, registrationFee: "$25" });
    expect(free.registrationFee).toBeNull();
  });

  it("keeps a waitlist only with places, and a sign-up link only without RSVPs (FR-EV-26 to FR-EV-28)", () => {
    expect(eventSchema.parse({ ...validEvent, waitlistEnabled: "on" }).waitlistEnabled).toBe(false);
    expect(eventSchema.parse({ ...validEvent, capacity: "20", waitlistEnabled: "on" }).waitlistEnabled).toBe(true);
    const link = { ...validEvent, signupUrl: "https://club.example.org/signup" };
    expect(eventSchema.parse(link).signupUrl).toBeNull();
    expect(eventSchema.parse({ ...link, takesRsvps: undefined }).signupUrl).toBe("https://club.example.org/signup");
    expect(eventSchema.safeParse({ ...link, takesRsvps: undefined, signupUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("accepts only small JPEG, PNG or WebP photos (FR-EV-24)", () => {
    expect(eventPhotoSchema.parse(new File([], "empty.jpg"))).toBeNull();
    expect(eventPhotoSchema.parse(new File(["x"], "a.jpg", { type: "image/jpeg" }))).toBeInstanceOf(File);
    expect(eventPhotoSchema.safeParse(new File(["x"], "a.gif", { type: "image/gif" })).success).toBe(false);
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    expect(eventPhotoSchema.safeParse(big).success).toBe(false);
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

describe("group website (FR-GR-23)", () => {
  const base = {
    name: "Trail Friends",
    description: "We ride every Saturday.",
    subcategoryId: "0b6f7a2e-1c1d-4c3b-9b1a-2f8e9d6c5b4a",
    area: "Brevard",
    joinPolicy: "open",
  };

  it("is optional", () => {
    expect(groupSchema.parse(base).website).toBeNull();
    expect(groupSchema.parse({ ...base, website: "  " }).website).toBeNull();
  });

  it("adds https when the scheme is missing", () => {
    expect(groupSchema.parse({ ...base, website: "dirtskrrts.com" }).website).toBe("https://dirtskrrts.com");
    expect(groupSchema.parse({ ...base, website: "https://www.dirtskrrts.com/" }).website).toBe("https://www.dirtskrrts.com/");
  });

  it("refuses things that aren't web addresses", () => {
    for (const website of ["javascript:alert(1)", "not a url", "https://", "ftp://example.org"]) {
      expect(groupSchema.safeParse({ ...base, website }).success).toBe(false);
    }
  });
});

describe("suggestions (FR-AD-4, FR-AD-6)", () => {
  const base = { kind: "group", title: "Pisgah Paddlers" };

  it("accepts a title alone and turns empty optional fields into null", () => {
    expect(suggestionSchema.parse({ ...base, details: "", link: "" })).toEqual({ ...base, details: null, link: null });
  });

  it("refuses an unknown kind, a short or long title, long details and non-http links", () => {
    expect(suggestionSchema.safeParse({ ...base, kind: "party" }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...base, title: " a " }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...base, title: "x".repeat(121) }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...base, details: "x".repeat(2001) }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...base, link: "javascript:alert(1)" }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...base, link: "https://example.org/club" }).success).toBe(true);
  });

  it("lets the site admin set planned, done or declined, never back to new", () => {
    expect(suggestionStatusSchema.safeParse({ status: "planned", note: "" }).success).toBe(true);
    expect(suggestionStatusSchema.safeParse({ status: "new" }).success).toBe(false);
    expect(suggestionStatusSchema.safeParse({ status: "done", note: "x".repeat(501) }).success).toBe(false);
  });
});
