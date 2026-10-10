import { towns, type Town } from "@/config/towns";
import { zipTowns } from "@/config/zips";

const byName = new Map<string, Town>();
for (const t of towns) {
  byName.set(t.name.toLowerCase(), t);
  for (const a of t.aliases ?? []) byName.set(a.toLowerCase(), t);
}

/** A town picked on a form, by exact name. */
export function findTown(name: string | null | undefined): Town | undefined {
  return name ? byName.get(name.trim().toLowerCase()) : undefined;
}

/**
 * The town a group's free-text area refers to. "Boone and Blowing Rock"
 * counts as Boone; "Western North Carolina" matches nothing.
 */
export function townForArea(area: string | null | undefined): Town | undefined {
  if (!area) return undefined;
  return findTown(area) ?? findTown(area.split(/\s+and\s+|,/)[0]);
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

/** The town a zip code belongs to, from the built-in table (no outside service). */
export function townForZip(zip: string | null | undefined): Town | undefined {
  const parsed = parseZip(zip);
  return parsed && Object.hasOwn(zipTowns, parsed) ? findTown(zipTowns[parsed]) : undefined;
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
