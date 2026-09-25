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
