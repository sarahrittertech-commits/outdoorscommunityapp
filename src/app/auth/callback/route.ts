import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the emailed sign-in link lands. Handles both link styles Supabase can
 * send: a PKCE `code` (the default) or a `token_hash` (custom email template).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };

  if (error) {
    return NextResponse.redirect(new URL(`/signin?e=link_failed&next=${encodeURIComponent(next)}`, origin));
  }
  // New users finish onboarding first; /welcome sends everyone else on.
  return NextResponse.redirect(new URL(`/welcome?next=${encodeURIComponent(next)}`, origin));
}
