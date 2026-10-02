// Everything that makes this deployment *this* board rather than another one.
//
// A copy of the board for a different audience or region (the women's app,
// for example) changes this file, the directory seed migration, the activity
// drawings, the legal pages' wording, colors and logo, and nothing else. See
// docs/cloning.md.

export const site = {
  /** Shown in the header, page titles and emails. Lowercase is the wordmark (docs/brand.md). */
  name: "branch outdoors",
  /** One line under the name on the home page. */
  tagline: "A plain, friendly board for finding people to go outside with.",
  /** The region the directory covers, shown above the categories. */
  regionName: "Western North Carolina",
  /** Used for search engines and link previews. */
  description:
    "A plain, ad-free board of local outdoor groups: hiking, paddling, cycling, climbing and more. Browse by activity, join a group, show up.",
  /** Slug of the region in the directory seed that new groups belong to. */
  defaultRegionSlug: "western-nc",
  /** Time zone new events default to. */
  defaultTimezone: "America/New_York",
  /** Who the board is for, shown on the about and guidelines pages. */
  audience: "Adults (18+) who want to find outdoor groups near them.",
  /** The home page headline, over the search box. */
  heroTitle: "Find your people outside.",
  /** One or two sentences under the headline. */
  heroIntro:
    "Groups, meetups and events for getting outside in Western North Carolina. Join a group, show up, try something new.",
  /**
   * Optional image behind the home page band, a path under public/ (e.g.
   * "/hero.svg"). When set it replaces the ridge drawing; keep it dark on the
   * left so the headline stays readable. null keeps the ridges.
   */
  heroImage: null as string | null,
  /** Example searches shown in the home page search box. */
  searchPlaceholder: "waterfall hike, beginner climbing, Brevard…",
  /** Whether the create-group form starts on "anyone can join" or "approval". */
  defaultJoinPolicy: "open" as "open" | "approval",
  /** Public contact for the site admin. */
  contactEmail: "hello@example.com",
  /** Canonical origin, used for sitemaps, link previews and sign-in links. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
} as const;

export type SiteConfig = typeof site;
