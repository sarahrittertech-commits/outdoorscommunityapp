import { towns, type Town } from "@/config/towns";

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
