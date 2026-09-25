import "server-only";

import { redirect } from "next/navigation";

import { getViewer, type Viewer } from "./auth";
import { errorCode } from "./db-errors";
import type { ErrorCode, NoticeCode } from "./messages";
import { withMessage } from "./navigation";
import { createClient, type ServerClient } from "./supabase/server";

/**
 * Start of every form action: the signed-in person and a Supabase client
 * acting as them. Signed-out, not-onboarded and suspended people are sent
 * back with a message. The database checks again regardless.
 */
export async function actingUser(returnTo: string): Promise<{ viewer: Viewer; supabase: ServerClient }> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/signin?next=${encodeURIComponent(returnTo)}`);
  if (!viewer.onboarded) redirect(`/welcome?next=${encodeURIComponent(returnTo)}`);
  if (!viewer.canWrite) redirect(withMessage(returnTo, { e: "suspended" }));
  return { viewer, supabase: await createClient() };
}

export function fail(returnTo: string, code: ErrorCode): never {
  redirect(withMessage(returnTo, { e: code }));
}

export function succeed(returnTo: string, code: NoticeCode): never {
  redirect(withMessage(returnTo, { m: code }));
}

/** Redirect with the right message if a database call failed. */
export function failOnError(returnTo: string, error: { code?: string; message?: string } | null): void {
  if (error) fail(returnTo, errorCode(error));
}
