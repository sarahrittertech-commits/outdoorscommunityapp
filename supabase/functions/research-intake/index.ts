// Supabase Edge Function: POST /functions/v1/research-intake
// See handler.ts for what it does and why. Deployed with JWT checking off,
// because it checks its own token (RESEARCH_AGENT_TOKEN).

import postgres from "npm:postgres@3.4.7";

import { handle, type Database } from "./handler.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response>): void;
};

// SUPABASE_DB_URL is provided to every Edge Function by Supabase. Only the
// two fixed, parameterized queries below ever run on this connection.
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });

const db: Database = {
  async known() {
    const subcategories = await sql<{ category: string; subcategory: string; name: string }[]>`
      select c.slug as category, s.slug as subcategory, s.name
      from public.subcategories s join public.categories c on c.id = s.category_id
      order by c.sort_order, s.sort_order`;
    const names = await sql<{ name: string }[]>`
      select lower(name) as name from research.candidates
      union select lower(name) from research.organizations
      union select lower(name) from public.groups
      order by 1`;
    return { subcategories: [...subcategories], names: names.map((row) => row.name) };
  },
  async addCandidate(candidate) {
    const [row] = await sql<{ result: unknown }[]>`
      select research.add_candidate(${sql.json(candidate as Parameters<typeof sql.json>[0])}) as result`;
    return row.result;
  },
};

Deno.serve((req) => handle(req, Deno.env.get("RESEARCH_AGENT_TOKEN"), db));
