/**
 * The research agent's only way into the database (UC-9, FR-RS-9).
 *
 * The weekly agent reads untrusted web pages, so it gets no database
 * access of its own. It calls this function with a shared token, and the
 * function runs one of two fixed queries: list what the board already
 * knows, or add one candidate through research.add_candidate, which
 * validates every field. Nothing else is reachable, whatever the agent is
 * told by a page it reads.
 *
 * Kept free of Deno APIs so the unit tests run under Vitest.
 */

export type Known = { subcategories: { category: string; subcategory: string; name: string }[]; names: string[] };

export type Database = {
  known(): Promise<Known>;
  addCandidate(candidate: Record<string, unknown>): Promise<unknown>;
};

const MAX_BODY_BYTES = 64 * 1024;
const MAX_EVENTS = 50;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Compares in constant time, so the token can't be guessed a byte at a time. */
export function tokensMatch(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export async function handle(req: Request, token: string | undefined, db: Database): Promise<Response> {
  if (!token || token.length < 32) return json(500, { error: "not_configured" });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const auth = req.headers.get("authorization") ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!tokensMatch(given, token)) return json(401, { error: "unauthorized" });

  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return json(413, { error: "too_large" });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { error: "invalid_json" });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return json(400, { error: "invalid_request" });
  const { action, candidate } = body as { action?: unknown; candidate?: unknown };

  if (action === "known") return json(200, await db.known());

  if (action === "add") {
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
      return json(400, { error: "invalid_candidate" });
    }
    const events = (candidate as { events?: unknown }).events;
    if (events !== undefined && (!Array.isArray(events) || events.length > MAX_EVENTS)) {
      return json(400, { error: "invalid_events" });
    }
    try {
      return json(200, await db.addCandidate(candidate as Record<string, unknown>));
    } catch (error) {
      // add_candidate's own validation message (unknown subcategory, bad link…),
      // so the agent can report what it got wrong.
      return json(422, { error: "rejected", detail: error instanceof Error ? error.message : "rejected" });
    }
  }

  return json(400, { error: "unknown_action" });
}
