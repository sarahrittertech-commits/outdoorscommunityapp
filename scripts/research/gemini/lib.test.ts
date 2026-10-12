import { describe, expect, it } from "vitest";

import {
  buildPrompt,
  eventsFromJsonLd,
  eventsFromTribe,
  groundedDomains,
  isGrounded,
  jsonLdEvents,
  looksInvented,
  pageNames,
  pageShowsDate,
  parseFinds,
  pick,
  shapeProblem,
} from "./lib.mjs";

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

  it("knows which sites Google actually returned", () => {
    const response = { candidates: [{ groundingMetadata: { groundingChunks: [{ web: { uri: "https://vertexaisearch.example/r/1", title: "pisgahareasorba.org" } }, { web: { title: "www.meetup.com" } }] } }] };
    const grounded = groundedDomains(response);
    expect(isGrounded("https://www.pisgahareasorba.org/events", grounded)).toBe(true);
    expect(isGrounded("https://www.meetup.com/some-group/", grounded)).toBe(true);
    expect(isGrounded("https://www.ncoutdoorhub.com/events/x", grounded)).toBe(false);
    expect(groundedDomains({}).size).toBe(0);
  });

  it("treats a batch of mostly dead sites as invented", () => {
    expect(looksInvented(["unreachable", "unreachable", "ok"])).toBe(true);
    expect(looksInvented(["ok", "ok", "unreachable"])).toBe(false);
    expect(looksInvented(["unreachable"])).toBe(false);
  });

  it("reads schema.org events from a page, keeping only future ones with a time as verified", () => {
    const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
      {"@type":"Event","name":"Saturday Group Ride","startDate":"2099-11-07T09:00:00-05:00","location":{"@type":"Place","name":"Oskar Blues","address":{"streetAddress":"342 Mountain Industrial Dr","addressLocality":"Brevard"}},"url":"https://club.example/rides/sat"},
      {"@type":"SportsEvent","name":"Annual Race","startDate":"2099-04-03"},
      {"@type":"Event","name":"Old Ride","startDate":"2001-01-01T09:00:00-05:00"},
      {"@type":"Organization","name":"Not an event"}]}</script><script type="application/ld+json">{broken</script>`;
    const events = eventsFromJsonLd(jsonLdEvents(html), { pageUrl: "https://club.example/events", timezone: "America/New_York" });
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ title: "Saturday Group Ride", verification: "verified", location_name: "Oskar Blues, 342 Mountain Industrial Dr, Brevard", source_url: "https://club.example/rides/sat" });
    expect(events[1]).toMatchObject({ title: "Annual Race", verification: "unverified", date_only: true, source_url: "https://club.example/events" });
  });

  it("reads The Events Calendar's public listing", () => {
    const json = { events: [
      { title: "Trail Work &amp; Tacos", utc_start_date: "2099-10-17 13:00:00", utc_end_date: "2099-10-17 16:00:00", all_day: false, timezone: "America/New_York", url: "https://club.example/event/trail-work/", venue: { venue: "Bent Creek", city: "Asheville" } },
      { title: "Fall Festival", utc_start_date: "2099-11-01 04:00:00", all_day: true, url: "https://club.example/event/fest/" },
    ] };
    const events = eventsFromTribe(json, { timezone: "America/New_York" });
    expect(events[0]).toMatchObject({ title: "Trail Work & Tacos", starts_at: "2099-10-17T13:00:00.000Z", verification: "verified", location_name: "Bent Creek, Asheville" });
    expect(events[1]).toMatchObject({ verification: "unverified", date_only: true });
  });

  it("asks Gemini for organizations and their events pages, never for dates", () => {
    const prompt = buildPrompt({ area: "Asheville, NC", pass: "cycling: clubs", subcategories: ["road"], knownNames: [], today: "2026-10-12" });
    expect(prompt).toContain("Do NOT list event dates");
    expect(prompt).toContain("events_url");
    expect(prompt).toContain("at most 12");
    expect(prompt).not.toContain("starts_at");
  });
});
