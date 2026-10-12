// Pure helpers for the Gemini sweep (scripts/research/gemini/sweep.mjs).
// No network here, so they can be unit-tested.

export const KINDS = ["group", "guide", "business", "venue"];

/** The run's area and pass, in turn: run n takes area n mod A, pass (n div A) mod P. */
export function pick(config, runNumber) {
  const a = config.areas.length;
  const p = config.passes.length;
  return { ...config.areas[runNumber % a], pass: config.passes[Math.floor(runNumber / a) % p] };
}

/** The JSON array in a model answer, with or without a ```json fence. */
export function parseFinds(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start < 0 || end < start) return [];
  try {
    const value = JSON.parse(body.slice(start, end + 1));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

const isUrl = (u) => typeof u === "string" && /^https?:\/\/[^\s]+$/.test(u) && u.length <= 500;
const len = (s, lo, hi) => typeof s === "string" && s.trim().length >= lo && s.trim().length <= hi;

/** Shape check matching research.candidates' constraints; returns a reason or null. */
export function shapeProblem(find, subcategories) {
  if (!find || typeof find !== "object") return "not an object";
  if (!KINDS.includes(find.kind)) return "kind";
  if (!len(find.name, 3, 80)) return "name";
  if (!subcategories.includes(find.subcategory)) return "subcategory";
  if (!len(find.area, 2, 80)) return "area";
  if (!len(find.description, 10, 300)) return "description";
  if (!isUrl(find.source_url)) return "source_url";
  if (/@|\(\d{3}\)|\d{3}[-.]\d{3}[-.]\d{4}/.test(find.description)) return "contact details in description";
  return null;
}

/** The distinctive words of a name, to look for on its page. */
export function nameTokens(name) {
  const stop = new Set(["the", "and", "of", "club", "group", "association", "society", "inc", "llc", "chapter", "for"]);
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stop.has(w));
}

/** Does the page text name the organization? At least half its distinctive words appear. */
export function pageNames(pageText, name) {
  const text = pageText.toLowerCase();
  const tokens = nameTokens(name);
  if (!tokens.length) return text.includes(name.toLowerCase());
  return tokens.filter((t) => text.includes(t)).length * 2 >= tokens.length;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Does the page show the event's date (month name or number, and day)? */
export function pageShowsDate(pageText, isoStart, timeZone) {
  const d = new Date(isoStart);
  if (Number.isNaN(d.getTime())) return false;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric", day: "numeric" })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const month = Number(parts.month);
  const day = Number(parts.day);
  const text = pageText.toLowerCase().replace(/\s+/g, " ");
  const name = MONTHS[month - 1];
  const short = name.slice(0, 3);
  const patterns = [
    new RegExp(`\\b(${name}|${short}\\.?)\\s+0?${day}\\b`),
    new RegExp(`\\b0?${day}\\s+(${name}|${short})\\b`),
    new RegExp(`\\b0?${month}/0?${day}\\b`),
    new RegExp(`\\b${parts.year}-0?${month}-0?${day}\\b`.replace(/-0\?(\d)/g, "-0?$1")),
  ];
  return patterns.some((p) => p.test(text));
}

/** Plain text of an HTML page, scripts and styles removed. */
export function htmlText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

/** The prompt for one area and pass. */
export function buildPrompt({ area, pass, timezone, subcategories, knownNames, today }) {
  return `You are researching outdoor recreation communities for a public community board. Today is ${today}.

Area: ${area} and within about 60 miles.
Search pass: ${pass}.

Use Google Search. Find real organizations for this pass that are active now (a dated post, event or update from 2025 or 2026 on their own page or public social page). Skip any whose name is in this list of names the board already has: ${knownNames.slice(0, 400).join("; ")}.

For each one, also list its upcoming public events from today to six months ahead, ONLY if its own events page (or a single registration page naming it) shows the date AND start time. Never invent a date, never carry one over from a previous year, never use search pages, listing sites or news stories as event links. Leave out members-only events.

Rules:
- One real organization per item, its official name.
- source_url: its own website homepage (or its public Instagram/Facebook/Meetup page if it has no website). Only URLs you actually found in search results.
- description: 1-2 neutral sentences in your own words, 10-300 characters, what it does and where. No marketing words, no people's names, emails or phone numbers.
- kind: "group" (club, nonprofit, meetup, volunteer crew), "guide" (paid guide service or instructor), "business" (shop, outfitter, race or event company), "venue" (gym, nature center, park program, ski area).
- subcategory: exactly one of: ${subcategories.join(", ")}.
- affinity_tags: any of "women", "youth", "bipoc", "lgbtqia" only when its page says so plainly; else [].
- Event times in ISO 8601 with the correct UTC offset for ${timezone} on that date.

Answer with ONLY a JSON array in a \`\`\`json code block, each item:
{"kind": "...", "name": "...", "subcategory": "...", "area": "<town>", "description": "...", "source_url": "https://...", "affinity_tags": [], "events": [{"title": "...", "starts_at": "2026-11-07T09:00:00-05:00", "ends_at": null, "timezone": "${timezone}", "location_name": "<place, town>", "source_url": "https://<the event's own page>"}]}

If you find nothing that meets the rules, answer [].`;
}
