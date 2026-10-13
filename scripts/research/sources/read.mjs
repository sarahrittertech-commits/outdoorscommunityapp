// The weekly source reader (UC-39, FR-ES-3). For every active source of a
// listed host, it reads calendar feeds first (a Meetup group's public iCal
// feed, any .ics address), then pages the way the Gemini sweep checks them:
// schema.org event data, then, on a WordPress site, The Events Calendar's
// public listing. No AI and no cost. Each read goes to the
// research intake, where research.record_source_read decides what reaches
// the board (FR-ES-4) and logs every change (FR-ES-5).
//
// A homepage with no dates is searched for links to the host's events or
// calendar pages and its Meetup group; those become sources and are read
// in the same run. Pages with dates but no structure are left for the
// weekly research agent (scripts/research/agent.md).
//
// Polite by design: one request at a time, a pause between requests,
// robots.txt respected, a named user agent, never a sign-in.
//
//   node scripts/research/sources/read.mjs [--dry] [--limit 50]

import { appendFile } from "node:fs/promises";

import { regions } from "../../../src/config/regions.ts";
import { eventsFromTribe, htmlText, jsonLdEvents } from "../gemini/lib.mjs";
import { eventPageLinks, eventsFromIcs, meetupFeed, readJsonLd, robotsAllows } from "./lib.mjs";

const INTAKE = "https://rxszqxwpgbrdytbkyxwp.supabase.co/functions/v1/research-intake";
const UA = "BranchOutdoorsResearch/1.2 (+public community board; reads public event pages weekly)";
const PAUSE_MS = 1500;

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const limitAt = args.indexOf("--limit");
const limit = limitAt >= 0 ? Number(args[limitAt + 1]) : Infinity;
const token = process.env.RESEARCH_AGENT_TOKEN;
if (!token) {
  console.log("RESEARCH_AGENT_TOKEN is not set; nothing to do.");
  process.exit(0);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function intake(body) {
  const res = await fetch(INTAKE, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`intake ${res.status}: ${json.detail ?? json.error ?? "error"}`);
  return json;
}

const robots = new Map();
async function allowed(url) {
  const { origin, pathname } = new URL(url);
  if (!robots.has(origin)) {
    let txt = "";
    try {
      const res = await fetch(`${origin}/robots.txt`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
      if (res.ok) txt = await res.text();
    } catch {
      // No robots.txt: nothing is disallowed.
    }
    robots.set(origin, txt);
  }
  return robotsAllows(robots.get(origin), pathname);
}

async function fetchText(url, accept) {
  await wait(PAUSE_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: accept },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { ok: false, why: `HTTP ${res.status}` };
    const text = await res.text();
    return { ok: true, text: text.slice(0, 3_000_000), type: res.headers.get("content-type") ?? "" };
  } catch (e) {
    return { ok: false, why: e.name === "TimeoutError" ? "timeout" : "unreachable" };
  }
}

/** One source: its events, how they were read, and pages worth reading next. */
async function readSource(source) {
  const region = regions.find((r) => r.slug === source.region);
  const timezone = source.timezone ?? region?.timezone ?? "America/New_York";
  // Calendar feeds first: a Meetup group's public iCal feed (its terms allow
  // it, ADR-0011), or any .ics address.
  const feed = meetupFeed(source.url) ?? (/\.ics([?#]|$)/i.test(source.url) ? source.url : null);
  if (feed) {
    if (!(await allowed(feed))) return { ok: false, result: "blocked by robots.txt", events: [], discovered: [] };
    const res = await fetchText(feed, "text/calendar");
    if (!res.ok) return { ok: false, result: res.why, events: [], discovered: [] };
    if (!/BEGIN:VCALENDAR/.test(res.text)) return { ok: false, result: "not a calendar feed", events: [], discovered: [] };
    const events = eventsFromIcs(res.text, { pageUrl: source.url, timezone, region });
    return { ok: true, result: `${events.length} dated events from the calendar feed`, events: events.slice(0, 50), discovered: [] };
  }
  if (!(await allowed(source.url))) return { ok: false, result: "blocked by robots.txt", events: [], discovered: [] };
  const page = await fetchText(source.url, "text/html");
  if (!page.ok) return { ok: false, result: page.why, events: [], discovered: [] };

  let events = readJsonLd(jsonLdEvents(page.text), { pageUrl: source.url, timezone, region });
  let how = "schema.org event data";
  if (!events.length && /wp-content|wp-json|tribe-events/i.test(page.text)) {
    const origin = new URL(source.url).origin;
    const api = `${origin}/wp-json/tribe/events/v1/events?per_page=50&start_date=${new Date().toISOString().slice(0, 10)}`;
    if (await allowed(api)) {
      const res = await fetchText(api, "application/json");
      if (res.ok && res.type.includes("json")) {
        try {
          events = eventsFromTribe(JSON.parse(res.text), { timezone });
          how = "the site's WordPress events calendar";
        } catch {
          // Not The Events Calendar after all.
        }
      }
    }
  }
  const discovered = events.length ? [] : eventPageLinks(page.text, source.url);
  const hasDates = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d{1,2}\b/i.test(htmlText(page.text));
  const result = events.length
    ? `${events.length} dated events from ${how}`
    : hasDates
      ? "no structured dates; the page shows dates (for the research agent)"
      : "no structured dates and no dates on the page";
  return { ok: true, result, events: events.slice(0, 50), discovered };
}

const sources = (await intake({ action: "sources" })).slice(0, limit);
console.log(`${sources.length} sources to read${dry ? " (dry run: nothing is sent)" : ""}.`);
const tally = { read: 0, failed: 0, events: 0, published: 0, updated: 0, cancelled: 0, kept: 0, new_sources: 0 };
const queue = [...sources];

while (queue.length) {
  const source = queue.shift();
  const read = await readSource(source);
  tally.read++;
  if (!read.ok) tally.failed++;
  tally.events += read.events.length;
  console.log(`${source.host} · ${source.url}\n  ${read.ok ? read.result : `failed: ${read.result}`}`);
  if (dry) {
    for (const d of read.discovered) console.log(`  would add ${d.kind} ${d.url}`);
    continue;
  }
  try {
    const answer = await intake({ action: "read", read: { source_id: source.id, ...read } });
    for (const k of ["published", "updated", "cancelled", "kept"]) tally[k] += answer[k] ?? 0;
    if (answer.published || answer.updated || answer.cancelled) {
      console.log(`  ${answer.published ?? 0} new on the board, ${answer.updated ?? 0} changed, ${answer.cancelled ?? 0} cancelled`);
    }
    // Pages noticed on a homepage are read now, not next week.
    const fresh = (answer.new_sources ?? []).length;
    if (fresh) {
      tally.new_sources += fresh;
      const ids = answer.new_sources;
      read.discovered.forEach((d, i) => ids[i] && queue.push({ ...source, id: ids[i], url: d.url, kind: d.kind }));
    }
  } catch (e) {
    console.log(`  not recorded: ${e.message}`);
  }
}

const summary = `Sources read: ${tally.read} (${tally.failed} failed). Events found: ${tally.events}. New on the board: ${tally.published}. Changed: ${tally.updated}. Cancelled: ${tally.cancelled}. Kept, not shown: ${tally.kept}. New sources noticed: ${tally.new_sources}.`;
console.log(`\n${summary}`);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `### Weekly source reader\n\n${summary}\n`);
