import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  bucketByDay,
  dayInZone,
  monthGrid,
  parseCalendarParams,
  parseDay,
  queryWindow,
  stepDay,
  viewDays,
  weekDays,
  weekTitle,
} from "./calendar";

// UT-10: the calendar's date logic (FR-AC-9).
describe("calendar days", () => {
  it("accepts real dates only", () => {
    expect(parseDay("2026-10-09")).toBe("2026-10-09");
    expect(parseDay("2028-02-29")).toBe("2028-02-29");
    expect(parseDay("2026-02-29")).toBeNull();
    expect(parseDay("2026-13-01")).toBeNull();
    expect(parseDay("1999-12-31")).toBeNull();
    expect(parseDay("2026-10-9")).toBeNull();
    expect(parseDay(undefined)).toBeNull();
  });

  it("adds days and months across boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
  });
});

describe("week ranges", () => {
  it("runs Sunday to Saturday around the day", () => {
    // 9 October 2026 is a Friday.
    expect(weekDays("2026-10-09")).toEqual(["2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"]);
    expect(weekDays("2026-10-04")[0]).toBe("2026-10-04");
  });

  it("crosses a month and a year", () => {
    expect(weekDays("2026-12-31")).toEqual(["2026-12-27", "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
    expect(weekTitle("2026-12-31")).toBe("Dec 27, 2026 – Jan 2, 2027");
    expect(weekTitle("2026-09-30")).toBe("Sep 27 – Oct 3, 2026");
    expect(weekTitle("2026-10-09")).toBe("Oct 4 – 10, 2026");
  });

  it("steps a week or a month", () => {
    expect(stepDay("week", "2026-10-09", 1)).toBe("2026-10-16");
    expect(stepDay("week", "2026-10-09", -1)).toBe("2026-10-02");
    expect(stepDay("month", "2026-10-31", 1)).toBe("2026-11-01");
    expect(stepDay("month", "2026-01-09", -1)).toBe("2025-12-01");
  });
});

describe("month grid", () => {
  it("is whole weeks, Sunday first, marking the other months' days", () => {
    const grid = monthGrid("2026-10-09");
    expect(grid).toHaveLength(5);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid[0][0]).toEqual({ day: "2026-09-27", inMonth: false });
    expect(grid[0][4]).toEqual({ day: "2026-10-01", inMonth: true });
    expect(grid[4][6]).toEqual({ day: "2026-10-31", inMonth: true });
  });

  it("has four rows for a February that starts on Sunday and six when needed", () => {
    expect(monthGrid("2026-02-01")).toHaveLength(4);
    // August 2026 starts on a Saturday and has 31 days.
    const aug = monthGrid("2026-08-15");
    expect(aug).toHaveLength(6);
    expect(aug[5][1]).toEqual({ day: "2026-08-31", inMonth: true });
  });

  it("lists the view's days first to last", () => {
    expect(viewDays("week", "2026-10-09")).toHaveLength(7);
    const month = viewDays("month", "2026-10-09");
    expect(month[0]).toBe("2026-09-27");
    expect(month.at(-1)).toBe("2026-10-31");
  });
});

describe("time-zone day bucketing", () => {
  it("places an event on the day it starts in its own zone", () => {
    // 11 pm Friday in Los Angeles is Saturday in UTC and in New York.
    expect(dayInZone("2026-10-10T06:00:00Z", "America/Los_Angeles")).toBe("2026-10-09");
    expect(dayInZone("2026-10-10T06:00:00Z", "America/New_York")).toBe("2026-10-10");
  });

  it("groups by day, each day in start order", () => {
    const events = [
      { id: "b", starts_at: "2026-10-09T18:00:00Z", timezone: "America/New_York" },
      { id: "late", starts_at: "2026-10-10T06:00:00Z", timezone: "America/Los_Angeles" },
      { id: "a", starts_at: "2026-10-09T13:00:00Z", timezone: "America/New_York" },
      { id: "sat", starts_at: "2026-10-10T13:00:00Z", timezone: "America/New_York" },
    ];
    const byDay = bucketByDay(events);
    expect(byDay.get("2026-10-09")?.map((e) => e.id)).toEqual(["a", "b", "late"]);
    expect(byDay.get("2026-10-10")?.map((e) => e.id)).toEqual(["sat"]);
  });

  it("queries a window wide enough for every zone", () => {
    const { from, to } = queryWindow(weekDays("2026-10-09"));
    expect(from).toBe("2026-10-03T10:00:00.000Z");
    expect(to).toBe("2026-10-11T12:00:00.000Z");
    // The first moment of Sunday in Kiribati (UTC+14) and the last of Saturday in UTC-12.
    expect(new Date(from) <= new Date("2026-10-03T10:00:00Z")).toBe(true);
    expect(new Date(to) >= new Date("2026-10-11T11:59:59Z")).toBe(true);
  });
});

describe("calendar parameters", () => {
  const parse = (q: Record<string, string>) => parseCalendarParams((k) => q[k]);

  it("defaults to the responsive view, today and going plus saved", () => {
    expect(parse({})).toEqual({ view: null, date: null, show: "all", group: null });
  });

  it("keeps valid values and drops the rest", () => {
    expect(parse({ cal: "week", date: "2026-10-09", show: "saved", group: "brevard-riders" })).toEqual({
      view: "week",
      date: "2026-10-09",
      show: "saved",
      group: "brevard-riders",
    });
    expect(parse({ cal: "year", date: "tomorrow", show: "toString", group: "Bad Slug!" })).toEqual({
      view: null,
      date: null,
      show: "all",
      group: null,
    });
  });
});
