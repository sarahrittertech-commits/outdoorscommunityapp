// Event sources (UC-39, FR-ES-1): the kinds of page a host posts dates on,
// and what the site admin sees for each.

export const SOURCE_KINDS = ["own_page", "calendar_feed", "signup_page", "meetup", "program_calendar"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  own_page: "own page",
  calendar_feed: "calendar feed",
  signup_page: "sign-up page",
  meetup: "Meetup group",
  program_calendar: "park or city programs",
};

export const SOURCE_STATUS_LABEL: Record<string, string> = {
  active: "active",
  quiet: "quiet (nothing for 12 weeks)",
  broken: "broken (3 failed reads)",
  retired: "retired",
};
