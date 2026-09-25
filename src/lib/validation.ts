// Every form is validated here, on the server, before anything reaches the
// database (TR-SEC-5). Limits match the CHECK constraints in the migrations.

import { z } from "zod";

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

export const idSchema = id;
