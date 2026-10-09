import { describe, expect, it } from "vitest";

import { buildIcs } from "./ics";

// UT-3: the .ics file.
describe("buildIcs", () => {
  const ics = buildIcs(
    {
      id: "abc",
      title: "Paddle, then tacos; bring $5",
      description: "Line one\nLine two",
      startsAt: "2026-10-04T13:00:00.000Z",
      endsAt: "2026-10-04T17:00:00.000Z",
      location: "Hap Simpson Park",
      url: "https://board.example/e/abc",
    },
    "board.example",
    new Date("2026-09-25T00:00:00Z"),
  );

  it("writes UTC start and end times", () => {
    expect(ics).toContain("DTSTART:20261004T130000Z");
    expect(ics).toContain("DTEND:20261004T170000Z");
  });

  it("escapes commas, semicolons and newlines", () => {
    expect(ics).toContain("SUMMARY:Paddle\\, then tacos\\; bring $5");
    expect(ics).toContain("DESCRIPTION:Line one\\nLine two\\n\\nhttps://board.example/e/abc");
  });

  it("never lets a lone carriage return start a new property", () => {
    const injected = buildIcs(
      {
        id: "x",
        title: "Hike\rATTENDEE:mailto:someone@example.com",
        description: "",
        startsAt: "2026-10-04T13:00:00.000Z",
        endsAt: "2026-10-04T17:00:00.000Z",
        location: "Trailhead",
        url: "https://board.example/e/x",
      },
      "board.example",
    );
    expect(injected).toContain("SUMMARY:Hike\\nATTENDEE:mailto:someone@example.com");
    expect(injected.split("\r\n").some((line) => line.startsWith("ATTENDEE"))).toBe(false);
  });

  it("uses CRLF line endings and a stable UID", () => {
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:abc@board.example");
  });

  it("folds long lines", () => {
    const long = buildIcs(
      { id: "x", title: "T".repeat(200), description: "", startsAt: "2026-10-04T13:00:00Z", endsAt: "2026-10-04T14:00:00Z", location: "", url: "u" },
      "h",
    );
    for (const line of long.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
  });
});

// UT-7: folding counts octets, not characters, and never splits a character.
describe("line folding", () => {
  const withTitle = (title: string) =>
    buildIcs(
      {
        id: "abc",
        title,
        description: "An event.",
        startsAt: "2026-10-04T13:00:00.000Z",
        endsAt: "2026-10-04T17:00:00.000Z",
        location: "Somewhere",
        url: "https://board.example/e/abc",
      },
      "board.example",
      new Date("2026-09-25T00:00:00Z"),
    );
  const unfold = (ics: string) => ics.replace(/\r\n /g, "");

  it("never splits an emoji across a fold", () => {
    // One plain character then emoji, so the old cut at index 74 lands
    // between the two halves of one rather than on a boundary.
    const title = `x${"\u{1F600}".repeat(60)}`;
    const ics = withTitle(title);

    // Rejoining in JavaScript would repair a split pair, so check each line
    // as it is actually sent: a half surrogate cannot be encoded as UTF-8.
    for (const line of ics.split("\r\n")) {
      expect(line, "a folded line holds half an emoji").not.toMatch(/[\uD800-\uDFFF]/u);
    }
    expect(unfold(ics)).toContain(title);
  });

  it("folds on byte length, so a multi-byte title stays within 75 octets", () => {
    const ics = withTitle("é".repeat(120));
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});
