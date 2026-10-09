// Every form is validated here, on the server, before anything reaches the
// database (TR-SEC-5). Limits match the CHECK constraints in the migrations.

import { z } from "zod";

import { AFFINITY_TAGS } from "./affinity";
import { isCommonPassword } from "./common-passwords";
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

export const signUpSchema = z
  .object({ email, password: passwordSchema, passwordAgain: z.string(), next: z.string().optional() })
  .refine((v) => v.password === v.passwordAgain, matching);

export const forgotPasswordSchema = z.object({ email });

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
  /** FR-GR-23: optional; a missing scheme is taken as https. */
  website: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (!v ? null : /^https?:\/\//i.test(v) ? v : `https://${v}`))
    .refine((v) => v === null || /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(v), "Enter a web address like https://example.org"),
});

export const eventSchema = z
  .object({
    title: requiredText(3, 120),
    description: optionalText(10000).transform((v) => v ?? ""),
    startsLocal: localDateTime,
    endsLocal: localDateTime,
    timezone: z.string().refine(isValidTimeZone),
    locationName: requiredText(2, 200),
    address: optionalText(300),
    addressVisibility: z.enum(["public", "members"]),
    capacity: z.preprocess(
      (value) => (value === "" || value === undefined || value === null ? null : Number(value)),
      z.number().int().positive().max(10000).nullable(),
    ),
  })
  .transform((event, ctx) => {
    const startsAt = zonedLocalToUtc(event.startsLocal, event.timezone);
    const endsAt = zonedLocalToUtc(event.endsLocal, event.timezone);
    if (endsAt <= startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsLocal"], message: "The event must end after it starts." });
      return z.NEVER;
    }
    return { ...event, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
  });

export const threadSchema = z.object({
  title: requiredText(1, 150),
  body: requiredText(1, 10000),
});

export const replySchema = z.object({
  body: requiredText(1, 10000),
});

export const reportSchema = z.object({
  targetType: z.enum(["group", "event", "thread", "reply", "profile"]),
  targetId: id,
  reason: z.enum(["spam", "harassment", "unsafe", "off_topic", "other"]),
  note: optionalText(1000),
  next: z.string().optional(),
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
