import { regions } from "@/config/regions";
import { site } from "@/config/site";
import { towns, type Town } from "@/config/towns";
import { zipPrefixTowns, zipTowns } from "@/config/zips";

/** State names a group's area might spell out ("Red River Gorge, Kentucky"). */
const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DC: "District of Columbia", DE: "Delaware", FL: "Florida", GA: "Georgia", ID: "Idaho", IL: "Illinois", IN: "Indiana",
  IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts",
  MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
const STATE_BY_NAME = new Map(Object.entries(STATE_NAMES).map(([code, name]) => [name.toLowerCase(), code]));

const nameCount = new Map<string, number>();
for (const t of towns) nameCount.set(t.name.toLowerCase(), (nameCount.get(t.name.toLowerCase()) ?? 0) + 1);

/**
 * How a town is saved and passed in links: its name, or "Name, ST" when
 * another state has a town of the same name ("Fayetteville, WV").
 */
export function townKey(t: Town): string {
  return (nameCount.get(t.name.toLowerCase()) ?? 0) > 1 ? `${t.name}, ${t.state}` : t.name;
}

/** "Brevard, NC": how a town is shown in lists. */
export function townLabel(t: Town): string {
  return `${t.name}, ${t.state}`;
}

const byName = new Map<string, Town>();
const add = (key: string, t: Town) => {
  if (!byName.has(key.toLowerCase())) byName.set(key.toLowerCase(), t);
};
// A plain name used in two states finds the default region's town, so values
// saved before regions existed ("Fayetteville" meant the one in NC) keep
// their meaning. Those go in first; then every town in list order.
for (const t of towns.filter((t) => t.region === site.defaultRegionSlug)) add(t.name, t);
for (const t of towns) {
  add(t.name, t);
  add(`${t.name}, ${t.state}`, t);
  if (STATE_NAMES[t.state]) add(`${t.name}, ${STATE_NAMES[t.state]}`, t);
  for (const a of t.aliases ?? []) add(a, t);
}

/**
 * A town picked on a form or saved earlier, by its key, "Name, ST",
 * "Name, State", plain name or an alias. A plain name used in two states
 * means the default region's town, else the first in the list.
 */
export function findTown(name: string | null | undefined): Town | undefined {
  return name ? byName.get(name.trim().replace(/\s+/g, " ").toLowerCase()) : undefined;
}

// Every town a key can mean, for townForArea: a name used in two states
// keeps both, so the area's state or region can choose between them.
const allByName = new Map<string, Town[]>();
const addAll = (key: string, t: Town) => {
  const k = key.toLowerCase();
  const list = allByName.get(k) ?? [];
  if (!list.includes(t)) allByName.set(k, [...list, t]);
};
for (const t of towns) {
  addAll(t.name, t);
  for (const a of t.aliases ?? []) addAll(a, t);
}

/** The state an area names at its end: "Augusta, GA", "Atlanta GA", "Red River Gorge, Kentucky". */
function stateOf(text: string): string | undefined {
  const code = text.match(/(?:,\s*|\s)([A-Z]{2})\.?$/)?.[1];
  if (code && STATE_NAMES[code]) return code;
  const name = text.match(/,\s*([A-Za-z ]+)$/)?.[1]?.trim().toLowerCase();
  return name ? STATE_BY_NAME.get(name) : undefined;
}

/** "Augusta, GA" → "Augusta"; "Fort Collins CO" → "Fort Collins". */
function withoutState(text: string): string {
  return text.replace(/(?:,\s*|\s)[A-Z]{2}\.?$/, "").replace(/,\s*[A-Za-z ]+$/, (m) => (STATE_BY_NAME.has(m.replace(/^,\s*/, "").trim().toLowerCase()) ? "" : m)).trim();
}

/**
 * The town a group's free-text area refers to. "Boone and Blowing Rock"
 * counts as Boone; "Western North Carolina" matches nothing.
 */
export function townForArea(area: string | null | undefined, regionSlug?: string): Town | undefined {
  if (!area) return undefined;
  const text = area.trim().replace(/\s+/g, " ");
  const first = text.split(/\s+and\s+/)[0];
  // A state named in the area must match: "Augusta, GA" is never Augusta,
  // Maine. With no state, the listing's own region chooses between towns
  // of the same name ("Lexington" in the Triangle), else the usual default.
  const state = stateOf(first) ?? stateOf(text);
  for (const key of [text, first, withoutState(first)]) {
    let options = allByName.get(key.toLowerCase()) ?? [];
    if (state) options = options.filter((t) => t.state === state);
    if (!options.length) continue;
    const inRegion = regionSlug ? options.find((t) => t.region === regionSlug) : undefined;
    if (inRegion) return inRegion;
    // A region's listing whose town is in another region is kept only when
    // that town is still near the region ("Lexington" in the Triangle is
    // not Lexington, Massachusetts).
    const home = regionSlug ? regions.find((r) => r.slug === regionSlug) : undefined;
    if (home) options = options.filter((t) => milesBetween(t, home.center) <= home.radiusMiles + 50);
    if (!options.length) return undefined;
    if (state || options.length === 1) return options[0];
    const usual = findTown(key);
    return usual && options.includes(usual) ? usual : options[0];
  }
  return undefined;
}

/** Great-circle distance in miles. */
export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

/** "about 25 miles", rounded so nobody reads town-center distances as exact. */
export function aboutMiles(miles: number): string {
  if (miles < 5) return "nearby";
  const rounded = miles < 50 ? Math.round(miles / 5) * 5 : Math.round(miles / 10) * 10;
  return `about ${rounded} miles`;
}

/**
 * How many places lie within `miles` of `center`; places with no known town
 * never count. The home page's destination counts use this with the same
 * radius as the /events link beside them, so the number matches that page.
 */
export function countWithin(
  center: { lat: number; lng: number },
  places: ({ lat: number; lng: number } | undefined)[],
  miles: number,
): number {
  return places.filter((p) => p && milesBetween(center, p) <= miles).length;
}

/**
 * A 5-digit US zip code typed on a form (FR-BR-12): "28712" or "28712-1234",
 * spaces allowed around it. Anything else is not a zip code.
 */
export function parseZip(input: string | null | undefined): string | undefined {
  return input?.trim().match(/^(\d{5})(?:-\d{4})?$/)?.[1];
}

/**
 * The town a zip code belongs to, from the built-in tables (no outside
 * service): the 5-digit table first, then the first three digits, which
 * cover each region more roughly (the area's nearest listed town).
 */
export function townForZip(zip: string | null | undefined): Town | undefined {
  const parsed = parseZip(zip);
  if (!parsed) return undefined;
  if (Object.hasOwn(zipTowns, parsed)) return findTown(zipTowns[parsed]);
  const prefix = parsed.slice(0, 3);
  return Object.hasOwn(zipPrefixTowns, prefix) ? findTown(zipPrefixTowns[prefix]) : undefined;
}

/**
 * Where a search is centered, from a town select (`near`) and an optional
 * zip code box (`zip`). A zip code wins when given; one we don't know falls
 * back to the town, if any, and comes back as `unknownZip` so the page can
 * say so plainly.
 */
export function resolveLocation(
  near: unknown,
  zip: unknown,
): { town?: Town; zip?: string; unknownZip?: string } {
  const town = typeof near === "string" ? findTown(near) : undefined;
  const typed = typeof zip === "string" ? zip.trim().slice(0, 20) : "";
  if (!typed) return { town };
  const parsed = parseZip(typed);
  const zipTown = townForZip(parsed);
  if (parsed && zipTown) return { town: zipTown, zip: parsed };
  return { town, unknownZip: typed };
}
