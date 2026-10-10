import "server-only";

import { site } from "@/config/site";

import { RESET_PATH, SET_PASSWORD_PATH } from "./password-reset";

// Where an emailed link sends someone once it has signed them in (UC-29):
// the reset link to *Set a new password*, the sign-up confirmation to
// *Create your password*, anything else to the welcome step. Both password
// pages also need the short-lived cookie that says the link was just used.
export function afterEmailLink(type: string | null, next: string): { path: string; passwordCookie: boolean } {
  const nextPath = new URL(next, site.url).pathname;
  if (type === "recovery" || nextPath === RESET_PATH) return { path: RESET_PATH, passwordCookie: true };
  if (nextPath === SET_PASSWORD_PATH) return { path: next, passwordCookie: true };
  return { path: `/welcome?next=${encodeURIComponent(next)}`, passwordCookie: false };
}

/** The link types the confirm page accepts. */
export const LINK_TYPES = ["signup", "recovery", "email", "invite", "magiclink", "email_change"] as const;
