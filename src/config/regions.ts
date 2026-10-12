// The regions this board covers. Deployment specific (docs/cloning.md).
//
// Mirrors public.regions (supabase/migrations/20261011000001_regions.sql):
// the slugs, names, time zones, centers, radii and hub towns must match the
// database rows. The rest (short name, map zoom, examples, the home page
// line) is wording that only the app needs.
//
// A region is a named area around one or more hub towns. Every group belongs
// to exactly one region, and visitors browse one region at a time; which one
// is decided in lib/regions (resolveRegionSlug), never stored for a visitor.

export type RegionStatus = "live" | "coming_soon";

export type Region = {
  slug: string;
  /** Full name: "Western North Carolina". */
  name: string;
  /** Header and tight spaces: "Western NC". */
  shortName: string;
  /** Two-letter state the region is mostly in. */
  state: string;
  /** Time zone new events in the region default to. */
  timezone: string;
  /** Hub towns, by town key (lib/geo townKey), first is the default *Near you* town. */
  hubs: string[];
  center: { lat: number; lng: number };
  /** Starting zoom of the destinations map when there are no pins. */
  zoom: number;
  radiusMiles: number;
  status: RegionStatus;
  /** A town people will recognize, for form hints ("e.g. Brevard") and the town search. */
  exampleTown: string;
  /** A well-known meeting spot, the example on the event form. */
  exampleMeetingPlace: string;
  /** A zip code in the region, the placeholder in zip code boxes. */
  exampleZip: string;
  /** One or two sentences under the home page headline. */
  heroIntro: string;
};

export const regions: Region[] = [
  {
    slug: "western-nc",
    name: "Western North Carolina",
    shortName: "Western NC",
    state: "NC",
    timezone: "America/New_York",
    hubs: ["Asheville"],
    center: { lat: 35.6, lng: -82.55 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Brevard",
    exampleMeetingPlace: "Hooker Falls parking area",
    exampleZip: "28712",
    heroIntro:
      "Groups, meetups and events for getting outside in Western North Carolina. Join a group, show up, try something new.",
  },
  {
    slug: "front-range",
    name: "Colorado Front Range",
    shortName: "Front Range",
    state: "CO",
    timezone: "America/Denver",
    hubs: ["Denver", "Boulder"],
    center: { lat: 39.87, lng: -105.13 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Boulder",
    exampleMeetingPlace: "Betasso Preserve trailhead",
    exampleZip: "80302",
    heroIntro:
      "Groups, meetups and events for getting outside along the Colorado Front Range, from Fort Collins to Colorado Springs. Join a group, show up, try something new.",
  },
  {
    slug: "triangle",
    name: "Raleigh and the Triangle",
    shortName: "Triangle",
    state: "NC",
    timezone: "America/New_York",
    hubs: ["Raleigh"],
    center: { lat: 35.85, lng: -78.8 },
    zoom: 9,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Durham",
    exampleMeetingPlace: "Umstead State Park, Reedy Creek lot",
    exampleZip: "27701",
    heroIntro:
      "Groups, meetups and events for getting outside in Raleigh, Durham, Chapel Hill and around. Join a group, show up, try something new.",
  },
  {
    slug: "puget-sound",
    name: "Seattle and Bellingham",
    shortName: "Seattle–Bellingham",
    state: "WA",
    timezone: "America/Los_Angeles",
    hubs: ["Seattle", "Bellingham"],
    center: { lat: 48.18, lng: -122.4 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Bellingham",
    exampleMeetingPlace: "Galbraith Mountain, Birch Street lot",
    exampleZip: "98225",
    heroIntro:
      "Groups, meetups and events for getting outside from Seattle to Bellingham and the North Cascades. Join a group, show up, try something new.",
  },
  {
    slug: "new-river-gorge",
    name: "New River Gorge",
    shortName: "New River Gorge",
    state: "WV",
    timezone: "America/New_York",
    hubs: ["Fayetteville, WV"],
    center: { lat: 38.05, lng: -81.1 },
    zoom: 9,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Fayetteville, WV",
    exampleMeetingPlace: "Long Point trailhead",
    exampleZip: "25840",
    heroIntro:
      "Groups, meetups and events for getting outside around the New River Gorge and southern West Virginia. Join a group, show up, try something new.",
  },
  {
    slug: "east-tennessee",
    name: "Knoxville and East Tennessee",
    shortName: "East Tennessee",
    state: "TN",
    timezone: "America/New_York",
    hubs: ["Knoxville"],
    center: { lat: 35.96, lng: -83.92 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Knoxville",
    exampleMeetingPlace: "Baker Creek Preserve lot",
    exampleZip: "37902",
    heroIntro:
      "Groups, meetups and events for getting outside in Knoxville, the Smokies and East Tennessee. Join a group, show up, try something new.",
  },
  {
    slug: "wasatch",
    name: "Salt Lake City and the Wasatch",
    shortName: "Salt Lake–Wasatch",
    state: "UT",
    timezone: "America/Denver",
    hubs: ["Salt Lake City"],
    center: { lat: 40.76, lng: -111.89 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Park City",
    exampleMeetingPlace: "Round Valley trailhead",
    exampleZip: "84101",
    heroIntro:
      "Groups, meetups and events for getting outside in Salt Lake City, Park City and the Wasatch. Join a group, show up, try something new.",
  },
];
