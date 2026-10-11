import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/supabase/database.types";
import { site } from "@/config/site";
import { REGION_PARAM_HEADER, REQUEST_PATH_HEADER } from "@/lib/regions";
import { sessionCookieOptions, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Runs before every page:
 *
 * 1. Sets a Content Security Policy that only allows the site's own scripts,
 *    using a fresh nonce per request (TR-SEC-7).
 * 2. Keeps the Supabase session fresh.
 * 3. Copies `?region=` into a request header for the layout.
 *
 * It does not decide who may see what: row-level security does that.
 */
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);

  // The layout gets no search params, so the region in the address (if
  // any) is passed on as a header for the header's region name. Only a
  // slug-shaped value; anything a client sent under that name is dropped.
  const regionParam = request.nextUrl.searchParams.get("region");

  const next = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.delete(REGION_PARAM_HEADER);
    if (regionParam && /^[a-z0-9-]{1,40}$/.test(regionParam)) headers.set(REGION_PARAM_HEADER, regionParam);
    // The page's own path, so the header's region link can come back to it.
    headers.set(REQUEST_PATH_HEADER, (request.nextUrl.pathname + request.nextUrl.search).slice(0, 500));
    headers.set("Content-Security-Policy", csp);
    const response = NextResponse.next({ request: { headers } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  let response = next();

  const supabase = createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = next();
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Refreshes the session if it has expired. Must run before the response.
  await supabase.auth.getClaims();

  return response;
}

function contentSecurityPolicy(nonce: string): string {
  const dev = process.env.NODE_ENV === "development";
  const storage = new URL(supabaseUrl()).origin;
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self'${dev ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`}`,
    `img-src 'self' data: ${storage} ${site.mapTiles.host}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    dev ? "" : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
