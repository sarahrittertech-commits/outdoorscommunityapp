// Pure helpers for the Gemini sweep (scripts/research/gemini/sweep.mjs).
// No network here, so they can be unit-tested.

export const KINDS = ["group", "guide", "business", "venue", "company", "brand", "camp", "place", "youth_program"];

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

/** The site part of a URL, without "www.": "pisgahareasorba.org". */
export function domainOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * The sites Google Search actually returned for the answer (its grounding
 * metadata). Each chunk's title is the site's domain; its uri is a Google
 * redirect, so the title is what to compare.
 */
export function groundedDomains(response) {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  return new Set(
    chunks
      .map((c) => (c?.web?.title ?? "").toLowerCase().replace(/^www\./, "").trim())
      .filter(Boolean),
  );
}

/** Was this URL's site among the search results? Matches the domain or a parent of it. */
export function isGrounded(url, grounded) {
  const d = domainOf(url);
  if (!d) return false;
  for (const g of grounded) if (d === g || d.endsWith(`.${g}`) || g.endsWith(`.${d}`)) return true;
  return false;
}

/**
 * Invented-batch alarm (12 October 2026: whole AI files used made-up
 * websites). True when at least half of the finds, and at least three,
 * point at sites that don't load at all.
 */
export function looksInvented(results) {
  const dead = results.filter((r) => r === "unreachable").length;
  return results.length >= 3 && dead * 2 >= results.length;
}

const EVENT_TYPES = /(^|:)(Event|SportsEvent|Festival|EducationEvent|SocialEvent|ExhibitionEvent|ChildrensEvent)$/;

/** Event objects in a page's schema.org JSON-LD (top level, arrays and @graph). */
export function jsonLdEvents(html) {
  const out = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    const types = [].concat(node["@type"] ?? []);
    if (types.some((t) => typeof t === "string" && EVENT_TYPES.test(t))) out.push(node);
    if (node["@graph"]) visit(node["@graph"]);
  };
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(m[1].trim()));
    } catch {
      // A broken block on someone's page is skipped, not fatal.
    }
  }
  return out;
}

const hasTime = (iso) => typeof iso === "string" && /T\d{2}:\d{2}/.test(iso);
const hasOffset = (iso) => typeof iso === "string" && /(Z|[+-]\d{2}:?\d{2})$/.test(iso);

/** A place's name from a schema.org location (string, Place, or address). */
function placeName(loc) {
  if (!loc) return "";
  if (typeof loc === "string") return loc;
  if (Array.isArray(loc)) return placeName(loc[0]);
  const addr = loc.address;
  const street = typeof addr === "string" ? addr : [addr?.streetAddress, addr?.addressLocality].filter(Boolean).join(", ");
  return [loc.name, street].filter(Boolean).join(", ");
}

/**
 * Board-shaped events from schema.org Event objects. Only future events with
 * a start date and time; one without a time or a UTC offset is kept as
 * date_only, never published (FR-RS-13).
 */
export function eventsFromJsonLd(nodes, { pageUrl, timezone, now = new Date() }) {
  const events = [];
  for (const n of nodes) {
    const title = typeof n.name === "string" ? n.name.trim() : "";
    const start = typeof n.startDate === "string" ? n.startDate.trim() : "";
    if (title.length < 3 || !start) continue;
    const exact = hasTime(start) && hasOffset(start);
    const when = new Date(exact ? start : `${start.slice(0, 10)}T12:00:00Z`);
    if (Number.isNaN(when.getTime()) || when <= now) continue;
    if (n.eventStatus && /Cancelled/i.test(String(n.eventStatus))) continue;
    const place = placeName(n.location).trim();
    events.push({
      title: title.slice(0, 120),
      starts_at: exact ? start : `${start.slice(0, 10)}T09:00:00Z`,
      ...(exact && hasTime(n.endDate) && hasOffset(n.endDate) ? { ends_at: n.endDate } : {}),
      timezone,
      location_name: (place.length >= 2 ? place : "See the event page").slice(0, 200),
      source_url: typeof n.url === "string" && /^https?:\/\//.test(n.url) ? n.url : pageUrl,
      verification: exact ? "verified" : "unverified",
      ...(exact ? {} : { date_only: true, note: "Structured data gives a date without a start time" }),
    });
  }
  return events;
}

/**
 * Board-shaped events from The Events Calendar's public REST answer
 * (/wp-json/tribe/events/v1/events), common on club WordPress sites.
 * Its utc_start_date is in UTC; all_day events are date_only.
 */
export function eventsFromTribe(json, { timezone, now = new Date() }) {
  const events = [];
  for (const e of Array.isArray(json?.events) ? json.events : []) {
    const title = htmlText(String(e.title ?? "")).trim();
    const utc = typeof e.utc_start_date === "string" ? `${e.utc_start_date.replace(" ", "T")}Z` : "";
    const when = new Date(utc);
    if (title.length < 3 || Number.isNaN(when.getTime()) || when <= now) continue;
    const allDay = Boolean(e.all_day);
    const venue = e.venue && typeof e.venue === "object" ? [e.venue.venue, e.venue.address, e.venue.city].filter(Boolean).join(", ") : "";
    events.push({
      title: title.slice(0, 120),
      starts_at: when.toISOString(),
      ...(!allDay && e.utc_end_date ? { ends_at: `${String(e.utc_end_date).replace(" ", "T")}Z` } : {}),
      timezone: typeof e.timezone === "string" && e.timezone.includes("/") ? e.timezone : timezone,
      location_name: (venue.length >= 2 ? venue : "See the event page").slice(0, 200),
      source_url: typeof e.url === "string" ? e.url : "",
      verification: allDay ? "unverified" : "verified",
      ...(allDay ? { date_only: true, note: "All-day listing, no start time" } : {}),
    });
  }
  return events.filter((e) => /^https?:\/\//.test(e.source_url));
}

/**
 * The prompt for one area and pass (revised 12 October 2026). Gemini finds
 * organizations and where they post events; it never supplies dates. The
 * script reads dates from the organizers' own pages.
 */
export function buildPrompt({ area, pass, subcategories, knownNames, today }) {
  return `You are helping a public community board find real outdoor recreation organizations. Today is ${today}.

Area: ${area} and within about 60 miles.
Kind of organization: ${pass}.

Use Google Search. List at most 12 real organizations of this kind that are active now (a dated post, event or update from 2025 or 2026 on their own page or public social page). Fewer is fine: if you find 3 real ones, list 3. Never guess, never fill a list, never build a URL that you did not see in a search result. Skip any whose name is in this list the board already has: ${knownNames.slice(0, 400).join("; ")}.

Do NOT list event dates. Instead, for each organization give events_url: the page where it posts its own dates (its events or calendar page, its Meetup group, or its organizer page on a race sign-up site such as RunSignup, UltraSignup or BikeReg), or null if it has none.

Rules:
- One organization per item, its official name.
- source_url: its own website homepage (or its public Instagram, Facebook or Meetup page if it has no website), exactly as it appeared in search results.
- description: 1-2 neutral sentences in your own words, 10-300 characters, what it does and where. No marketing words, no people's names, emails or phone numbers.
- kind: "group" (club, nonprofit, meetup, volunteer crew), "guide" (paid guide service or instructor), "business" (shop or outfitter), "company" (race or event company), "venue" (gym, nature center, park program, ski area), "camp", "youth_program", "brand", or "place" (trail system, crag, park or trailhead).
- subcategory: exactly one of: ${subcategories.join(", ")}.
- affinity_tags: any of "women", "youth", "bipoc", "lgbtqia" only when its page says so plainly; else [].

Answer with ONLY a JSON array in a \`\`\`json code block, each item:
{"kind": "...", "name": "...", "subcategory": "...", "area": "<town>", "description": "...", "source_url": "https://...", "events_url": "https://..." or null, "affinity_tags": []}

If you find nothing that meets the rules, answer [].`;
}
