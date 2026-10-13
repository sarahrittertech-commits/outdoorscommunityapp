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
  /** The big region the area belongs to (config/regionGroups.ts, UC-40). */
  group: string;
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
    group: "southeast",
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
    group: "rockies",
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
    group: "southeast",
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
    group: "pacific-northwest",
    name: "Seattle, Bellingham and Olympia",
    shortName: "Puget Sound",
    state: "WA",
    timezone: "America/Los_Angeles",
    hubs: ["Seattle", "Bellingham", "Olympia"],
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
    group: "mid-atlantic",
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
    group: "southeast",
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
    group: "rockies",
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
  {
    slug: "reno-tahoe",
    group: "far-west",
    name: "Reno and Lake Tahoe",
    shortName: "Reno–Tahoe",
    state: "NV",
    timezone: "America/Los_Angeles",
    hubs: ["Reno"],
    center: { lat: 39.4, lng: -119.95 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Truckee",
    exampleMeetingPlace: "Hunter Creek trailhead",
    exampleZip: "89501",
    heroIntro:
      "Groups, meetups and events for getting outside in Reno, Truckee and around Lake Tahoe. Join a group, show up, try something new.",
  },
  {
    slug: "sedona-flagstaff",
    group: "southwest",
    name: "Sedona and Flagstaff",
    shortName: "Sedona–Flagstaff",
    state: "AZ",
    timezone: "America/Phoenix",
    hubs: ["Sedona", "Flagstaff"],
    center: { lat: 35.0, lng: -111.75 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Cottonwood",
    exampleMeetingPlace: "Posse Grounds Park",
    exampleZip: "86336",
    heroIntro:
      "Groups, meetups and events for getting outside in Sedona, Flagstaff and the Verde Valley. Join a group, show up, try something new.",
  },
  {
    slug: "upstate-sc",
    group: "southeast",
    name: "Greenville and the Upstate",
    shortName: "Greenville–Upstate",
    state: "SC",
    timezone: "America/New_York",
    hubs: ["Greenville"],
    center: { lat: 34.85, lng: -82.4 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Travelers Rest",
    exampleMeetingPlace: "Swamp Rabbit Trail at Trailblazer Park",
    exampleZip: "29690",
    heroIntro:
      "Groups, meetups and events for getting outside in Greenville and Upstate South Carolina. Join a group, show up, try something new.",
  },
  {
    slug: "durango-san-juans",
    group: "rockies",
    name: "Durango and the San Juans",
    shortName: "Durango–San Juans",
    state: "CO",
    timezone: "America/Denver",
    hubs: ["Durango"],
    center: { lat: 37.27, lng: -107.88 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Bayfield",
    exampleMeetingPlace: "Animas River Trail at Santa Rita Park",
    exampleZip: "81122",
    heroIntro:
      "Groups, meetups and events for getting outside in Durango, the San Juan Mountains and the Four Corners. Join a group, show up, try something new.",
  },
  {
    slug: "charlotte",
    group: "southeast",
    name: "Charlotte and Lake Norman",
    shortName: "Charlotte",
    state: "NC",
    timezone: "America/New_York",
    hubs: ["Charlotte"],
    center: { lat: 35.23, lng: -80.84 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Huntersville",
    exampleMeetingPlace: "U.S. National Whitewater Center",
    exampleZip: "28078",
    heroIntro:
      "Groups, meetups and events for getting outside in Charlotte, Lake Norman and the Piedmont. Join a group, show up, try something new.",
  },
  {
    slug: "northern-vermont",
    group: "northeast",
    name: "Burlington and Northern Vermont",
    shortName: "Burlington–Vermont",
    state: "VT",
    timezone: "America/New_York",
    hubs: ["Burlington, VT"],
    center: { lat: 44.48, lng: -73.21 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Waterbury",
    exampleMeetingPlace: "Burlington Bike Path at Waterfront Park",
    exampleZip: "05401",
    heroIntro:
      "Groups, meetups and events for getting outside in Burlington, the Champlain Valley and the Green Mountains. Join a group, show up, try something new.",
  },
  {
    slug: "greater-boston",
    group: "northeast",
    name: "Greater Boston",
    shortName: "Boston",
    state: "MA",
    timezone: "America/New_York",
    hubs: ["Boston"],
    center: { lat: 42.36, lng: -71.06 },
    zoom: 9,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Cambridge",
    exampleMeetingPlace: "Blue Hills Reservation, Houghton's Pond",
    exampleZip: "02139",
    heroIntro:
      "Groups, meetups and events for getting outside in Boston and eastern New England. Join a group, show up, try something new.",
  },
  {
    slug: "portland-gorge",
    group: "pacific-northwest",
    name: "Portland and the Columbia Gorge",
    shortName: "Portland–Gorge",
    state: "OR",
    timezone: "America/Los_Angeles",
    hubs: ["Portland, OR"],
    center: { lat: 45.52, lng: -122.68 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Hood River",
    exampleMeetingPlace: "Multnomah Falls lodge",
    exampleZip: "97214",
    heroIntro:
      "Groups, meetups and events for getting outside in Portland, the Columbia River Gorge and Mount Hood. Join a group, show up, try something new.",
  },
  {
    slug: "central-oregon",
    group: "pacific-northwest",
    name: "Bend and Central Oregon",
    shortName: "Bend",
    state: "OR",
    timezone: "America/Los_Angeles",
    hubs: ["Bend"],
    center: { lat: 44.06, lng: -121.31 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Sisters",
    exampleMeetingPlace: "Phil's Trailhead",
    exampleZip: "97702",
    heroIntro:
      "Groups, meetups and events for getting outside in Bend, Sisters, Smith Rock and the Cascade Lakes. Join a group, show up, try something new.",
  },
  {
    slug: "bay-area",
    group: "far-west",
    name: "San Francisco Bay Area",
    shortName: "Bay Area",
    state: "CA",
    timezone: "America/Los_Angeles",
    hubs: ["San Francisco", "Oakland"],
    center: { lat: 37.77, lng: -122.3 },
    zoom: 9,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Berkeley",
    exampleMeetingPlace: "Tilden Regional Park, Inspiration Point",
    exampleZip: "94709",
    heroIntro:
      "Groups, meetups and events for getting outside around San Francisco, the East Bay, Marin and the Peninsula. Join a group, show up, try something new.",
  },
  {
    slug: "los-angeles",
    group: "far-west",
    name: "Los Angeles and Santa Barbara",
    shortName: "Los Angeles",
    state: "CA",
    timezone: "America/Los_Angeles",
    hubs: ["Los Angeles", "Santa Barbara"],
    center: { lat: 34.15, lng: -118.6 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Pasadena",
    exampleMeetingPlace: "Eaton Canyon Nature Center",
    exampleZip: "91105",
    heroIntro:
      "Groups, meetups and events for getting outside from Los Angeles to Santa Barbara, in the San Gabriels and the Santa Monica Mountains. Join a group, show up, try something new.",
  },
  {
    slug: "san-diego",
    group: "far-west",
    name: "San Diego",
    shortName: "San Diego",
    state: "CA",
    timezone: "America/Los_Angeles",
    hubs: ["San Diego"],
    center: { lat: 32.8, lng: -117.1 },
    zoom: 9,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Encinitas",
    exampleMeetingPlace: "Mission Trails Regional Park visitor center",
    exampleZip: "92104",
    heroIntro:
      "Groups, meetups and events for getting outside in San Diego, from the coast to the Laguna and Cuyamaca mountains. Join a group, show up, try something new.",
  },
  {
    slug: "roanoke-nrv",
    group: "mid-atlantic",
    name: "Roanoke and the New River Valley",
    shortName: "Roanoke–NRV",
    state: "VA",
    timezone: "America/New_York",
    hubs: ["Roanoke", "Blacksburg"],
    center: { lat: 37.25, lng: -80.2 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Blacksburg",
    exampleMeetingPlace: "Carvins Cove, Bennett Springs lot",
    exampleZip: "24060",
    heroIntro:
      "Groups, meetups and events for getting outside in Roanoke, Blacksburg and the New River Valley, along the Blue Ridge Parkway and the Appalachian Trail. Join a group, show up, try something new.",
  },
  {
    slug: "shenandoah",
    group: "mid-atlantic",
    name: "Harrisonburg and the Shenandoah Valley",
    shortName: "Shenandoah",
    state: "VA",
    timezone: "America/New_York",
    hubs: ["Harrisonburg", "Charlottesville"],
    center: { lat: 38.3, lng: -78.85 },
    zoom: 8,
    radiusMiles: 100,
    status: "live",
    exampleTown: "Staunton",
    exampleMeetingPlace: "Shenandoah National Park, Swift Run Gap entrance",
    exampleZip: "22801",
    heroIntro:
      "Groups, meetups and events for getting outside in Harrisonburg, Charlottesville and the Shenandoah Valley, from Shenandoah National Park to the George Washington National Forest. Join a group, show up, try something new.",
  },
];
