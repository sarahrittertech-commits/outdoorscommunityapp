// Messages shown after a form submits. Forms redirect back with a short code
// (?m=joined or ?e=event_full) rather than text, so nobody can put words on
// the page by crafting a link.

export const notices = {
  joined: "You joined the group.",
  requested: "Request sent. An organizer will review it.",
  left: "You left the group.",
  rsvp_going: "You're going. See you there.",
  rsvp_not_going: "Got it, you're not going.",
  group_created: "Your group is live.",
  group_saved: "Group details saved.",
  group_archived: "Group archived. It is hidden from listings and read-only.",
  group_restored: "Group restored.",
  event_created: "Event posted.",
  event_saved: "Event saved.",
  event_cancelled: "Event cancelled.",
  thread_created: "Thread posted.",
  reply_posted: "Reply posted.",
  post_saved: "Post saved.",
  post_deleted: "Post deleted.",
  post_removed: "Post removed.",
  thread_updated: "Thread updated.",
  member_approved: "Request approved.",
  member_declined: "Request declined.",
  member_removed: "Member removed.",
  role_changed: "Role changed.",
  invite_link_created: "Invite link made. Copy it below; any older link has stopped working.",
  invite_link_off: "Invite link turned off. It no longer works.",
  invites_sent: "Invites saved. Addresses invited in the last 30 days were skipped.",
  manager_invited: "Page manager invite saved.",
  manager_invite_cancelled: "Page manager invite cancelled.",
  joined_by_invite: "You joined the group.", // the group page names the group instead
  manager_joined: "You joined the group as a page manager.",
  ownership_transferred: "Ownership transferred.",
  reported: "Thanks. The report has been sent to the moderators.",
  report_resolved: "Report closed.",
  profile_saved: "Profile saved.",
  welcome: "Welcome aboard.",
  signup_sent: "Check your email to confirm your address. The link works for 24 hours.",
  reset_sent: "If that address has an account, we've sent a link to set a new password. It works for 1 hour.",
  password_reset: "Your new password is set. Any other devices signed in to your account have been signed out.",
  password_changed: "Password changed. Any other devices signed in to your account have been signed out.",
  signed_out: "You are signed out.",
  account_deleted: "Your account has been deleted.",
  user_suspended: "Account suspended.",
  user_unsuspended: "Account unsuspended.",
  group_removed: "Group removed.",
  claim_sent: "Thanks. The site admin will check your claim; the result will show on this page.",
  claim_approved: "Claim approved. They now own the group.",
  claim_declined: "Claim declined.",
  candidate_listed: "Listed. It's on the board as an unclaimed listing.",
  candidate_skipped: "Skipped. It won't be suggested again.",
} as const;

export const errors = {
  generic: "Something went wrong. Please try again.",
  invalid: "Some of those details aren't right. Check the form and try again.",
  not_allowed: "You don't have permission to do that.",
  not_signed_in: "Sign in first.",
  not_found: "That couldn't be found.",
  rate_limited: "You're doing that too often. Please wait a while and try again.",
  group_limit: "You can own at most 3 groups.",
  event_full: "This event is full.",
  event_started: "RSVPs close when the event starts.",
  event_cancelled: "This event has been cancelled.",
  invalid_timezone: "That time zone isn't recognized.",
  terms_required: "You need to confirm you're 18 or older and accept the terms.",
  cannot_join: "You can't join this group.",
  already_member: "You're already in this group.",
  manager_limit: "A group can have at most two page managers, counting open manager invites.",
  invite_invalid: "That invite link isn't working. It may have been turned off or expired; ask the group for a new one.",
  invite_wrong_account: "This invite was sent to a different email address. Sign in with that address to accept it.",
  too_many_invites: "At most 25 addresses per send.",
  email_off: "Email invites start once the board's email is set up. Use the invite link meanwhile.",
  link_failed: "That link didn't work. It may have expired or been used already; ask for a new one.",
  email_failed: "We couldn't send the email. Please try again shortly.",
  wrong_password: "That email and password don't match.",
  email_unconfirmed: "Check your email to confirm your address first. If the link has expired, create the account again to get a new one.",
  signin_paused: "Too many wrong passwords for that address. Sign-in for it is paused for 15 minutes. You can reset your password instead.",
  password_length: "Passwords need at least 10 characters (and at most 72).",
  password_common: "That password is one of the most commonly used. Choose another.",
  password_mismatch: "The two passwords don't match.",
  password_same: "That is already your password. Choose a new one.",
  password_not_changed: "Your password wasn't changed. Check your current password and try again.",
  reset_link_needed: "Open the link in your password reset email first. If it has expired, ask for a new one.",
  suspended: "Your account is suspended. You can read but not post.",
  claim_exists: "You've already asked to claim this group.",
} as const;

export type NoticeCode = keyof typeof notices;
export type ErrorCode = keyof typeof errors;

export function noticeText(code: string | undefined): string | null {
  return code && Object.hasOwn(notices, code) ? notices[code as NoticeCode] : null;
}

export function errorText(code: string | undefined): string | null {
  return code && Object.hasOwn(errors, code) ? errors[code as ErrorCode] : null;
}
