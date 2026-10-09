// FR-AC-20: *Set a new password* without the current one is only allowed
// right after the reset link. The callback route sets this short-lived,
// HTTP-only cookie when a reset link signs someone in, holding their user
// id; the reset action checks it matches the signed-in person and clears it.
// Without it, anyone at an unattended signed-in browser could change the
// password; with it, they would need the owner's email inbox.

export const RESET_COOKIE = "password_reset";
export const RESET_PATH = "/reset-password";
/** Matches the reset link's own lifetime. */
export const RESET_COOKIE_MAX_AGE = 60 * 60;
