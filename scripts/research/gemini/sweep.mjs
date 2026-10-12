#!/usr/bin/env node
// Gemini sweep (UC-9 tooling, 12 October 2026): an inexpensive research
// runner. One area and one search pass per run, from areas.json in turn.
// Gemini (free API tier, with Google Search) suggests finds; this script
// then OPENS every link itself and keeps only finds whose page loads and
// names them, and events whose own page shows their date. Survivors go to
// the research intake as candidates for the site admin to review. Nothing
// is listed and the website doesn't change.
//
//   GEMINI_API_KEY=… RESEARCH_AGENT_TOKEN=… node scripts/research/gemini/sweep.mjs [--dry] [--run N]
//
// --dry prints what would be sent and sends nothing. Never logs a key.

import { readFile } from "node:fs/promises";

import { buildPrompt, htmlText, pageNames, pageShowsDate, parseFinds, pick, shapeProblem } from "./lib.mjs";

const INTAKE = process.env.RESEARCH_INTAKE_URL ?? "https://rxszqxwpgbrdytbkyxwp.supabase.co/functions/v1/research-intake";
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
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

async function page(url) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "BranchOutdoorsResearch/1.0 (+public community board; reads public pages only)" },
    });
    if (!res.ok) return { ok: false, why: `HTTP ${res.status}` };
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html") && !type.includes("text")) return { ok: false, why: type };
    return { ok: true, text: htmlText(await res.text()) };
  } catch (e) {
    return { ok: false, why: e.name === "TimeoutError" ? "timeout" : "unreachable" };
  }
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
    generationConfig: { temperature: 0.2 },
  }),
});
if (!answer.ok) {
  console.log(`Gemini answered ${answer.status} (quota or model name?); stopping.`);
  process.exit(answer.status === 429 ? 0 : 1);
}
const data = await answer.json();
const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
const finds = parseFinds(text);
console.log(`Gemini suggested ${finds.length}.`);

const known = new Set(knownNames);
const tally = { suggested: finds.length, dropped: 0, sent: 0, events_kept: 0, events_dropped: 0, results: {} };

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
  if (!home.ok || !pageNames(home.text, find.name)) {
    tally.dropped++;
    console.log(`  drop ${find.name}: ${home.ok ? "page doesn't name it" : home.why}`);
    continue;
  }
  const events = [];
  for (const ev of Array.isArray(find.events) ? find.events : []) {
    const tz = ev.timezone || job.timezone;
    const ok =
      typeof ev.title === "string" &&
      ev.title.trim().length >= 3 &&
      typeof ev.location_name === "string" &&
      ev.location_name.trim().length >= 2 &&
      typeof ev.starts_at === "string" &&
      new Date(ev.starts_at) > new Date() &&
      typeof ev.source_url === "string" &&
      /^https?:\/\//.test(ev.source_url);
    const evPage = ok ? await page(ev.source_url) : { ok: false };
    if (ok && evPage.ok && pageShowsDate(evPage.text, ev.starts_at, tz)) {
      events.push({ title: ev.title.trim().slice(0, 120), starts_at: ev.starts_at, ...(ev.ends_at ? { ends_at: ev.ends_at } : {}), timezone: tz, location_name: ev.location_name.trim().slice(0, 200), source_url: ev.source_url });
      tally.events_kept++;
    } else {
      tally.events_dropped++;
    }
  }
  const candidate = { ...find, name: find.name.trim(), description: find.description.trim(), events };
  if (dry) {
    console.log(`  would send ${candidate.kind}: ${candidate.name} (${candidate.source_url}), ${events.length} events`);
    continue;
  }
  const res = await intake({ action: "add", candidate });
  const result = res.json.result ?? `HTTP ${res.status}${res.json.detail ? `: ${res.json.detail}` : ""}`;
  tally.results[result] = (tally.results[result] ?? 0) + 1;
  tally.sent++;
  console.log(`  ${result}: ${candidate.kind} ${candidate.name}, ${events.length} events`);
}

console.log(JSON.stringify(tally));
