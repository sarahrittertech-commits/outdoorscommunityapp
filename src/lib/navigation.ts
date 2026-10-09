import type { ErrorCode, NoticeCode } from "./messages";

// A placeholder origin for resolving paths. Anything that resolves to a
// different origin was never a path on this site.
const LOCAL = "http://local.invalid";

/**
 * Parse a path on this site, or return null. Rejects anything a browser
 * could read as another host: `//evil.com`, `/\evil.com`, tabs and other
 * control characters (browsers strip them, so `/%09/evil.com` and
 * `/\t/evil.com` become `//evil.com`), and paths like `/.//evil.com` that
 * normalize to a leading `//`.
 */
function parseLocalPath(value: string): URL | null {
  if (!value.startsWith("/")) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  for (const text of [value, decoded]) {
    if (text.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(text)) return null;
  }
  let url: URL;
  try {
    url = new URL(value, LOCAL);
  } catch {
    return null;
  }
  if (url.origin !== LOCAL || url.pathname.startsWith("//")) return null;
  return url;
}

/** Only allow redirects back into this site. */
export function safeNext(value: FormDataEntryValue | string | null | undefined, fallback = "/"): string {
  const url = typeof value === "string" ? parseLocalPath(value) : null;
  return url ? `${url.pathname}${url.search}${url.hash}` : fallback;
}

/**
 * A path with a notice (?m=) or error (?e=) code attached, replacing any
 * previous one. Used by every form action to report back. A path that
 * isn't on this site falls back to the home page.
 */
export function withMessage(path: string, message: { m: NoticeCode } | { e: ErrorCode }): string {
  const url = parseLocalPath(path) ?? new URL("/", LOCAL);
  url.searchParams.delete("m");
  url.searchParams.delete("e");
  if ("m" in message) url.searchParams.set("m", message.m);
  else url.searchParams.set("e", message.e);
  return `${url.pathname}${url.search}${url.hash}`;
}
