// "Add to calendar" files (FR-EV-7). Times are written in UTC, which every
// calendar app converts to the reader's own zone correctly.

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  url: string;
};

function icsTime(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/**
 * Lines longer than 75 octets are folded, as the format requires.
 *
 * Octets, not characters (UT-7): `length` counts UTF-16 units, so an accented
 * letter or an emoji in a title folded late, and a cut at a fixed index could
 * land between the two halves of an emoji and emit invalid UTF-8 that
 * calendar apps reject.
 */
function fold(line: string): string {
  const chunks: string[] = [];
  let rest = line;
  // 74 leaves room for the leading space that marks a continuation line.
  while (byteLength(rest) > 74) {
    const cut = cutAt(rest, 74);
    chunks.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** The largest number of characters whose UTF-8 form fits in `max` octets. */
function cutAt(value: string, max: number): number {
  let bytes = 0;
  let i = 0;
  for (const character of value) {
    const size = byteLength(character);
    if (bytes + size > max) break;
    bytes += size;
    // Iterating a string yields whole code points, so a surrogate pair moves
    // the index by two and is never split.
    i += character.length;
  }
  // A single character wider than the limit still has to go somewhere.
  return i === 0 ? [...value][0].length : i;
}

export function buildIcs(event: CalendarEvent, host: string, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${host}//Community Board//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@${host}`,
    `DTSTAMP:${icsTime(now.toISOString())}`,
    `DTSTART:${icsTime(event.startsAt)}`,
    `DTEND:${icsTime(event.endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(`${event.description}\n\n${event.url}`.trim())}`,
    `LOCATION:${escapeText(event.location)}`,
    `URL:${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
