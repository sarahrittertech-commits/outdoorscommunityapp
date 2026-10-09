// Every form is validated here, on the server, before anything reaches the
// database (TR-SEC-5). Limits match the CHECK constraints in the migrations.

import { z } from "zod";

import { AFFINITY_TAGS } from "./affinity";
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

export const signInSchema = z.object({
  email: z.email().max(254),
  next: z.string().optional(),
});

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
