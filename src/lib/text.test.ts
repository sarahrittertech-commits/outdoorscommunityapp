import { describe, expect, it } from "vitest";

import { parsePlainText } from "./text";

// UT-1: plain-text renderer.
describe("parsePlainText", () => {
  it("keeps markup as literal text", () => {
    const [[line]] = parsePlainText("<script>alert(1)</script>");
    expect(line).toEqual([{ kind: "text", value: "<script>alert(1)</script>" }]);
  });

  it("turns http and https URLs into links, without trailing punctuation", () => {
    const [[line]] = parsePlainText("Map: https://example.com/trail?x=1. See you!");
    expect(line).toEqual([
      { kind: "text", value: "Map: " },
      { kind: "link", href: "https://example.com/trail?x=1", value: "https://example.com/trail?x=1" },
      { kind: "text", value: ". See you!" },
    ]);
  });

  it("does not link other schemes", () => {
    const [[line]] = parsePlainText("javascript:alert(1)");
    expect(line).toEqual([{ kind: "text", value: "javascript:alert(1)" }]);
  });

  it("splits paragraphs on blank lines and keeps single line breaks", () => {
    const paragraphs = parsePlainText("One\nTwo\n\n\nThree\r\n");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toHaveLength(2);
    expect(paragraphs[1]).toEqual([[{ kind: "text", value: "Three" }]]);
  });
});
