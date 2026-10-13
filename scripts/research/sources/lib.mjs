// The weekly source reader's pure parts (UC-39, FR-ES-3). No network here,
// so the tests run without the web. read.mjs does the fetching.

import { domainOf, eventsFromJsonLd } from "../gemini/lib.mjs";
import { miles } from "../feeds/lib.mjs";

/** States whose events can belong to a region (a hub near a state line). */
export const NEARBY_STATES = {
  "western-nc": ["NC", "SC", "TN", "GA", "VA"],
  triangle: ["NC", "VA"],
  "upstate-sc": ["SC", "NC", "GA"],
  "east-tennessee": ["TN", "NC", "VA", "KY", "GA"],
  "new-river-gorge": ["WV", "VA"],
  "front-range": ["CO", "WY"],
  "durango-san-juans": ["CO", "NM", "UT", "AZ"],
  wasatch: ["UT", "ID", "WY"],
  "puget-sound": ["WA", "BC"],
  "reno-tahoe": ["NV", "CA"],
  "sedona-flagstaff": ["AZ"],
};

const STATE_NAMES = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT",
  delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI",
  minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH",
  "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH",
  oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD",
  tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY", "british columbia": "BC",
};

/** A two-letter state from "NC", "North Carolina" or "N.C.", or null. */
export function stateCode(value) {
  if (typeof value !== "string") return null;
  const v = value.trim().replace(/\./g, "");
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  return STATE_NAMES[v.toLowerCase()] ?? null;
}

/**
 * Why an event is outside its host's region, or null. Uses the event's map
 * point when the page gives one, else its state; with neither, the host's
 * own page is trusted.
 */
export function farReason(node, region) {
  if (!region) return null;
  const loc = Array.isArray(node?.location) ? node.location[0] : node?.location;
  const geo = loc?.geo;
  const lat = Number(geo?.latitude);
  const lng = Number(geo?.longitude);
  if (geo && Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) {
    const d = miles(region.center.lat, region.center.lng, lat, lng);
    return d > region.radiusMiles + 50 ? `Out of the region (${Math.round(d)} miles away)` : null;
  }
  const addr = loc?.address;
  const state = stateCode(typeof addr === "object" ? addr?.addressRegion : null);
  const allowed = NEARBY_STATES[region.slug] ?? [region.state];
  return state && !allowed.includes(state) ? `Out of the region (${state})` : null;
}

/**
 * Board-shaped events from schema.org event data, each with the reader's
 * extra facts: cancelled (the page says so) and far (outside the region).
 */
export function readJsonLd(nodes, { pageUrl, timezone, region, now = new Date() }) {
  const out = [];
  for (const node of nodes) {
    const cancelled = node.eventStatus && /Cancelled/i.test(String(node.eventStatus));
    const [event] = eventsFromJsonLd([cancelled ? { ...node, eventStatus: undefined } : node], { pageUrl, timezone, now });
    if (!event) continue;
    const far = farReason(node, region);
    out.push({ ...event, ...(cancelled ? { cancelled: true } : {}), ...(far ? { far } : {}) });
  }
  return out;
}

const EVENTS_PATH = /(^|[/_-])(events?|calendar|schedule|rides|runs|races|trips|outings|hikes|programs|clinics|classes|workshops|meetups?|happenings)([/_.-]|$)/i;

/**
 * Pages worth reading next, linked from a host's page: its events or
 * calendar pages on the same site, and its Meetup group. At most three.
 */
export function eventPageLinks(html, pageUrl) {
  const site = domainOf(pageUrl);
  const found = new Map();
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi)) {
    let url;
    try {
      url = new URL(m[1].replace(/&amp;/g, "&"), pageUrl);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol)) continue;
    const meetup = url.hostname.replace(/^www\./, "") === "meetup.com" && url.pathname.match(/^\/([^/]+)\/?/);
    if (meetup && !["find", "topics", "cities", "lp", "apps", "about", "help", "pro", "blog"].includes(meetup[1])) {
      found.set(`meetup:${meetup[1].toLowerCase()}`, { url: `https://www.meetup.com/${meetup[1]}/events/`, kind: "meetup" });
      continue;
    }
    if (domainOf(url.href) !== site || !EVENTS_PATH.test(url.pathname)) continue;
    if (/\/(\d{4}\/\d{2}|tag|category|feed|wp-json)\//i.test(url.pathname) || /\.(jpg|png|pdf|ics)$/i.test(url.pathname)) continue;
    url.search = "";
    url.hash = "";
    const key = url.href.replace(/\/$/, "").toLowerCase();
    if (key === pageUrl.replace(/\/$/, "").toLowerCase()) continue;
    found.set(key, { url: url.href, kind: "own_page" });
  }
  // Shorter paths first: /events beats /events/2026-spring-ride.
  return [...found.values()].sort((a, b) => a.url.length - b.url.length).slice(0, 3);
}

/** Whether robots.txt lets a reader with this name fetch the path. */
export function robotsAllows(robotsTxt, path, agent = "BranchOutdoorsResearch") {
  if (!robotsTxt) return true;
  const groups = [];
  let current = null;
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === "user-agent") {
      if (!current || current.rules.length) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(m[2].toLowerCase());
    } else if (current && (key === "allow" || key === "disallow")) {
      current.rules.push({ allow: key === "allow", path: m[2] });
    }
  }
  const mine = groups.filter((g) => g.agents.some((a) => a !== "*" && agent.toLowerCase().includes(a)));
  const rules = (mine.length ? mine : groups.filter((g) => g.agents.includes("*"))).flatMap((g) => g.rules);
  let best = null;
  for (const r of rules) {
    if (!r.path) continue;
    const pattern = new RegExp("^" + r.path.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
    if (pattern.test(path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return !best || best.allow;
}
