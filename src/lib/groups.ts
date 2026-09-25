import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { getViewer } from "./auth";
import { createClient } from "./supabase/server";

/**
 * A group by its URL slug, plus what the viewer is to it. Cached per request
 * so a page and its metadata share one lookup.
 *
 * The role flags decide what to *show*. The database decides what is allowed.
 */
export const loadGroup = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: group } = await supabase.from("groups").select("*").eq("slug", slug).maybeSingle();
  if (!group) notFound();

  const viewer = await getViewer();
  const { data: membership } = viewer
    ? await supabase.from("group_members").select("role, status").eq("group_id", group.id).eq("user_id", viewer.id).maybeSingle()
    : { data: null };

  const isMember = membership?.status === "active";
  const isOwner = isMember && membership?.role === "owner";
  const isAdmin = isMember && (membership?.role === "owner" || membership?.role === "admin");
  const isActive = group.status === "active";

  return {
    supabase,
    group,
    viewer,
    membership,
    isMember,
    isAdmin,
    isOwner,
    isActive,
    /** Can manage events, members and posts in this group right now. */
    canManage: Boolean(viewer?.canWrite && isActive && (isAdmin || viewer.isSiteAdmin)),
  };
});

export type LoadedGroup = Awaited<ReturnType<typeof loadGroup>>;
