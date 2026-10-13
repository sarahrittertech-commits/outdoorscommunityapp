// Big regions (UC-40, ADR-0012): the groupings the board's local areas
// (config/regions.ts) sit in, the way travelers and ski passes group the
// country. Deployment specific (docs/cloning.md). Mirrors
// public.region_groups (supabase/migrations/20261013000001_region_groups.sql).
//
// On the site the big ones are "regions" and each entry of config/regions.ts
// is an "area". A big region with no live area shows as coming soon.

export type RegionGroup = {
  slug: string;
  /** "Southeast" */
  name: string;
  /** One line on /regions: what the region is. */
  description: string;
};

export const regionGroups: RegionGroup[] = [
  { slug: "southeast", name: "Southeast", description: "The Southern Appalachians and the Piedmont." },
  { slug: "mid-atlantic", name: "Mid-Atlantic", description: "The Virginias, Maryland and Pennsylvania." },
  { slug: "northeast", name: "Northeast", description: "New England and New York." },
  { slug: "midwest", name: "Midwest and Great Lakes", description: "The Northwoods, the Great Lakes and the Driftless." },
  { slug: "rockies", name: "Rockies", description: "Colorado, Utah's Wasatch, Montana, Wyoming and Idaho." },
  { slug: "southwest", name: "Southwest", description: "Arizona, New Mexico and the canyon country." },
  { slug: "far-west", name: "Far West and Sierra", description: "Lake Tahoe, the Sierra Nevada and California." },
  { slug: "pacific-northwest", name: "Pacific Northwest", description: "Washington and Oregon." },
];
