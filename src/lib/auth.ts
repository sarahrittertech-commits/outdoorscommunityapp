import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  id: string;
  displayName: string | null;
  /** Finished first sign-in: display name, 18+ and terms (FR-AC-2). */
  onboarded: boolean;
  /** Onboarded, not suspended, not deleted. Mirrors can_write() in the database. */
  canWrite: boolean;
  suspended: boolean;
  isSiteAdmin: boolean;
};

/**
 * The signed-in person, or null. Cached for the length of one request.
 *
 * This is for deciding what to *show*. Whether an action is *allowed* is
 * always decided again by the database (row-level security).
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const [{ data: account }, { data: profile }] = await Promise.all([
    supabase.from("accounts").select("accepted_terms_at, suspended_at, deleted_at, is_site_admin").eq("id", userId).maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
  ]);

  if (!account || account.deleted_at) return null;

  const onboarded = Boolean(account.accepted_terms_at && profile?.display_name);
  const suspended = Boolean(account.suspended_at);

  return {
    id: userId,
    displayName: profile?.display_name ?? null,
    onboarded,
    canWrite: onboarded && !suspended,
    suspended,
    isSiteAdmin: account.is_site_admin,
  };
});

/** Send signed-out visitors to sign in, and new users to finish onboarding. */
export async function requireViewer(returnTo: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/signin?next=${encodeURIComponent(returnTo)}`);
  if (!viewer.onboarded) redirect(`/welcome?next=${encodeURIComponent(returnTo)}`);
  return viewer;
}

export async function requireSiteAdmin(): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (!viewer.isSiteAdmin) redirect("/?e=not_allowed");
  return viewer;
}

/** Only allow redirects back into this site. */
export function safeNext(value: FormDataEntryValue | string | null | undefined, fallback = "/"): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
