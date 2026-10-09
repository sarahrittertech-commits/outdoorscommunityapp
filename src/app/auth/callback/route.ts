import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { site } from "@/config/site";
import { safeNext } from "@/lib/navigation";
import { RESET_COOKIE, RESET_COOKIE_MAX_AGE, RESET_PATH } from "@/lib/password-reset";
import { sessionCookieOptions } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Where emailed links land (UC-29): *Confirm my email* after signing up
 * (FR-AC-18) and the password reset link (FR-AC-20). Handles both link
 * styles Supabase can send: a PKCE `code` (the default, which only works in
 * the browser that asked) or a `token_hash` (custom email template, works in
 * any browser), with type `signup`, `email` or `recovery`.
 *
 * Redirects are built on the public site URL, not the request's origin:
 * behind Railway's proxy the server sees itself as 0.0.0.0:8080.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const isReset = type === "recovery" || new URL(next, site.url).pathname === RESET_PATH;

  const supabase = await createClient();
  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { data: { user: null }, error: new Error("missing code") };

  if (error || !data.user) {
    const back = isReset ? "/forgot-password?e=link_failed" : `/signin?e=link_failed&next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(new URL(back, site.url));
  }

  if (isReset) {
    const response = NextResponse.redirect(new URL(RESET_PATH, site.url));
    response.cookies.set(RESET_COOKIE, data.user.id, { ...sessionCookieOptions, maxAge: RESET_COOKIE_MAX_AGE });
    return response;
  }
  // New users finish onboarding first; /welcome sends everyone else on.
  return NextResponse.redirect(new URL(`/welcome?next=${encodeURIComponent(next)}`, site.url));
}
