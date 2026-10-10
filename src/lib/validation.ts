// Every form is validated here, on the server, before anything reaches the
// database (TR-SEC-5). Limits match the CHECK constraints in the migrations.

import { z } from "zod";

import { AFFINITY_TAGS } from "./affinity";
import { isCommonPassword } from "./common-passwords";
import { GROUP_TYPES } from "./groupTypes";
import { safeNext } from "./navigation";
import { isValidTimeZone, zonedLocalToUtc } from "./time";

const requiredText = (min: number, max: number) => z.string().trim().min(min).max(max);

/** Empty input becomes null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

/** An HTML checkbox sends "on" when ticked and nothing when not. */
const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

const id = z.guid();

/** FormData to a plain object of its string fields. */
export function formFields(formData: FormData): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) fields[key] = value;
  }
  return fields;
}

// UC-29 (FR-AC-17 to FR-AC-21). Passwords are never trimmed: a space is a
// character like any other. The issue messages are error codes from
// messages.ts, so the action can say exactly which rule was missed.

const email = z.string().trim().pipe(z.email().max(254));

/** bcrypt, which Supabase uses, reads only the first 72 bytes. */
const MAX_PASSWORD_BYTES = 72;

export const passwordSchema = z
  .string()
  .min(10, "password_length")
  .refine((v) => new TextEncoder().encode(v).length <= MAX_PASSWORD_BYTES, "password_length")
  .refine((v) => !isCommonPassword(v), "password_common");

/** Sign-in checks only the password's size: the rules may have changed since it was set. */
export const signInSchema = z.object({
  email,
  password: z.string().min(1).max(200),
  next: z.string().optional(),
});

const matching = { message: "password_mismatch", path: ["passwordAgain"] };

/** UC-29: sign-up asks only for the email; the password is chosen after the confirmation link. */
export const signUpSchema = z.object({ email, next: z.string().optional() });

export const forgotPasswordSchema = z.object({ email });

/** UC-29: an emailed token_hash link, used from /auth/confirm. */
export const emailLinkSchema = z.object({
  token_hash: z.string().regex(/^[A-Za-z0-9_-]{8,200}$/),
  type: z.enum(["signup", "recovery", "email", "invite", "magiclink", "email_change"]),
  next: z.string().optional(),
});

export const newPasswordSchema = z
  .object({ password: passwordSchema, passwordAgain: z.string() })
  .refine((v) => v.password === v.passwordAgain, matching);

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(200), password: passwordSchema, passwordAgain: z.string() })
  .refine((v) => v.password === v.passwordAgain, matching);

const PASSWORD_CODES = ["password_length", "password_common", "password_mismatch"] as const;
type PasswordCode = (typeof PASSWORD_CODES)[number];

/** The error code for the first password rule a form missed, or "invalid". */
export function passwordErrorCode(error: z.ZodError): PasswordCode | "invalid" {
  for (const issue of error.issues) {
    const code = PASSWORD_CODES.find((c) => c === issue.message);
    if (code) return code;
  }
  return "invalid";
}

export const onboardingSchema = z.object({
  displayName: requiredText(2, 40),
  bio: optionalText(280),
  area: optionalText(80),
  confirmAdult: checkbox.refine((v) => v, "You must be 18 or older."),
  acceptTerms: checkbox.refine((v) => v, "You must accept the terms."),
});

export const profileSchema = z.object({
  displayName: requiredText(2, 40),
  bio: optionalText(280),
  area: optionalText(80),
});

export const groupSchema = z.object({
  name: requiredText(3, 80),
  description: requiredText(10, 5000),
  rules: optionalText(5000),
  subcategoryId: id,
  area: requiredText(2, 80),
  joinPolicy: z.enum(["open", "approval"]),
  joinQuestion: optionalText(280),
  discussionsEnabled: checkbox,
  /** FR-MB-10: who sees the member list and names on who's going. */
  memberListVisibility: z.enum(["organizers", "members", "signed_in"]).default("members"),
  /** FR-GR-23: optional; a missing scheme is taken as https. */
  website: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (!v ? null : /^https?:\/\//i.test(v) ? v : `https://${v}`))
    .refine((v) => v === null || /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(v), "Enter a web address like https://example.org"),
  /** FR-GR-16: one of the five types, or none yet. */
  groupType: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.enum(GROUP_TYPES.map((t) => t.value) as [string, ...string[]]).nullable())
    .transform((v) => v as (typeof GROUP_TYPES)[number]["value"] | null),
  /** FR-GR-14: the cover photo's alt text (edit form only), and Remove. */
  coverAlt: optionalText(200),
  removeCover: checkbox,
});

/** An http(s) link, or null when empty (FR-EV-27). */
const optionalHttpUrl = (max: number) =>
  optionalText(max).refine((value) => value === null || /^https?:\/\/\S+$/i.test(value), "Use an http or https link.");

/** FR-EV-1 and FR-EV-23 to FR-EV-28. The photo file is checked by eventPhotoSchema. */
export const eventSchema = z
  .object({
    title: requiredText(3, 120),
    description: requiredText(10, 2000),
    details: optionalText(10000),
    startsLocal: localDateTime,
    endsLocal: localDateTime,
    timezone: z.string().refine(isValidTimeZone),
    locationName: requiredText(2, 200),
    address: optionalText(300),
    addressVisibility: z.enum(["public", "members"]),
    price: z.enum(["free", "paid"]),
    registrationFee: optionalText(80),
    totalCost: optionalText(80),
    takesRsvps: checkbox,
    capacity: z.preprocess(
      (value) => (value === "" || value === undefined || value === null ? null : Number(value)),
      z.number().int().positive().max(10000).nullable(),
    ),
    waitlistEnabled: checkbox,
    signupUrl: optionalHttpUrl(500),
    photoAlt: optionalText(200),
    removePhoto: checkbox,
  })
  .transform((event, ctx) => {
    const startsAt = zonedLocalToUtc(event.startsLocal, event.timezone);
    const endsAt = zonedLocalToUtc(event.endsLocal, event.timezone);
    if (endsAt <= startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsLocal"], message: "The event must end after it starts." });
      return z.NEVER;
    }
    const isPaid = event.price === "paid";
    if (isPaid && !event.registrationFee) {
      ctx.addIssue({ code: "custom", path: ["registrationFee"], message: "A paid event needs a registration fee." });
      return z.NEVER;
    }
    return {
      ...event,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      isPaid,
      // A free event has no fee; fields for the other choice are dropped.
      registrationFee: isPaid ? event.registrationFee : null,
      totalCost: isPaid ? event.totalCost : null,
      // A waitlist needs places; a sign-up link is for events without RSVPs.
      waitlistEnabled: event.takesRsvps && event.capacity !== null && event.waitlistEnabled,
      signupUrl: event.takesRsvps ? null : event.signupUrl,
    };
  });

export const EVENT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const EVENT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * FR-EV-24: the uploaded photo, or null when none was chosen. The type is
 * checked again from the file's contents when it is re-encoded.
 */
export const eventPhotoSchema = z
  .union([z.instanceof(File), z.null(), z.undefined(), z.string()])
  .transform((value) => (value instanceof File && value.size > 0 ? value : null))
  .refine((file) => file === null || file.size <= EVENT_PHOTO_MAX_BYTES, "At most 5 MB.")
  .refine(
    (file) => file === null || (EVENT_PHOTO_TYPES as readonly string[]).includes(file.type),
    "Use a JPEG, PNG or WebP image.",
  );

export const threadSchema = z.object({
  title: requiredText(1, 150),
  body: requiredText(1, 10000),
});

export const replySchema = z.object({
  body: requiredText(1, 10000),
});

/** FR-DS-9: a new reply may answer another reply in the same thread. */
export const newReplySchema = replySchema.extend({
  parent_id: id.optional(),
});

export const reportSchema = z.object({
  targetType: z.enum(["group", "event", "thread", "reply", "profile"]),
  targetId: id,
  reason: z.enum(["spam", "harassment", "unsafe", "off_topic", "other"]),
  note: optionalText(1000),
  next: z.string().optional(),
});

/** FR-AD-4: a suggestion to the site admin (UC-32). */
export const SUGGESTION_KINDS = ["region", "feature", "group", "event", "other"] as const;
export const suggestionSchema = z.object({
  kind: z.enum(SUGGESTION_KINDS),
  title: requiredText(3, 120),
  details: optionalText(2000),
  link: optionalHttpUrl(500),
});

/** FR-AD-6: the site admin's decision and optional note. */
export const suggestionStatusSchema = z.object({
  status: z.enum(["planned", "done", "declined"]),
  note: optionalText(500),
});

/** FR-GR-10: how the claimant is connected to an unclaimed listing. */
export const claimSchema = z.object({
  note: requiredText(10, 1000),
});

/** FR-GR-11: the ticked affinity tag checkboxes (formData.getAll), deduplicated. */
export const affinityTagsSchema = z
  .array(z.enum(AFFINITY_TAGS.map((t) => t.value) as [string, ...string[]]))
  .max(AFFINITY_TAGS.length)
  .transform((tags) => [...new Set(tags)]);

export const idSchema = id;

// Arguments bound into server actions (`action.bind(null, ...)`) come back
// from the browser like any form field, so they are checked too.

/** A group slug as slugify() makes it, or a suffixed variant. */
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);

/** A path on this site to return to after the action. */
export const localPathSchema = z.string().max(2000).refine((value) => safeNext(value, "") === value);

export const postTypeSchema = z.enum(["thread", "reply"]);

// UC-31: invites -------------------------------------------------------------

/** An invite code: 64 hex characters, made by the database. */
export const inviteTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);

/** How long a new invite link lasts (FR-MB-15): days, or null for until turned off. */
export const linkExpirySchema = z
  .object({ valid: z.enum(["7", "30", "never"]) })
  .transform(({ valid }) => (valid === "never" ? null : Number(valid)));

/** FR-MB-13: at most this many addresses per send (the database checks too). */
export const MAX_INVITES_PER_SEND = 25;

const oneEmail = z.email().max(254);

/**
 * Pasted addresses, separated by commas, semicolons, spaces or new lines.
 * Lowercased and deduplicated; anything that isn't an email address is
 * returned separately so the form can list it back.
 */
export function parseInviteEmails(text: string): { valid: string[]; invalid: string[] } {
  const valid = new Set<string>();
  const invalid = new Set<string>();
  for (const part of text.split(/[\s,;]+/)) {
    const value = part.trim().toLowerCase();
    if (!value) continue;
    if (oneEmail.safeParse(value).success) valid.add(value);
    else invalid.add(part.trim().slice(0, 100));
  }
  return { valid: [...valid], invalid: [...invalid] };
}

export const inviteEmailsSchema = z.object({ emails: z.string().max(10_000) });

export const managerInviteSchema = z.object({ email: oneEmail });
