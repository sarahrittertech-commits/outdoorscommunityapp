import { describe, expect, it } from "vitest";

import { errorText, noticeText } from "./messages";

describe("message codes", () => {
  it("looks up known codes", () => {
    expect(noticeText("joined")).toBe("You joined the group.");
    expect(errorText("generic")).toMatch(/went wrong/);
  });

  it.each(["__proto__", "constructor", "toString", "hasOwnProperty", "nope", undefined])(
    "ignores %j",
    (code) => {
      expect(noticeText(code)).toBeNull();
      expect(errorText(code)).toBeNull();
    },
  );
});
