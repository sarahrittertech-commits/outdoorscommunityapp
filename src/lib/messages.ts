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
  ownership_transferred: "Ownership transferred.",
  reported: "Thanks. The report has been sent to the moderators.",
  report_resolved: "Report closed.",
  profile_saved: "Profile saved.",
  welcome: "Welcome aboard.",
  link_sent: "Check your email for a sign-in link.",
  signed_out: "You are signed out.",
  account_deleted: "Your account has been deleted.",
  user_suspended: "Account suspended.",
  user_unsuspended: "Account unsuspended.",
  group_removed: "Group removed.",
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
  owns_groups: "Transfer or archive the groups you own before deleting your account.",
  cannot_join: "You can't join this group.",
  already_member: "You're already in this group.",
  link_failed: "That sign-in link didn't work. It may have expired; request a new one.",
  email_failed: "We couldn't send a sign-in email. Please try again shortly.",
  suspended: "Your account is suspended. You can read but not post.",
} as const;

export type NoticeCode = keyof typeof notices;
export type ErrorCode = keyof typeof errors;

export function noticeText(code: string | undefined): string | null {
  return code && code in notices ? notices[code as NoticeCode] : null;
}

export function errorText(code: string | undefined): string | null {
  return code && code in errors ? errors[code as ErrorCode] : null;
}
