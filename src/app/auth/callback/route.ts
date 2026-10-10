import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { site } from "@/config/site";
import { safeNext } from "@/lib/navigation";
import { afterEmailLink } from "@/lib/email-links";
import { RESET_COOKIE, RESET_COOKIE_MAX_AGE, RESET_PATH } from "@/lib/password-reset";
import { sessionCookieOptions } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Where emailed links land (UC-29): *Confirm my email* after signing up
 * (FR-AC-18), which goes on to *Create your password*, and the password
 * reset link (FR-AC-20). Handles both link styles Supabase can send: a
 * PKCE `code` (the default, which only works in the browser that asked) is
 * used here; a `token_hash` (our email templates, works in any browser) is
 * handed to /auth/confirm, which uses it only when Continue is pressed.
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

  // A token_hash link is used only when the person presses Continue on
  // /auth/confirm (a POST). Opening it here does nothing, so email scanners
  // and link previews (Outlook Safe Links, chat apps) can't use it up, and it
  // works in any browser, not only the one that asked for it.
  if (tokenHash && type) {
    const confirm = new URL("/auth/confirm", site.url);
    confirm.searchParams.set("token_hash", tokenHash);
    confirm.searchParams.set("type", type);
    confirm.searchParams.set("next", next);
    return NextResponse.redirect(confirm);
  }

  const isReset = type === "recovery" || new URL(next, site.url).pathname === RESET_PATH;
  const supabase = await createClient();
  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : { data: { user: null }, error: new Error("missing code") };

  if (error || !data.user) {
    const back = isReset ? "/forgot-password?e=link_failed" : `/signin?e=link_failed&next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(new URL(back, site.url));
  }

  const after = afterEmailLink(type, next);
  const response = NextResponse.redirect(new URL(after.path, site.url));
  if (after.passwordCookie) {
    response.cookies.set(RESET_COOKIE, data.user.id, { ...sessionCookieOptions, maxAge: RESET_COOKIE_MAX_AGE });
  }
  return response;
}
