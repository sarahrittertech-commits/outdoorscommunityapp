import { describe, expect, it } from "vitest";

import { eventPageLinks, eventsFromIcs, farReason, meetupFeed, readJsonLd, robotsAllows, stateCode } from "./lib.mjs";

const asheville = { slug: "western-nc", state: "NC", center: { lat: 35.6, lng: -82.55 }, radiusMiles: 100 };
const now = new Date("2026-10-12T00:00:00Z");

describe("weekly source reader", () => {
  it("reads state names and codes", () => {
    expect(stateCode("North Carolina")).toBe("NC");
    expect(stateCode("n.c")).toBe("NC");
    expect(stateCode("Somewhere")).toBeNull();
  });

  it("flags events far from the region by map point or state", () => {
    expect(farReason({ location: { geo: { latitude: 35.3, longitude: -82.7 } } }, asheville)).toBeNull();
    expect(farReason({ location: { geo: { latitude: 38.57, longitude: -109.55 } } }, asheville)).toMatch(/miles away/);
    expect(farReason({ location: { address: { addressRegion: "UT" } } }, asheville)).toBe("Out of the region (UT)");
    expect(farReason({ location: { address: { addressRegion: "South Carolina" } } }, asheville)).toBeNull();
    expect(farReason({ location: "The shop" }, asheville)).toBeNull();
  });

  it("keeps cancelled events, marked, so the board can mark them too", () => {
    const events = readJsonLd(
      [
        { "@type": "Event", name: "Night ride", startDate: "2026-11-01T18:00:00-04:00", eventStatus: "https://schema.org/EventCancelled" },
        { "@type": "Event", name: "Moab trip", startDate: "2026-11-02T08:00:00-06:00", location: { address: { addressRegion: "UT" } } },
      ],
      { pageUrl: "https://club.example/events", timezone: "America/New_York", region: asheville, now },
    );
    expect(events[0].cancelled).toBe(true);
    expect(events[1].far).toBe("Out of the region (UT)");
  });

  it("finds a host's events pages and Meetup group on its homepage", () => {
    const html = `
      <a href="/about">About</a>
      <a href="/events/">Events</a>
      <a href="https://club.example/group-rides?x=1">Rides</a>
      <a href="https://www.meetup.com/asheville-hikers/">Meetup</a>
      <a href="https://other.example/events">Partner</a>
      <a href="/2026/05/tag/news/">Old</a>
      <a href="/calendar/2026/October/17/notch-peak-day-hike">One hike</a>
      <a href="/event-6810339">One event</a>`;
    expect(eventPageLinks(html, "https://club.example/")).toEqual([
      { url: "https://club.example/events/", kind: "own_page" },
      { url: "https://club.example/group-rides", kind: "own_page" },
      { url: "https://www.meetup.com/asheville-hikers/events/", kind: "meetup" },
    ]);
  });

  it("respects robots.txt", () => {
    const txt = "User-agent: *\nDisallow: /private\nAllow: /private/events\n\nUser-agent: BadBot\nDisallow: /";
    expect(robotsAllows(txt, "/events")).toBe(true);
    expect(robotsAllows(txt, "/private/x")).toBe(false);
    expect(robotsAllows(txt, "/private/events")).toBe(true);
    expect(robotsAllows("User-agent: *\nDisallow: /", "/events")).toBe(false);
    expect(robotsAllows("", "/anything")).toBe(true);
  });

  it("never takes Meetup's own pages for groups", () => {
    expect(eventPageLinks('<a href="https://www.meetup.com/login/">x</a>', "https://club.example/")).toEqual([]);
    expect(eventPageLinks('<a href="/start/">x</a><a href="/other-group/">y</a>', "https://www.meetup.com/slcmtb/events/")).toEqual([]);
    expect(meetupFeed("https://www.meetup.com/slcmtb/events/")).toBe("https://www.meetup.com/slcmtb/events/ical/");
    expect(meetupFeed("https://www.meetup.com/login/")).toBeNull();
  });

  it("reads an iCal feed: zones, all-day entries, cancellations, folded lines", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART;TZID=America/Denver:20261113T163000",
      "DTEND;TZID=America/Denver:20261113T183000",
      "SUMMARY:Social Ride - Milky Way\\, Big",
      " Dipper",
      "URL:https://www.meetup.com/slcmtb/events/1/",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20261120",
      "SUMMARY:Trail day",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "DTSTART:20261121T150000Z",
      "SUMMARY:Called off ride",
      "STATUS:CANCELLED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const events = eventsFromIcs(ics, { pageUrl: "https://www.meetup.com/slcmtb/events/", timezone: "America/Denver", region: null, now });
    expect(events[0]).toMatchObject({ title: "Social Ride - Milky Way, BigDipper", starts_at: "2026-11-13T16:30:00", timezone: "America/Denver", verification: "verified" });
    expect(events[1]).toMatchObject({ date_only: true, verification: "unverified" });
    expect(events[2]).toMatchObject({ starts_at: "2026-11-21T15:00:00Z", cancelled: true });
  });
});
