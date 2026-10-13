// The weekly source reader's pure parts (UC-39, FR-ES-3). No network here,
// so the tests run without the web. read.mjs does the fetching.

import { domainOf, eventsFromJsonLd, eventsFromTribe } from "../gemini/lib.mjs";
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
    out.push({ ...wallClockIfUtc(event), ...(cancelled ? { cancelled: true } : {}), ...(far ? { far } : {}) });
  }
  return out;
}

// A list page's last path part: "events", "calendar", "group-rides",
// "upcoming-events". Single event pages (/event-6810339,
// /calendar/2026/October/17/notch-peak-day-hike) are not sources.
const LIST_PAGE = /^([a-z]+-)?(events?|calendar|schedule|rides|runs|races|trips|outings|hikes|programs|clinics|classes|workshops|meetups|happenings)(-[a-z]+)?$/i;
const MEETUP_PAGES = new Set(["find", "topics", "cities", "lp", "apps", "about", "help", "pro", "blog", "start", "login", "register", "sitemap", "terms", "privacy", "media", "careers", "cookie_policy", "meetup_api", "account", "messages", "notifications", "your-events", "home"]);

/**
 * Pages worth reading next, linked from a host's page: its events or
 * calendar pages on the same site, and its Meetup group. At most three.
 */
export function eventPageLinks(html, pageUrl) {
  const site = domainOf(pageUrl);
  if (site === "meetup.com") return [];
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
    if (meetup && !MEETUP_PAGES.has(meetup[1].toLowerCase())) {
      found.set(`meetup:${meetup[1].toLowerCase()}`, { url: `https://www.meetup.com/${meetup[1]}/events/`, kind: "meetup" });
      continue;
    }
    if (domainOf(url.href) !== site) continue;
    const parts = url.pathname.split("/").filter(Boolean);
    if (!parts.length || parts.length > 2 || !LIST_PAGE.test(parts[parts.length - 1])) continue;
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

/** A Meetup group's public calendar feed, from its page address. */
export function meetupFeed(url) {
  const m = url.match(/^https?:\/\/(www\.)?meetup\.com\/([^/?#]+)/i);
  return m && !MEETUP_PAGES.has(m[2].toLowerCase()) ? `https://www.meetup.com/${m[2]}/events/ical/` : null;
}

const unescapeIcs = (v) => v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();

/** "20261013T163000" or "20261013T223000Z" as ISO, with Z kept; dates alone as date_only. */
function icsTime(value) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, sec, z] = m;
  return h ? { iso: `${y}-${mo}-${d}T${h}:${mi}:${sec ?? "00"}${z ? "Z" : ""}`, timed: true } : { iso: `${y}-${mo}-${d}`, timed: false };
}

/**
 * Board-shaped events from an iCal feed (Meetup groups, club calendars).
 * A time with a TZID is sent as wall-clock time with that zone; the
 * database reads it there. All-day entries are date_only.
 */
export function eventsFromIcs(text, { pageUrl, timezone, region, now = new Date() }) {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const out = [];
  let ev = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") ev = {};
    else if (line === "END:VEVENT" && ev) {
      const start = ev.DTSTART && icsTime(ev.DTSTART.value);
      const title = unescapeIcs(ev.SUMMARY?.value ?? "");
      if (start && title.length >= 3) {
        const zone = ev.DTSTART.params.TZID ?? timezone;
        const end = ev.DTEND && icsTime(ev.DTEND.value);
        const when = new Date(start.timed && start.iso.endsWith("Z") ? start.iso : `${start.iso.slice(0, 10)}T23:59:59Z`);
        if (when > now) {
          const place = unescapeIcs(ev.LOCATION?.value ?? "");
          const url = (ev.URL?.value ?? "").trim();
          const [lat, lng] = (ev.GEO?.value ?? "").split(";").map(Number);
          const far = ev.GEO ? farReason({ location: { geo: { latitude: lat, longitude: lng } } }, region) : null;
          out.push({
            title: title.slice(0, 120),
            starts_at: start.iso,
            ...(start.timed && end?.timed ? { ends_at: end.iso } : {}),
            timezone: zone,
            location_name: (place.length >= 2 ? place : "See the event page").slice(0, 200),
            source_url: /^https?:\/\/\S+$/.test(url) && url.length <= 500 ? url : pageUrl,
            verification: start.timed ? "verified" : "unverified",
            ...(start.timed ? {} : { date_only: true, note: "All-day calendar entry, no start time" }),
            ...(/CANCELLED/i.test(ev.STATUS?.value ?? "") ? { cancelled: true } : {}),
            ...(far ? { far } : {}),
          });
        }
      }
      ev = null;
    } else if (ev) {
      const m = line.match(/^([A-Z-]+)((?:;[^:]+)*):(.*)$/);
      if (m) {
        const params = Object.fromEntries(m[2].split(";").filter(Boolean).map((p) => p.split("=")));
        ev[m[1]] = { value: m[3], params };
      }
    }
  }
  return out;
}

/**
 * Board-shaped events from The Events Calendar's REST answer, each checked
 * against the region with its venue's map point or state when the site
 * gives them.
 */
export function readTribe(json, { timezone, region, now = new Date() }) {
  const out = [];
  for (const e of Array.isArray(json?.events) ? json.events : []) {
    let [event] = eventsFromTribe({ events: [e] }, { timezone, now });
    if (!event) continue;
    // A WordPress site left on UTC gives local times as UTC: its "UTC" and
    // local start are the same. Read the local start in the region's zone.
    if ((e.timezone === "UTC" || e.start_date === e.utc_start_date) && typeof e.start_date === "string") {
      const local = (v) => (typeof v === "string" ? v.replace(" ", "T") : null);
      event = { ...event, starts_at: local(e.start_date), timezone };
      if (event.ends_at) event.ends_at = local(e.end_date) ?? undefined;
    }
    const v = e.venue && typeof e.venue === "object" ? e.venue : {};
    const lat = Number(v.geo_lat);
    const lng = Number(v.geo_lng);
    const node = {
      location: {
        ...(Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng) ? { geo: { latitude: lat, longitude: lng } } : {}),
        address: { addressRegion: v.stateprovince || v.state || v.province || null },
      },
    };
    const far = farReason(node, region);
    out.push({ ...event, ...(far ? { far } : {}) });
  }
  return out;
}

/**
 * For a statewide calendar (statewide.json): why an event can't be placed
 * near the region, or null when its place or title names a listed park or
 * a town from the board's town list inside the region's radius.
 */
export function statewideReason(event, site, region, towns) {
  if (!site || !region) return null;
  const text = `${event.location_name ?? ""} ${event.title ?? ""}`.toLowerCase();
  if (site.places.some((p) => text.includes(p.toLowerCase()))) return null;
  for (const t of towns) {
    if (!new RegExp(`\\b${t.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text)) continue;
    if (miles(region.center.lat, region.center.lng, t.lat, t.lng) <= region.radiusMiles) return null;
  }
  return "Statewide calendar: the place isn't one near the region";
}

/**
 * Event pages often stamp local times with a zero offset ("17:30:00+00:00"
 * for a 5:30 pm ride in Virginia). No outdoor event in a US region is
 * posted in UTC, so a zero offset is read as wall-clock time in the event's
 * time zone.
 */
export function wallClockIfUtc(event) {
  const strip = (v) => (typeof v === "string" ? v.replace(/(Z|[+-]00:?00)$/i, "") : v);
  if (!/(Z|[+-]00:?00)$/i.test(event.starts_at ?? "") || /^(UTC|Etc\/UTC)$/i.test(event.timezone ?? "")) return event;
  return { ...event, starts_at: strip(event.starts_at), ...(event.ends_at ? { ends_at: strip(event.ends_at) } : {}) };
}

const NAMED = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };

/** Text from a web page with its character codes turned back into characters ("&#8211;" → "–"). */
export function decodeEntities(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED[name.toLowerCase()] ?? m);
}

const STATE_CODES = new Set(Object.values(STATE_NAMES));

/**
 * Why an event is outside its host's region when only its title or place
 * names the state ("Butte Gateway Meetup I Butte, MT"), or null. Pages for
 * organizations that span several states often give no address data.
 */
export function textStateReason(event, region) {
  if (!region) return null;
  const allowed = NEARBY_STATES[region.slug] ?? [region.state];
  for (const m of `${event.title ?? ""} | ${event.location_name ?? ""}`.matchAll(/,\s*([A-Z]{2})(?=\s*(?:\d{5}|$|[|),;–-]))/g)) {
    if (STATE_CODES.has(m[1]) && !allowed.includes(m[1])) return `Out of the region (${m[1]}, named in the title or place)`;
  }
  return null;
}

/** Dates of one repeating event shown at a time; the weekly read adds the next as each passes. */
export const MAX_DATES_PER_TITLE = 6;

/** Marks every date of a repeating event after the next six, so the board shows a rolling window, not a year of the same ride. */
export function rollingWindow(events, max = MAX_DATES_PER_TITLE) {
  const seen = new Map();
  const order = [...events].map((e, i) => ({ e, i, at: Date.parse(e.starts_at) || 0 })).sort((a, b) => a.at - b.at);
  const marked = new Set();
  for (const { e, i } of order) {
    const key = (e.title ?? "").trim().toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n > max) marked.add(i);
  }
  return events.map((e, i) => (marked.has(i) && !e.far ? { ...e, far: "Beyond the next six dates of a repeating event" } : e));
}

/** The local clock time of an event's start in its own zone ("17:30"), or null. */
export function localTime(event) {
  const iso = event.starts_at ?? "";
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(iso)) return iso.match(/T(\d{2}:\d{2})/)?.[1] ?? null;
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: event.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(when);
  } catch {
    return null;
  }
}

/** A midnight start is an all-day listing with no published time: kept as date-only, never published. */
export function midnightIsDateOnly(event) {
  return localTime(event) === "00:00" && !event.date_only
    ? { ...event, date_only: true, verification: "unverified", note: "Listed as all day (midnight start), no start time" }
    : event;
}
