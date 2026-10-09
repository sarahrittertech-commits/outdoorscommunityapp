import { describe, expect, it } from "vitest";

import { COMMON_PASSWORDS, isCommonPassword } from "./common-passwords";
import { MAX_FAILURES, MAX_TRACKED, SignInLimiter, WINDOW_MS } from "./sign-in-limiter";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  newPasswordSchema,
  passwordErrorCode,
  passwordSchema,
  signInSchema,
  signUpSchema,
} from "./validation";

// UC-29: password rules (FR-AC-17) and the sign-in pause (FR-AC-19).
describe("password rules", () => {
  it("accepts 10 to 72 characters, spaces and all", () => {
    expect(passwordSchema.safeParse("a".repeat(9)).success).toBe(false);
    expect(passwordSchema.safeParse("correct horse").success).toBe(true);
    expect(passwordSchema.safeParse("x".repeat(72)).success).toBe(true);
    expect(passwordSchema.safeParse("x".repeat(73)).success).toBe(false);
  });

  it("counts bytes for the upper limit, as bcrypt does", () => {
    // 25 three-byte characters: 25 characters but 75 bytes.
    expect(passwordSchema.safeParse("€".repeat(25)).success).toBe(false);
    expect(passwordSchema.safeParse("€".repeat(24)).success).toBe(true);
  });

  it("never trims a password", () => {
    expect(passwordSchema.parse("  spaced out  ")).toBe("  spaced out  ");
  });

  it("refuses common passwords, ignoring case", () => {
    expect(isCommonPassword("Password123")).toBe(true);
    expect(isCommonPassword("QWERTYUIOP")).toBe(true);
    expect(isCommonPassword("a river runs by")).toBe(false);
    const result = passwordSchema.safeParse("Password123");
    expect(result.success).toBe(false);
    if (!result.success) expect(passwordErrorCode(result.error)).toBe("password_common");
  });

  it("lists only passwords the length rule would otherwise let through", () => {
    expect(COMMON_PASSWORDS.size).toBeGreaterThanOrEqual(100);
    for (const p of COMMON_PASSWORDS) {
      expect(p.length).toBeGreaterThanOrEqual(10);
      expect(p).toBe(p.toLowerCase());
    }
  });
});

describe("password forms", () => {
  const good = "a river runs by";

  it("signs up with a matching pair", () => {
    const parsed = signUpSchema.parse({ email: " Sam@Example.org ", password: good, passwordAgain: good });
    expect(parsed.email).toBe("Sam@Example.org");
  });

  it("names the rule a sign-up missed", () => {
    const code = (input: Record<string, string>) => {
      const result = signUpSchema.safeParse({ email: "sam@example.org", ...input });
      return result.success ? null : passwordErrorCode(result.error);
    };
    expect(code({ password: "short", passwordAgain: "short" })).toBe("password_length");
    expect(code({ password: "password123", passwordAgain: "password123" })).toBe("password_common");
    expect(code({ password: good, passwordAgain: `${good}!` })).toBe("password_mismatch");
  });

  it("refuses a bad email as plain invalid", () => {
    const result = signUpSchema.safeParse({ email: "not an email", password: good, passwordAgain: good });
    expect(result.success).toBe(false);
    if (!result.success) expect(passwordErrorCode(result.error)).toBe("invalid");
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "sam@example.org" }).success).toBe(true);
  });

  it("signs in with any non-empty password, so older passwords still work", () => {
    expect(signInSchema.safeParse({ email: "sam@example.org", password: "short" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "sam@example.org", password: "" }).success).toBe(false);
  });

  it("checks new passwords on reset and change", () => {
    expect(newPasswordSchema.safeParse({ password: good, passwordAgain: good }).success).toBe(true);
    expect(newPasswordSchema.safeParse({ password: good, passwordAgain: "other one!!" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: "old", password: good, passwordAgain: good }).success).toBe(true);
    expect(changePasswordSchema.safeParse({ currentPassword: "", password: good, passwordAgain: good }).success).toBe(false);
  });
});

describe("sign-in limiter", () => {
  const clock = () => {
    let now = 1_000_000;
    return { now: () => now, advance: (ms: number) => (now += ms) };
  };

  it("pauses an address after 5 failures in 15 minutes", () => {
    const c = clock();
    const limiter = new SignInLimiter(c.now);
    for (let i = 0; i < MAX_FAILURES - 1; i++) limiter.recordFailure("sam@example.org");
    expect(limiter.isPaused("sam@example.org")).toBe(false);
    limiter.recordFailure("SAM@example.org ");
    expect(limiter.isPaused("sam@example.org")).toBe(true);
    expect(limiter.isPaused("other@example.org")).toBe(false);
  });

  it("lifts the pause 15 minutes after the failures", () => {
    const c = clock();
    const limiter = new SignInLimiter(c.now);
    for (let i = 0; i < MAX_FAILURES; i++) limiter.recordFailure("sam@example.org");
    c.advance(WINDOW_MS - 1);
    expect(limiter.isPaused("sam@example.org")).toBe(true);
    c.advance(1);
    expect(limiter.isPaused("sam@example.org")).toBe(false);
  });

  it("forgets failures spread over more than 15 minutes", () => {
    const c = clock();
    const limiter = new SignInLimiter(c.now);
    for (let i = 0; i < MAX_FAILURES * 2; i++) {
      limiter.recordFailure("sam@example.org");
      c.advance(WINDOW_MS / 4);
    }
    expect(limiter.isPaused("sam@example.org")).toBe(false);
  });

  it("clears on a successful sign-in", () => {
    const limiter = new SignInLimiter();
    for (let i = 0; i < MAX_FAILURES - 1; i++) limiter.recordFailure("sam@example.org");
    limiter.recordSuccess("sam@example.org");
    limiter.recordFailure("sam@example.org");
    expect(limiter.isPaused("sam@example.org")).toBe(false);
  });

  it("keeps its memory bounded", () => {
    const limiter = new SignInLimiter();
    for (let i = 0; i < MAX_TRACKED + 50; i++) limiter.recordFailure(`u${i}@example.org`);
    expect(limiter.size).toBe(MAX_TRACKED);
  });
});
