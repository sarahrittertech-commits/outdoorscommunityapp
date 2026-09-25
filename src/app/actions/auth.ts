"use server";

import { redirect } from "next/navigation";

import { site } from "@/config/site";
import { actingUser, fail, failOnError, succeed } from "@/lib/actions";
import { getViewer, safeNext } from "@/lib/auth";
import { withMessage } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { formFields, onboardingSchema, profileSchema, signInSchema } from "@/lib/validation";

/** FR-AC-1: email a one-time sign-in link. No passwords. */
export async function sendSignInLink(formData: FormData) {
  const parsed = signInSchema.safeParse(formFields(formData));
  const next = safeNext(formData.get("next"));
  const back = `/signin?next=${encodeURIComponent(next)}`;
  if (!parsed.success) fail(back, "invalid");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${site.url}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) fail(back, error.status === 429 ? "rate_limited" : "email_failed");
  succeed(back, "link_sent");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  succeed("/", "signed_out");
}

/** FR-AC-2 and FR-AC-3: display name, 18+ and terms, in one step. */
export async function completeOnboarding(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const back = `/welcome?next=${encodeURIComponent(next)}`;

  const viewer = await getViewer();
  if (!viewer) redirect(`/signin?next=${encodeURIComponent(next)}`);

  const parsed = onboardingSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    const termsIssue = parsed.error.issues.some((i) => i.path[0] === "confirmAdult" || i.path[0] === "acceptTerms");
    fail(back, termsIssue ? "terms_required" : "invalid");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_display_name: parsed.data.displayName,
    p_bio: parsed.data.bio ?? undefined,
    p_area: parsed.data.area ?? undefined,
    p_confirm_adult: parsed.data.confirmAdult,
    p_accept_terms: parsed.data.acceptTerms,
  });
  failOnError(back, error);
  succeed(next, "welcome");
}

export async function saveProfile(formData: FormData) {
  const back = "/me/profile";
  const { viewer, supabase } = await actingUser(back);
  const parsed = profileSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(back, "invalid");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName, bio: parsed.data.bio, area: parsed.data.area })
    .eq("id", viewer.id);
  failOnError(back, error);
  succeed(back, "profile_saved");
}

/** FR-AC-6. The auth user itself is removed by a server-side job within 24 hours. */
export async function deleteAccount(formData: FormData) {
  const back = "/me/profile";
  if (formData.get("confirm") !== "DELETE") fail(back, "invalid");

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  failOnError(back, error);
  await supabase.auth.signOut();
  redirect(withMessage("/", { m: "account_deleted" }));
}
