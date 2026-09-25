// Everything that makes this deployment *this* board rather than another one.
//
// A copy of the board for a different audience or region (the women's app,
// for example) changes this file, the directory seed migration and the
// legal pages' wording, and nothing else. See docs/cloning.md.

export const site = {
  /** Shown in the header, page titles and emails. */
  name: "Outdoors Community Board",
  /** One line under the name on the home page. */
  tagline: "Find people to get outside with in Western North Carolina.",
  /** Used for search engines and link previews. */
  description:
    "A plain, ad-free board of local outdoor groups: hiking, paddling, cycling, climbing and more. Browse by activity, join a group, show up.",
  /** Slug of the region in the directory seed that new groups belong to. */
  defaultRegionSlug: "western-nc",
  /** Time zone new events default to. */
  defaultTimezone: "America/New_York",
  /** Who the board is for, shown on the about and guidelines pages. */
  audience: "Adults (18+) who want to find outdoor groups near them.",
  /** Public contact for the site admin. */
  contactEmail: "hello@example.com",
  /** Canonical origin, used for sitemaps, link previews and sign-in links. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export type SiteConfig = typeof site;
