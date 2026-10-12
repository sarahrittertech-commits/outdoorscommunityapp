#!/usr/bin/env node
// Gemini sweep (UC-9 and UC-39 tooling; revised 12 October 2026). One live
// region's area and one activity pass per run, from areas.json in turn.
//
// Gemini, with Google Search, suggests organizations and the page where each
// posts its dates. It never supplies dates: on 12 October whole AI-made event
// files turned out invented. This script then checks everything itself:
//   - the homepage must load and name the organization (otherwise the find is
//     kept as failed, with the reason: keep every find, FR-RS-13);
//   - whether its site was among Google's search results for the answer is
//     recorded as evidence;
//   - if most suggested sites don't load at all, the batch is treated as
//     invented and nothing is sent;
//   - events come only from the organizer's events page itself, from its
//     schema.org event data or its WordPress events calendar, never from AI.
// Nothing is listed and the website doesn't change; the site admin decides.
//
//   GEMINI_API_KEY=… RESEARCH_AGENT_TOKEN=… node scripts/research/gemini/sweep.mjs [--dry] [--run N]
//
// --dry prints what would be sent and sends nothing. Never logs a key.

import { readFile } from "node:fs/promises";

import {
  buildPrompt,
  domainOf,
  eventsFromJsonLd,
  eventsFromTribe,
  groundedDomains,
  htmlText,
  isGrounded,
  jsonLdEvents,
  looksInvented,
  pageNames,
  parseFinds,
  pick,
  shapeProblem,
} from "./lib.mjs";

const INTAKE = process.env.RESEARCH_INTAKE_URL ?? "https://rxszqxwpgbrdytbkyxwp.supabase.co/functions/v1/research-intake";
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const runArg = args.indexOf("--run");
const runNumber = runArg >= 0 ? Number(args[runArg + 1]) : Number(process.env.GITHUB_RUN_NUMBER ?? Math.floor(Date.now() / 7.2e6));

const geminiKey = process.env.GEMINI_API_KEY;
const intakeToken = process.env.RESEARCH_AGENT_TOKEN;
if (!geminiKey || (!dry && !intakeToken)) {
  console.log("GEMINI_API_KEY or RESEARCH_AGENT_TOKEN is not set; nothing to do.");
  process.exit(0);
}

async function intake(body) {
  const res = await fetch(INTAKE, {
    method: "POST",
    headers: { Authorization: `Bearer ${intakeToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const UA = "BranchOutdoorsResearch/1.1 (+public community board; reads public pages only)";

/** A public page: its raw HTML and plain text, or why it couldn't be read. */
async function page(url) {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "User-Agent": UA } });
    if (!res.ok) return { ok: false, why: `HTTP ${res.status}` };
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html") && !type.includes("text")) return { ok: false, why: type };
    const html = await res.text();
    return { ok: true, html, text: htmlText(html) };
  } catch (e) {
    return { ok: false, why: e.name === "TimeoutError" ? "timeout" : "unreachable" };
  }
}

/** JSON from a public endpoint, or null. */
async function json(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Events from the organizer's own events page: its schema.org event data,
 * then, on its own WordPress site, The Events Calendar's public listing.
 */
async function readEvents(eventsUrl, homeUrl, timezone) {
  const evPage = await page(eventsUrl);
  if (!evPage.ok) return { events: [], how: `events page: ${evPage.why}` };
  let events = eventsFromJsonLd(jsonLdEvents(evPage.html), { pageUrl: eventsUrl, timezone });
  if (events.length) return { events, how: "schema.org event data on the events page" };
  if (domainOf(eventsUrl) === domainOf(homeUrl) && /wp-content|wp-json|tribe-events/i.test(evPage.html)) {
    const origin = new URL(eventsUrl).origin;
    const tribe = await json(`${origin}/wp-json/tribe/events/v1/events?per_page=50&start_date=${new Date().toISOString().slice(0, 10)}`);
    events = eventsFromTribe(tribe, { timezone });
    if (events.length) return { events, how: "the site's WordPress events calendar" };
  }
  return { events: [], how: "events page has no structured dates (left for the weekly reader)" };
}

const config = JSON.parse(await readFile(new URL("./areas.json", import.meta.url), "utf8"));
const job = pick(config, runNumber);
const today = new Date().toISOString().slice(0, 10);

// What the board already knows: subcategory slugs and names to skip.
let subcategories = [];
let knownNames = [];
if (intakeToken) {
  const known = await intake({ action: "known" });
  if (known.status !== 200) {
    console.log(`Intake answered ${known.status}; stopping.`);
    process.exit(1);
  }
  subcategories = known.json.subcategories.map((s) => s.subcategory).filter(Boolean);
  knownNames = known.json.names ?? [];
} else {
  subcategories = ["day-hikes", "backpacking", "mountain-biking", "road", "gravel", "trail-running", "road-running", "kayaking", "whitewater", "paddleboard", "bouldering", "sport", "trad", "indoor", "birding", "fly-fishing", "trail-work", "conservation", "ski-snowboard", "beginners"];
}

console.log(`Run ${runNumber}: ${job.area} — ${job.pass.split(":")[0]} (${MODEL})`);

const answer = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
  body: JSON.stringify({
    contents: [{ role: "user", parts: [{ text: buildPrompt({ ...job, subcategories, knownNames, today }) }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.1 },
  }),
});
if (!answer.ok) {
  console.log(`Gemini answered ${answer.status} (quota, billing or model name?); stopping.`);
  process.exit(answer.status === 429 ? 0 : 1);
}
const data = await answer.json();
const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
const grounded = groundedDomains(data);
// What this run used, so the cost per run can be read off the log (12 October 2026).
const usage = data.usageMetadata ?? {};
const searches = data.candidates?.[0]?.groundingMetadata?.webSearchQueries ?? [];
console.log(
  `Usage: ${usage.promptTokenCount ?? "?"} input tokens, ${usage.candidatesTokenCount ?? "?"} output tokens, ` +
    `${usage.thoughtsTokenCount ?? 0} thinking tokens, ${searches.length} Google searches.`,
);
const finds = parseFinds(text).slice(0, 12);
console.log(`Gemini suggested ${finds.length}; Google returned ${grounded.size} sites.`);

const known = new Set(knownNames);
const tally = { suggested: finds.length, dropped: 0, grounded: 0, failed: 0, sent: 0, events_verified: 0, events_kept: 0, results: {} };

// First check every homepage, so an invented batch is caught before anything is sent.
const checked = [];
for (const raw of finds) {
  const find = { ...raw, out_of_region: job.out_of_region, affinity_tags: Array.isArray(raw.affinity_tags) ? raw.affinity_tags : [] };
  const problem = shapeProblem(find, subcategories);
  if (problem) {
    tally.dropped++;
    console.log(`  drop ${find?.name ?? "?"}: ${problem}`);
    continue;
  }
  if (known.has(find.name.trim().toLowerCase())) {
    tally.dropped++;
    continue;
  }
  const home = await page(find.source_url);
  checked.push({ find, home, homeOk: home.ok && pageNames(home.text, find.name), inSearch: isGrounded(find.source_url, grounded) });
}
if (looksInvented(checked.map((c) => (c.home.ok ? "ok" : c.home.why)))) {
  console.log(`Most suggested sites don't exist; treating this answer as invented and sending nothing.`);
  console.log(JSON.stringify({ ...tally, invented: true }));
  process.exit(0);
}

for (const { find, home, homeOk, inSearch } of checked) {
  if (inSearch) tally.grounded++;
  if (!homeOk) {
    tally.failed++;
    console.log(`  failed ${find.name}: ${home.ok ? "page doesn't name it" : home.why} (kept as failed)`);
  }
  const eventsUrl = typeof find.events_url === "string" && /^https?:\/\/[^\s]+$/.test(find.events_url) ? find.events_url : null;
  const { events, how } = homeOk && eventsUrl ? await readEvents(eventsUrl, find.source_url, job.timezone) : { events: [], how: eventsUrl ? "not read (homepage failed)" : "no events page named" };
  tally.events_verified += events.filter((e) => e.verification === "verified").length;
  tally.events_kept += events.length;
  const evidence = [
    homeOk ? "Homepage loads and names it" : `Homepage ${home.ok ? "doesn't name it" : home.why}`,
    inSearch ? "site was in Google's results" : "site NOT among Google's results",
    eventsUrl ? `events page ${eventsUrl}: ${events.length} dated (${how})` : how,
    `Gemini sweep, ${job.area}, ${job.pass.split(":")[0]}`,
  ].join("; ");
  const candidate = {
    ...find,
    name: find.name.trim(),
    description: find.description.trim(),
    other_urls: eventsUrl && eventsUrl !== find.source_url ? [eventsUrl] : [],
    events,
    verification: homeOk ? "verified" : "failed",
    evidence: evidence.slice(0, 1000),
    checked_at: new Date().toISOString(),
  };
  delete candidate.events_url;
  if (dry) {
    console.log(`  would send ${candidate.kind}: ${candidate.name} (${candidate.source_url}) [${evidence}]`);
    continue;
  }
  const res = await intake({ action: "add", candidate });
  const result = res.json.result ?? `HTTP ${res.status}${res.json.detail ? `: ${res.json.detail}` : ""}`;
  tally.results[result] = (tally.results[result] ?? 0) + 1;
  tally.sent++;
  console.log(`  ${result}: ${candidate.kind} ${candidate.name}, ${events.length} events`);
}

console.log(JSON.stringify(tally));
