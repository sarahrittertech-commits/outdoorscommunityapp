import { describe, expect, it, vi } from "vitest";

import { handle, tokensMatch, type Database } from "./handler";

const TOKEN = "t".repeat(40);

function db(): Database {
  return {
    known: vi.fn(async () => ({ subcategories: [], names: ["pisgah area sorba"] })),
    addCandidate: vi.fn(async () => ({ result: "added" })),
  };
}

function post(body: unknown, token = TOKEN): Request {
  return new Request("http://local/research-intake", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("research intake", () => {
  it("refuses to run without a long enough token configured", async () => {
    expect((await handle(post({ action: "known" }), undefined, db())).status).toBe(500);
    expect((await handle(post({ action: "known" }, "short"), "short", db())).status).toBe(500);
  });

  it("rejects a wrong or missing token", async () => {
    const d = db();
    expect((await handle(post({ action: "known" }, "x".repeat(40)), TOKEN, d)).status).toBe(401);
    const noHeader = new Request("http://local", { method: "POST", body: "{}" });
    expect((await handle(noHeader, TOKEN, d)).status).toBe(401);
    expect(d.known).not.toHaveBeenCalled();
  });

  it("only accepts POST", async () => {
    const req = new Request("http://local", { headers: { authorization: `Bearer ${TOKEN}` } });
    expect((await handle(req, TOKEN, db())).status).toBe(405);
  });

  it("lists what the board knows", async () => {
    const res = await handle(post({ action: "known" }), TOKEN, db());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ subcategories: [], names: ["pisgah area sorba"] });
  });

  it("adds a candidate through the database function", async () => {
    const d = db();
    const candidate = { kind: "group", name: "Pisgah Area SORBA", events: [] };
    const res = await handle(post({ action: "add", candidate }), TOKEN, d);
    expect(res.status).toBe(200);
    expect(d.addCandidate).toHaveBeenCalledWith(candidate);
  });

  it("passes the database's validation message back", async () => {
    const d = db();
    d.addCandidate = vi.fn(async () => {
      throw new Error("unknown subcategory: kiting");
    });
    const res = await handle(post({ action: "add", candidate: { name: "x" } }), TOKEN, d);
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "rejected", detail: "unknown subcategory: kiting" });
  });

  it("rejects malformed requests without touching the database", async () => {
    const d = db();
    const cases: unknown[] = [
      "not json",
      [],
      { action: "drop" },
      { action: "add" },
      { action: "add", candidate: [] },
      { action: "add", candidate: { events: "soon" } },
      { action: "add", candidate: { events: Array(51).fill({}) } },
    ];
    for (const body of cases) expect((await handle(post(body), TOKEN, d)).status).toBe(400);
    expect((await handle(post("x".repeat(70_000)), TOKEN, d)).status).toBe(413);
    expect(d.addCandidate).not.toHaveBeenCalled();
  });

  it("compares tokens exactly", () => {
    expect(tokensMatch(TOKEN, TOKEN)).toBe(true);
    expect(tokensMatch(TOKEN.slice(1), TOKEN)).toBe(false);
    expect(tokensMatch(`${TOKEN}x`, TOKEN)).toBe(false);
    expect(tokensMatch("", TOKEN)).toBe(false);
  });
});
