"use server";

import { z } from "zod";

import { actingUser, fail, failOnError, succeed } from "@/lib/actions";
import { idSchema } from "@/lib/validation";

const joinAnswer = z.string().trim().max(1000).optional();

/** FR-MB-1 and FR-MB-2: open groups join at once; approval groups get a request. */
export async function joinGroup(groupId: string, slug: string, formData: FormData) {
  const back = `/g/${slug}`;
  const { viewer, supabase } = await actingUser(back);
  if (!idSchema.safeParse(groupId).success) fail(back, "invalid");
  const answer = joinAnswer.safeParse(formData.get("answer") ?? undefined);

  const { data: group } = await supabase.from("groups").select("join_policy, status").eq("id", groupId).single();
  if (!group || group.status !== "active") fail(back, "cannot_join");

  const status = group.join_policy === "open" ? "active" : "pending";
  const { error } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: viewer.id,
    status,
    join_answer: status === "pending" && answer.success ? answer.data || null : null,
  });

  if (error?.code === "23505") {
    // Already has a row: a member, a pending request, or banned (PT-14).
    const { data: row } = await supabase
      .from("group_members")
      .select("status")
      .eq("group_id", groupId)
      .eq("user_id", viewer.id)
      .maybeSingle();
    fail(back, row?.status === "banned" ? "cannot_join" : "already_member");
  }
  failOnError(back, error);
  succeed(back, status === "active" ? "joined" : "requested");
}

/** FR-MB-3. The database refuses this for the owner. */
export async function leaveGroup(groupId: string, slug: string) {
  const back = `/g/${slug}`;
  const { viewer, supabase } = await actingUser(back);
  const { data, error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", viewer.id)
    .select("user_id");
  failOnError(back, error);
  if (!data?.length) fail(back, "not_allowed");
  succeed(back, "left");
}

export async function approveMember(groupId: string, userId: string, slug: string) {
  const back = `/g/${slug}/members`;
  const { supabase } = await actingUser(back);
  const { error } = await supabase.rpc("approve_member", { p_group_id: groupId, p_user_id: userId });
  failOnError(back, error);
  succeed(back, "member_approved");
}

export async function declineMember(groupId: string, userId: string, slug: string) {
  const back = `/g/${slug}/members`;
  const { supabase } = await actingUser(back);
  const { error } = await supabase.rpc("decline_member", { p_group_id: groupId, p_user_id: userId });
  failOnError(back, error);
  succeed(back, "member_declined");
}

/** FR-MB-7: removal is a ban. */
export async function removeMember(groupId: string, userId: string, slug: string, formData: FormData) {
  const back = `/g/${slug}/members`;
  const { supabase } = await actingUser(back);
  const reason = z.string().trim().max(500).safeParse(formData.get("reason") ?? "");
  const { error } = await supabase.rpc("remove_member", {
    p_group_id: groupId,
    p_user_id: userId,
    p_reason: reason.success ? reason.data : "",
  });
  failOnError(back, error);
  succeed(back, "member_removed");
}

/** FR-MB-5. */
export async function setMemberRole(groupId: string, userId: string, role: "admin" | "member", slug: string) {
  const back = `/g/${slug}/members`;
  const { supabase } = await actingUser(back);
  const { error } = await supabase.rpc("set_member_role", { p_group_id: groupId, p_user_id: userId, p_role: role });
  failOnError(back, error);
  succeed(back, "role_changed");
}

/** FR-MB-6. */
export async function transferOwnership(groupId: string, userId: string, slug: string) {
  const back = `/g/${slug}/members`;
  const { supabase } = await actingUser(back);
  const { error } = await supabase.rpc("transfer_ownership", { p_group_id: groupId, p_new_owner: userId });
  failOnError(back, error);
  succeed(back, "ownership_transferred");
}
