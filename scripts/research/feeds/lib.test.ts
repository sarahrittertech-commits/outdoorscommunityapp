import { describe, expect, it } from "vitest";

import { batches, localistEvents, miles, nearestHost } from "./lib.mjs";

const feed = {
  department: "North Carolina State Parks",
  timezone: "America/New_York",
  hosts: [
    { name: "West", center: [35.6, -82.55] },
    { name: "Triangle", center: [35.85, -78.8] },
  ],
};
const event = (over: Record<string, unknown> = {}) => ({
  event: {
    title: "Fall Colors Hike",
    location_name: "Gorges State Park",
    localist_url: "https://events.example/event/fall-colors",
    departments: [{ name: "North Carolina State Parks" }],
    geo: { latitude: "35.09", longitude: "-82.95", city: "Sapphire" },
    free: true,
    has_register: false,
    event_instances: [{ event_instance: { start: "2099-10-25T10:00:00-04:00", end: "2099-10-25T12:00:00-04:00", all_day: false } }],
    ...over,
  },
});

describe("feed reader helpers", () => {
  it("measures miles and finds the nearest host within range", () => {
    expect(Math.round(miles(35.6, -82.55, 35.85, -78.8))).toBeGreaterThan(200);
    expect(nearestHost(feed.hosts, 35.09, -82.95)?.name).toBe("West");
    expect(nearestHost(feed.hosts, 36.4, -76.7)).toBeNull();
  });

  it("keeps timed future department events near a host, and notes free or register", () => {
    const byHost = localistEvents({ events: [event()] }, feed);
    const west = byHost.get("West")!.events;
    expect(west).toHaveLength(1);
    expect(west[0]).toMatchObject({ title: "Fall Colors Hike (free)", location_name: "Gorges State Park, Sapphire", ends_at: "2099-10-25T12:00:00-04:00" });
  });

  it("skips all-day, past, other-department and far-away events", () => {
    const allDay = event({ event_instances: [{ event_instance: { start: "2099-10-25T00:00:00-04:00", all_day: true } }] });
    const past = event({ event_instances: [{ event_instance: { start: "2001-10-25T10:00:00-04:00", all_day: false } }] });
    const other = event({ departments: [{ name: "NC Museum of History" }] });
    const far = event({ geo: { latitude: "36.43", longitude: "-76.70" } });
    expect(localistEvents({ events: [allDay, past, other, far] }, feed).size).toBe(0);
  });

  it("splits events into intake-sized batches", () => {
    expect(batches(Array.from({ length: 85 }, (_, i) => i), 40).map((b) => b.length)).toEqual([40, 40, 5]);
  });
});
