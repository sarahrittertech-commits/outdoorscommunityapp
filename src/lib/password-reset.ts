// FR-AC-18 and FR-AC-20: choosing a password without the current one is only
// allowed right after an emailed link (the sign-up confirmation or a reset). The callback route sets this short-lived,
// HTTP-only cookie when a reset link signs someone in, holding their user
// id; the reset action checks it matches the signed-in person and clears it.
// Without it, anyone at an unattended signed-in browser could change the
// password; with it, they would need the owner's email inbox.

export const RESET_COOKIE = "password_reset";
export const RESET_PATH = "/reset-password";
/** UC-29: where the sign-up confirmation link lands to choose a first password. */
export const SET_PASSWORD_PATH = "/set-password";
/** Matches the reset link's own lifetime. */
export const RESET_COOKIE_MAX_AGE = 60 * 60;
