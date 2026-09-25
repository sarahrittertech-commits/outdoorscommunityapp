import type { ErrorCode, NoticeCode } from "./messages";

/**
 * A path with a notice (?m=) or error (?e=) code attached, replacing any
 * previous one. Used by every form action to report back.
 */
export function withMessage(path: string, message: { m: NoticeCode } | { e: ErrorCode }): string {
  const url = new URL(path, "http://local");
  url.searchParams.delete("m");
  url.searchParams.delete("e");
  if ("m" in message) url.searchParams.set("m", message.m);
  else url.searchParams.set("e", message.e);
  return `${url.pathname}${url.search}${url.hash}`;
}
