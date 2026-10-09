import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The brand contract (ADR-0008).
 *
 * Shared code names color slots; src/brand/tokens.css gives them values.
 * A cloned board replaces only that file, so when the shared tool starts
 * using a new slot, every board has to define it or the page quietly loses
 * a color. These tests fail by name instead.
 */

const BRAND = "src/brand/tokens.css";
const tokensCss = readFileSync(BRAND, "utf8");

/** Slot names defined in the brand file, e.g. "--panel". */
const defined = new Set(
  Array.from(tokensCss.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm), (m) => m[1]),
);

/** Palette names: a board's private colors, not for shared code to use. */
const palette = new Set(
  Array.from(
    tokensCss
      .slice(
        tokensCss.indexOf("/* Palette */"),
        tokensCss.indexOf("/* Roles */"),
      )
      .matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm),
    (m) => m[1],
  ),
);

async function filesUnder(dir: string, ext: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await filesUnder(path, ext)));
    else if (ext.some((e) => entry.name.endsWith(e))) out.push(path);
  }
  return out;
}

/** Where a slot is used, so a failure names the file to look at. */
async function usages(): Promise<Map<string, string[]>> {
  const found = new Map<string, string[]>();
  for (const file of await filesUnder("src", [".css", ".tsx", ".ts"])) {
    if (file === BRAND || file.endsWith(".test.ts")) continue;
    for (const [, name] of readFileSync(file, "utf8").matchAll(
      /var\((--[a-z0-9-]+)/g,
    )) {
      found.set(name, [...(found.get(name) ?? []), file]);
    }
  }
  return found;
}

describe("brand tokens", () => {
  it("defines every slot the shared code uses", async () => {
    const missing = [...(await usages())]
      // Tailwind's own --color-*/--font-* slots are defined by @theme in globals.css.
      .filter(
        ([name]) => !name.startsWith("--color-") && !name.startsWith("--font-"),
      )
      .filter(([name]) => !defined.has(name))
      .map(
        ([name, files]) =>
          `${name} (used in ${[...new Set(files)].join(", ")})`,
      );

    expect(
      missing,
      `Add these to ${BRAND}:\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });

  it("keeps this board's palette out of shared code", async () => {
    const leaked = [...(await usages())]
      .filter(([name]) => palette.has(name))
      .map(
        ([name, files]) =>
          `${name} (used in ${[...new Set(files)].join(", ")})`,
      );

    expect(
      leaked,
      `Shared code should use a role slot, not a palette name, so a cloned board can re-skin it:\n  ${leaked.join("\n  ")}`,
    ).toEqual([]);
  });

  it("gives the home page band every slot it needs", () => {
    for (const slot of [
      "--ridge-sky",
      "--ridge-haze",
      "--ridge-ink",
      "--ridge-ink-muted",
    ]) {
      expect(defined, `${slot} is missing from ${BRAND}`).toContain(slot);
    }
  });
});
