// Everything that makes this deployment *this* board rather than another one.
//
// A copy of the board for a different audience or region (the women's app,
// for example) changes this file, the directory seed migration, the activity
// drawings, the legal pages' wording, colors and logo, and nothing else. See
// docs/cloning.md.

const regionName = "Western North Carolina";

export const site = {
  /** Shown in the header, page titles and emails. Lowercase is the wordmark (docs/brand.md). */
  name: "branch outdoors",
  /** The region the directory covers, shown above the categories. */
  regionName,
  /** Used for search engines and link previews. */
  description:
    "A plain, ad-free board of local outdoor groups: hiking, paddling, cycling, climbing and more. Browse by activity, join a group, show up.",
  /** Slug of the region in the directory seed that new groups belong to. */
  defaultRegionSlug: "western-nc",
  /** Time zone new events default to. */
  defaultTimezone: "America/New_York",
  /** Who the board is for, shown on the about and guidelines pages. */
  audience: "Adults (18+) who want to find outdoor groups near them.",
  /** The home page headline, over the line drawing. A newline breaks the line. */
  heroTitle: "find your people.\nfind your outdoors.",
  /** One or two sentences under the headline. */
  heroIntro: `Groups, meetups and events for getting outside in ${regionName}. Join a group, show up, try something new.`,
  /**
   * Map tiles for the destinations map (ADR-0007). OpenStreetMap's own tiles
   * are fine for a small board; move to a tile provider's free tier before
   * traffic grows. The CSP allows images from this host only.
   */
  mapTiles: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    host: "https://tile.openstreetmap.org",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  /** Where the map starts when there is nothing to show. */
  mapCenter: { lat: 35.6, lng: -82.55 },
  /** Example searches shown in the home page search box. */
  searchPlaceholder: "waterfall hike, beginner climbing, Brevard…",
  /** A town people will recognize, used in form hints ("e.g. Brevard") and the town search. */
  exampleArea: "Brevard",
  /** A well-known meeting spot, used as the example on the event form. */
  exampleMeetingPlace: "Hooker Falls parking area",
  /** Whether the create-group form starts on "anyone can join" or "approval". */
  defaultJoinPolicy: "open" as "open" | "approval",
  /** Public contact for the site admin. null hides every contact line until there is a real address. */
  contactEmail: null as string | null,
  /** Canonical origin, used for sitemaps, link previews and sign-in links. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
} as const;

export type SiteConfig = typeof site;
