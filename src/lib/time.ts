// Time handling. Events are stored in UTC and always shown in the event's own
// time zone (TR-DATA-3), whatever time zone the viewer's device is in.

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function partsInZone(date: Date, timeZone: string): Parts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const get = (type: string) => Number(formatter.formatToParts(date).find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** Minutes the zone is ahead of UTC at a given instant (e.g. -240 for EDT). */
function offsetMinutes(date: Date, timeZone: string): number {
  const p = partsInZone(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts a wall-clock time in a zone ("2026-10-04T09:00" in America/New_York)
 * to the UTC instant. This is what a <input type="datetime-local"> gives us.
 */
export function zonedLocalToUtc(local: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw new RangeError(`Not a local date-time: ${local}`);
  const [, y, mo, d, h, mi] = match.map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);

  // Two passes settle the offset across a daylight-saving change.
  let guess = wallAsUtc - offsetMinutes(new Date(wallAsUtc), timeZone) * 60000;
  guess = wallAsUtc - offsetMinutes(new Date(guess), timeZone) * 60000;
  return new Date(guess);
}

/** The reverse, for filling an edit form: UTC instant to "YYYY-MM-DDTHH:mm" in the zone. */
export function utcToZonedLocal(iso: string, timeZone: string): string {
  const p = partsInZone(new Date(iso), timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** "Sat, Oct 4, 2026, 9:00 AM – 1:00 PM EDT" */
export function formatEventTime(startsAt: string, endsAt: string, timeZone: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  const zone = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
    .formatToParts(start)
    .find((p) => p.type === "timeZoneName")?.value;

  const sameDay = day.format(start) === day.format(end);
  return sameDay
    ? `${day.format(start)}, ${time.format(start)} – ${time.format(end)} ${zone}`
    : `${day.format(start)}, ${time.format(start)} – ${day.format(end)}, ${time.format(end)} ${zone}`;
}

/** "Sat Oct 4" for listing rows. */
export function formatShortDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" })
    .format(new Date(iso))
    .replace(",", "");
}

/** "Oct 4, 2026" for posts. */
export function formatPostDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );
}
