"use server";

import { z } from "zod";

import { actingUser, fail, failOnError, succeed } from "@/lib/actions";
import { safeNext } from "@/lib/auth";
import { formFields, reportSchema } from "@/lib/validation";

/** FR-MD-1. The database routes the report to the right queue. */
export async function submitReport(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const { viewer, supabase } = await actingUser(next);
  const parsed = reportSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(next, "invalid");

  const { error } = await supabase.from("reports").insert({
    reporter_id: viewer.id,
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
    note: parsed.data.note,
  });
  failOnError(next, error);
  succeed(next, "reported");
}

export async function resolveReport(reportId: string, status: "actioned" | "dismissed", path: string) {
  const { supabase } = await actingUser(path);
  const { error } = await supabase.rpc("resolve_report", { p_report_id: reportId, p_status: status });
  failOnError(path, error);
  succeed(path, "report_resolved");
}

const reasonSchema = z.string().trim().min(1).max(500);

/** FR-MD-3: site admin only; the database checks. */
export async function suspendUser(userId: string, formData: FormData) {
  const back = "/admin";
  const { supabase } = await actingUser(back);
  const reason = reasonSchema.safeParse(formData.get("reason"));
  if (!reason.success) fail(back, "invalid");
  const { error } = await supabase.rpc("suspend_user", { p_user_id: userId, p_reason: reason.data });
  failOnError(back, error);
  succeed(back, "user_suspended");
}

export async function unsuspendUser(userId: string) {
  const back = "/admin";
  const { supabase } = await actingUser(back);
  const { error } = await supabase.rpc("unsuspend_user", { p_user_id: userId });
  failOnError(back, error);
  succeed(back, "user_unsuspended");
}

export async function removeGroup(groupId: string, formData: FormData) {
  const back = "/admin";
  const { supabase } = await actingUser(back);
  const reason = reasonSchema.safeParse(formData.get("reason"));
  if (!reason.success) fail(back, "invalid");
  const { error } = await supabase.rpc("remove_group", { p_group_id: groupId, p_reason: reason.data });
  failOnError(back, error);
  succeed(back, "group_removed");
}
