// Pure helpers for the feed reader (scripts/research/feeds/read.mjs).
// No network here, so they can be unit-tested.

/** Great-circle distance in miles. */
export function miles(lat1, lng1, lat2, lng2) {
  const r = (d) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 2 * 3959 * Math.asin(Math.sqrt(a));
}

/** The host (region) nearest to a point, if within maxMiles. */
export function nearestHost(hosts, lat, lng, maxMiles = 100) {
  let best = null;
  for (const h of hosts) {
    const d = miles(lat, lng, h.center[0], h.center[1]);
    if (d <= maxMiles && (!best || d < best.d)) best = { host: h, d };
  }
  return best?.host ?? null;
}

const decode = (s) =>
  String(s ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#039;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/**
 * Board-shaped events from a Localist /api/2/events page, grouped by host.
 * Keeps only the department's events, timed (not all-day), in the future,
 * near a host. Title notes "register" and "free" when the feed says so.
 */
export function localistEvents(page, feed, now = new Date()) {
  const byHost = new Map();
  for (const item of page?.events ?? []) {
    const e = item.event ?? {};
    if (!(e.departments ?? []).some((d) => String(d.name).includes(feed.department))) continue;
    const lat = Number(e.geo?.latitude);
    const lng = Number(e.geo?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const host = nearestHost(feed.hosts, lat, lng);
    if (!host || typeof e.localist_url !== "string") continue;
    for (const i of e.event_instances ?? []) {
      const ins = i.event_instance ?? {};
      if (ins.all_day || !ins.start || new Date(ins.start) <= now) continue;
      const notes = [];
      if (e.has_register) notes.push("register");
      if (e.free) notes.push("free");
      else if (e.ticket_cost) notes.push(String(e.ticket_cost).trim().slice(0, 20));
      const base = decode(e.title);
      const title = notes.length ? `${base} (${notes.join(", ")})` : base;
      const park = decode(e.location_name);
      const city = decode(e.geo?.city);
      const location = city && !park.includes(city) ? `${park}, ${city}` : park;
      if (title.length < 3 || location.length < 2) continue;
      const event = {
        title: title.slice(0, 120),
        starts_at: ins.start,
        ...(ins.end && ins.end > ins.start ? { ends_at: ins.end } : {}),
        timezone: feed.timezone,
        location_name: location.slice(0, 200),
        source_url: e.localist_url,
      };
      if (!byHost.has(host.name)) byHost.set(host.name, { host, events: [] });
      byHost.get(host.name).events.push(event);
    }
  }
  return byHost;
}

/** Split a list into batches (the intake takes at most 50 events per call). */
export function batches(list, size = 40) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
