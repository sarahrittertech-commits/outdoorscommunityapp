// Everything that makes this deployment *this* board rather than another one.
//
// A copy of the board for a different audience (the women's app, for
// example) changes this file, the region list (src/config/regions.ts, with
// its towns and zip codes), the directory seed migration, the activity
// drawings, the legal pages' wording, colors and logo, and nothing else. See
// docs/cloning.md.
//
// The board covers several regions; everything that differs by region (its
// name, map center, example town and meeting place, home page line, time
// zone) lives in src/config/regions.ts.

export const site = {
  /** Shown in the header, page titles and emails. Lowercase is the wordmark (docs/brand.md). */
  name: "branch outdoors",
  /** Used for search engines and link previews. */
  description:
    "A plain, ad-free board of local outdoor groups: hiking, paddling, cycling, climbing and more. Browse by activity, join a group, show up.",
  /**
   * Slug of the region a visitor sees until they choose one (and who has no
   * home town in another region). Must be a live region in regions.ts.
   */
  defaultRegionSlug: "western-nc",
  /**
   * Time zone for dates that belong to no event: when a post was written, a
   * member joined, a group's next event in a list. Events show in their own
   * time zone, and new events default to their group's region's time zone.
   */
  defaultTimezone: "America/New_York",
  /** Who the board is for, shown on the about and guidelines pages. */
  audience: "Adults (18+) who want to find outdoor groups near them.",
  /** The motto under the wordmark in the footer (Sarah, 12 October 2026). */
  motto: "Find outdoors community without constant scrolling. We want you to get offline and get outside.",
  /** The home page headline, over the line drawing. A newline breaks the line. */
  heroTitle: "find your people.\nfind your outdoors.",
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
  /**
   * UC-33 fill-in-the-blanks (FR-PR-4): a member answers up to 3. The key is
   * what's stored, so the wording can change, but never reuse a key for a
   * different question. Keys are lowercase letters, digits and underscores.
   */
  profilePrompts: [
    { key: "always_wanted", text: "I've always wanted to try" },
    { key: "favorite_place", text: "My favorite place outside is" },
    { key: "trail_snack", text: "My go-to trail snack is" },
    { key: "never_without", text: "I never head out without" },
    { key: "proudest", text: "The outdoor thing I'm proudest of is" },
    { key: "first_adventure", text: "My first outdoor adventure was" },
    { key: "best_season", text: "My favorite season outside is" },
    { key: "show_you", text: "Ask me to show you how to" },
  ] as readonly { key: string; text: string }[],
  /** Whether the create-group form starts on "anyone can join" or "approval". */
  defaultJoinPolicy: "open" as "open" | "approval",
  /** Public contact for the site admin. null hides every contact line until there is a real address. */
  contactEmail: null as string | null,
  /**
   * Whether the board can send email invites (FR-MB-12, FR-MB-13). Off until
   * Resend and a sending domain are set up (ADR-0004); while off, the invite
   * forms are shown disabled and the invite link is the way to invite.
   */
  emailEnabled: false as boolean,
  /** Canonical origin, used for sitemaps, link previews and the links in confirmation and reset emails. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
} as const;

export type SiteConfig = typeof site;
