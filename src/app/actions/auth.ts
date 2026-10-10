"use server";

import { randomBytes } from "node:crypto";

import type { AuthError } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { site } from "@/config/site";
import { actingUser, fail, failOnError, succeed } from "@/lib/actions";
import { getViewer } from "@/lib/auth";
import { safeNext, withMessage } from "@/lib/navigation";
import { afterEmailLink } from "@/lib/email-links";
import { SET_PASSWORD_PATH, RESET_COOKIE, RESET_COOKIE_MAX_AGE, RESET_PATH } from "@/lib/password-reset";
import { sessionCookieOptions } from "@/lib/supabase/env";
import { signInLimiter } from "@/lib/sign-in-limiter";
import { createClient, createDetachedClient } from "@/lib/supabase/server";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  formFields,
  newPasswordSchema,
  onboardingSchema,
  passwordErrorCode,
  profileSchema,
  signInSchema,
  emailLinkSchema,
  signUpSchema,
} from "@/lib/validation";

// UC-29: email and password, email confirmed first (ADR-0009). None of these
// pages ever says whether an address has an account.

const callbackUrl = (next: string) => `${site.url}/auth/callback?next=${encodeURIComponent(next)}`;

/** /join/<invite code> (UC-31), the only sign-up form outside /signup. */
const JOIN_PATH = /^\/join\/[a-f0-9]{64}$/;

const isRateLimited = (error: AuthError) =>
  error.status === 429 || error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit";

/** FR-AC-17: create an account. Always answers *Check your email*. */
export async function signUp(formData: FormData) {
  const next = safeNext(formData.get("next"));
  // UC-31: the invite page has its own sign-up form and shows the answer itself.
  const back = JOIN_PATH.test(next) ? next : `/signup?next=${encodeURIComponent(next)}`;
  const parsed = signUpSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(back, "invalid");

  const supabase = await createClient();
  // UC-29 (Sarah, 9 October): sign-up asks only for the email. The account is
  // created with a long random password nobody ever sees, and the
  // confirmation link opens *Create your password* (FR-AC-18). With *Confirm
  // email* on, Supabase answers the same way for a new address and an
  // existing one (FR-AC-17): it resends to an unconfirmed address and sends
  // nothing to a confirmed one, so the page never reveals who has an account.
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: randomBytes(32).toString("base64url"),
    options: { emailRedirectTo: callbackUrl(`${SET_PASSWORD_PATH}?next=${encodeURIComponent(next)}`) },
  });
  if (error) {
    if (isRateLimited(error)) fail(back, "rate_limited");
    fail(back, "email_failed");
  }
  succeed(back, "signup_sent");
}

/** FR-AC-19: sign in. One message for a wrong address or a wrong password. */
export async function signIn(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const back = `/signin?next=${encodeURIComponent(next)}`;
  const parsed = signInSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(back, "wrong_password");

  const { email, password } = parsed.data;
  if (signInLimiter.isPaused(email)) fail(back, "signin_paused");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") fail(back, "email_unconfirmed");
    if (isRateLimited(error)) fail(back, "rate_limited");
    if (error.code === "invalid_credentials" || error.status === 400) {
      signInLimiter.recordFailure(email);
      fail(back, signInLimiter.isPaused(email) ? "signin_paused" : "wrong_password");
    }
    fail(back, "generic");
  }
  signInLimiter.recordSuccess(email);
  // New users finish onboarding first; /welcome sends everyone else on.
  redirect(`/welcome?next=${encodeURIComponent(next)}`);
}

/** FR-AC-20: always the same answer, whether or not the address has an account. */
export async function sendPasswordReset(formData: FormData) {
  const back = "/forgot-password";
  const parsed = forgotPasswordSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(back, "invalid");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl(RESET_PATH),
  });
  if (error && isRateLimited(error)) fail(back, "rate_limited");
  succeed(back, "reset_sent");
}

/**
 * FR-AC-20: set a new password after following the reset link, then sign
 * out every other session.
 */
export async function setNewPassword(formData: FormData) {
  // UC-29: the same action sets a first password after sign-up (mode=create)
  // and a new one after a reset link; both need the link's cookie.
  const creating = formData.get("mode") === "create";
  const next = safeNext(formData.get("next"));
  const back = creating ? `${SET_PASSWORD_PATH}?next=${encodeURIComponent(next)}` : RESET_PATH;
  const viewer = await getViewer();
  const cookieStore = await cookies();
  if (!viewer || cookieStore.get(RESET_COOKIE)?.value !== viewer.id) {
    redirect(withMessage("/forgot-password", { e: "reset_link_needed" }));
  }

  const parsed = newPasswordSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(back, passwordErrorCode(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "weak_password") fail(back, "password_common");
    if (error.code === "same_password") fail(back, "password_same");
    fail(back, "generic");
  }
  await supabase.auth.signOut({ scope: "others" });
  cookieStore.delete(RESET_COOKIE);
  // A new account goes on to the welcome step (FR-AC-2), then where it was headed.
  if (creating) redirect(withMessage(`/welcome?next=${encodeURIComponent(next)}`, { m: "password_created" }));
  redirect(withMessage("/me/profile", { m: "password_reset" }));
}

/**
 * FR-AC-21: change password on the profile page. The current password is
 * checked on a detached client so the visitor's own session is untouched;
 * a wrong one changes nothing and says nothing more than that.
 */
export async function changePassword(formData: FormData) {
  const back = "/me/profile";
  const viewer = await getViewer();
  if (!viewer) redirect(`/signin?next=${encodeURIComponent(back)}`);

  const parsed = changePasswordSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(back, passwordErrorCode(parsed.error));

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email;
  if (!email || userData.user?.id !== viewer.id) fail(back, "password_not_changed");
  if (signInLimiter.isPaused(email)) fail(back, "signin_paused");

  const { error: checkError } = await createDetachedClient().auth.signInWithPassword({
    email,
    password: parsed.data.currentPassword,
  });
  if (checkError) {
    if (checkError.code === "invalid_credentials") signInLimiter.recordFailure(email);
    fail(back, "password_not_changed");
  }
  signInLimiter.recordSuccess(email);

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) fail(back, error.code === "weak_password" ? "password_common" : "password_not_changed");
  await supabase.auth.signOut({ scope: "others" });
  succeed(back, "password_changed");
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

/**
 * UC-29: use an emailed token_hash link, only when the person presses
 * Continue on /auth/confirm. Works in any browser; a scanner opening the
 * link can't use it up.
 */
export async function confirmEmailLink(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const parsed = emailLinkSchema.safeParse(formFields(formData));
  const failed = (type?: string): never =>
    redirect(type === "recovery" ? "/forgot-password?e=link_failed" : `/signin?e=link_failed&next=${encodeURIComponent(next)}`);
  if (!parsed.success) return failed();
  const link = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: link.token_hash, type: link.type });
  if (error || !data.user) return failed(link.type);

  const after = afterEmailLink(link.type, next);
  if (after.passwordCookie) {
    (await cookies()).set(RESET_COOKIE, data.user.id, { ...sessionCookieOptions, maxAge: RESET_COOKIE_MAX_AGE });
  }
  redirect(after.path);
}
