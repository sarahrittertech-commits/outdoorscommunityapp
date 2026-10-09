import "server-only";

import type { LoadedGroup } from "./groups";

/**
 * An archived group's own events, shaped like event_listings rows.
 *
 * event_listings holds only active groups' events, so archived groups leave
 * the home page, Events, search and the sitemap (FR-GR-6). An archived group
 * stays viewable, though, so its own page and past-events page read its
 * events from the events table here instead.
 */
export async function archivedGroupEvents(
  supabase: LoadedGroup["supabase"],
  group: LoadedGroup["group"],
  { upcoming, from, to }: { upcoming: boolean; from: number; to: number },
) {
  const now = new Date().toISOString();
  const query = supabase
    .from("events")
    .select("id, title, starts_at, timezone, location_name, status, is_paid, takes_rsvps", { count: "exact" })
    .eq("group_id", group.id);
  const { data, count } = await (upcoming ? query.gt("ends_at", now) : query.lte("ends_at", now))
    .order("starts_at", { ascending: upcoming })
    .range(from, to);

  const events = await Promise.all(
    (data ?? []).map(async (e) => {
      const { data: going } = await supabase.rpc("event_going_count", { p_event_id: e.id });
      return {
        ...e,
        group_name: group.name,
        group_slug: group.slug,
        is_unclaimed: group.is_unclaimed,
        going_count: going ?? 0,
      };
    }),
  );
  return { events, count: count ?? 0 };
}
