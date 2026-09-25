import type { ErrorCode } from "./messages";
import { errors } from "./messages";

type PostgrestLikeError = { code?: string; message?: string } | null | undefined;

/**
 * Turns a database error into one of the known message codes.
 *
 * The database raises its own rule errors as "code: message" (see
 * public.raise_rule in the migrations); row-level security refusals arrive as
 * Postgres error 42501.
 */
export function errorCode(error: PostgrestLikeError, fallback: ErrorCode = "generic"): ErrorCode {
  if (!error) return fallback;

  if (error.code === "P0001" && error.message) {
    const code = error.message.split(":")[0]?.trim();
    if (code && code in errors) return code as ErrorCode;
  }
  if (error.code === "42501") return "not_allowed";
  if (error.code === "23514" || error.code === "22P02" || error.code === "22007") return "invalid";

  return fallback;
}
