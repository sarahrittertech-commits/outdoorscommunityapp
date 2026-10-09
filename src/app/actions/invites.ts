"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { site } from "@/config/site";
import { actingUser, checkArgs, fail, failOnError, succeed } from "@/lib/actions";
import { errorCode } from "@/lib/db-errors";
import { errorText } from "@/lib/messages";
import {
  formFields,
  idSchema,
  inviteEmailsSchema,
  inviteTokenSchema,
  linkExpirySchema,
  managerInviteSchema,
  MAX_INVITES_PER_SEND,
  parseInviteEmails,
  slugSchema,
} from "@/lib/validation";

// UC-31: invite link (FR-MB-15), email invites (FR-MB-12, FR-MB-13) and
// joining by invite (FR-MB-14). The database decides who may do each.

/** FR-MB-15. Replaces any earlier link. */
export async function createInviteLink(groupId: string, slug: string, formData: FormData) {
  const back = `/g/${slug}/members`;
  const { supabase } = await actingUser(back);
  checkArgs(back, z.tuple([idSchema, slugSchema]), [groupId, slug]);
  const parsed = linkExpirySchema.safeParse(formFields(formData));
  if (!parsed.success) fail(back, "invalid");
  const { error } = await supabase.rpc("create_invite_link", { p_group_id: groupId, p_valid_days: parsed.data });
  failOnError(back, error);
  succeed(`${back}#invite-link`, "invite_link_created");
}

export async function turnOffInviteLink(groupId: string, slug: string) {
  const back = `/g/${slug}/members`;
  const { supabase } = await actingUser(back);
  checkArgs(back, z.tuple([idSchema, slugSchema]), [groupId, slug]);
  const { error } = await supabase.rpc("turn_off_invite_link", { p_group_id: groupId });
  failOnError(back, error);
  succeed(`${back}#invite-link`, "invite_link_off");
}

export type InviteFormState = { error: string | null; invalid: string[]; sent: number | null };

/**
 * FR-MB-13. Works without JavaScript through useActionState. Invalid
 * addresses are listed back in the form, never put in a URL. While email
 * isn't set up, nothing is stored.
 */
export async function inviteMembers(
  groupId: string,
  slug: string,
  _previous: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const back = `/g/${slug}/members`;
  const { supabase } = await actingUser(back);
  checkArgs(back, z.tuple([idSchema, slugSchema]), [groupId, slug]);
  const fields = inviteEmailsSchema.safeParse(formFields(formData));
  if (!fields.success) return { error: errorText("invalid"), invalid: [], sent: null };

  const { valid, invalid } = parseInviteEmails(fields.data.emails);
  if (invalid.length) return { error: "These aren't email addresses:", invalid, sent: null };
  if (!valid.length) return { error: "Add at least one email address.", invalid: [], sent: null };
  if (valid.length > MAX_INVITES_PER_SEND) return { error: errorText("too_many_invites"), invalid: [], sent: null };
  if (!site.emailEnabled) return { error: errorText("email_off"), invalid: [], sent: null };

  // TODO(email): once site.emailEnabled is on, a scheduled Edge Function
  // sends one plain email per new invite (Resend, ADR-0004); see the runbook.
  const { data, error } = await supabase.rpc("invite_members", { p_group_id: groupId, p_emails: valid });
  if (error) return { error: errorText(errorCode(error)), invalid: [], sent: null };
  return { error: null, invalid: [], sent: data };
}

/** FR-MB-12. Page admin only (the database checks). */
export async function inviteManager(groupId: string, slug: string, formData: FormData) {
  const back = `/g/${slug}/members`;
  const { supabase } = await actingUser(back);
  checkArgs(back, z.tuple([idSchema, slugSchema]), [groupId, slug]);
  if (!site.emailEnabled) fail(back, "email_off");
  const parsed = managerInviteSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(back, "invalid");
  const { error } = await supabase.rpc("invite_manager", { p_group_id: groupId, p_email: parsed.data.email });
  failOnError(back, error);
  succeed(back, "manager_invited");
}

export async function cancelManagerInvite(inviteId: string, slug: string) {
  const back = `/g/${slug}/members`;
  const { supabase } = await actingUser(back);
  checkArgs(back, z.tuple([idSchema, slugSchema]), [inviteId, slug]);
  const { error } = await supabase.rpc("cancel_manager_invite", { p_invite_id: inviteId });
  failOnError(back, error);
  succeed(back, "manager_invite_cancelled");
}

/** FR-MB-14. The confirm button on /join/<token>. */
export async function joinByInvite(token: string) {
  const back = `/join/${encodeURIComponent(token)}`;
  checkArgs("/", z.tuple([inviteTokenSchema]), [token]);
  const { supabase } = await actingUser(back);
  const { data, error } = await supabase.rpc("join_by_invite", { p_token: token });
  failOnError(back, error);
  const row = data?.[0];
  if (!row) fail(back, "invite_invalid");
  const group = `/g/${row.slug}`;
  if (row.result === "already_member") redirect(group);
  succeed(group, row.result === "manager" ? "manager_joined" : "joined_by_invite");
}
