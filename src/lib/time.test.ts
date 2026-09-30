import { describe, expect, it } from "vitest";

import { dateParts, formatEventTime, isValidTimeZone, utcToZonedLocal, zonedLocalToUtc } from "./time";

// UT-2: event times are stored in UTC and shown in the event's own zone.
describe("time zones", () => {
  it("converts a New York wall-clock time in summer (EDT, UTC-4)", () => {
    expect(zonedLocalToUtc("2026-07-04T09:00", "America/New_York").toISOString()).toBe("2026-07-04T13:00:00.000Z");
  });

  it("converts a New York wall-clock time in winter (EST, UTC-5)", () => {
    expect(zonedLocalToUtc("2026-12-05T09:00", "America/New_York").toISOString()).toBe("2026-12-05T14:00:00.000Z");
  });

  it("handles the day after daylight saving ends", () => {
    // 1 November 2026 is the fall-back date in the US.
    expect(zonedLocalToUtc("2026-11-02T08:00", "America/New_York").toISOString()).toBe("2026-11-02T13:00:00.000Z");
  });

  it("round-trips for the edit form", () => {
    const utc = zonedLocalToUtc("2026-10-04T17:30", "America/Denver").toISOString();
    expect(utcToZonedLocal(utc, "America/Denver")).toBe("2026-10-04T17:30");
  });

  it("formats an event in its own zone, whatever the server's zone", () => {
    const text = formatEventTime("2026-10-04T13:00:00Z", "2026-10-04T17:00:00Z", "America/New_York");
    expect(text).toBe("Sun, Oct 4, 2026, 9:00 AM – 1:00 PM EDT");
  });

  it("rejects unknown zones", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});

describe("dateParts", () => {
  it("splits a date into card pieces in the event's own time zone", () => {
    // 01:30 UTC on 4 Oct is still 3 Oct, 9:30 PM in North Carolina.
    expect(dateParts("2026-10-04T01:30:00Z", "America/New_York")).toEqual({ day: "3", weekday: "Sat", month: "Oct", time: "9:30 PM" });
  });
});
