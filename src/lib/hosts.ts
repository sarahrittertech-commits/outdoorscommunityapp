/**
 * UC-37: an event is run by a group or by a guide, shop or venue. These
 * give the links and words for either, from an event_listings row.
 */
type HostRow = {
  id?: string | null;
  host_kind?: string | null;
  group_slug?: string | null;
  group_name?: string | null;
  business_slug?: string | null;
  business_name?: string | null;
};

export const isGroupEvent = (e: HostRow) => !e.host_kind || e.host_kind === "group";

/** The event's own page: /e/ for a group's event, /h/ for a hosted one. */
export const eventHref = (e: HostRow) => (isGroupEvent(e) ? `/e/${e.id}` : `/h/${e.id}`);

export const hostHref = (e: HostRow) => (isGroupEvent(e) ? `/g/${e.group_slug}` : `/b/${e.business_slug}`);

export const hostName = (e: HostRow) => (isGroupEvent(e) ? e.group_name : e.business_name) ?? "";

export const BUSINESS_KIND_LABEL: Record<string, string> = {
  guide: "guide service",
  shop: "shop",
  venue: "venue",
};

/** "guide service", "shop", "venue", or nothing for a group. */
export const hostKindLabel = (e: HostRow) => (isGroupEvent(e) ? null : (BUSINESS_KIND_LABEL[e.host_kind ?? ""] ?? null));
