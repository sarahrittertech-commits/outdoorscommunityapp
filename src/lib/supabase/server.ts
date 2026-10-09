import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "./database.types";
import { sessionCookieOptions, supabaseAnonKey, supabaseUrl } from "./env";

/**
 * A Supabase client that acts as the person making the request.
 *
 * It uses the public (anon) key plus the visitor's session cookie, so every
 * query runs under row-level security as that user (TR-SEC-3). There is
 * deliberately no helper for the service-role key in the web app.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes the session before the page renders, so this is
          // safe to ignore.
        }
      },
    },
  });
}

export type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * A throwaway anon client with no cookies, for checking a password without
 * touching the visitor's own session (FR-AC-21). Whatever session it gets
 * lives only in memory for this request; the caller then signs out every
 * other session, which ends it on Supabase's side too.
 */
export function createDetachedClient() {
  return createSupabaseClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
