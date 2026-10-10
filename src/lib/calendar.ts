// The calendar on the signed-in home page (UC-18, FR-AC-9). Pure date logic,
// no database and no React, so it can be tested on its own.
//
// A "day" here is a civil date ("2026-10-09") with no time zone. Each event
// is placed on the day it starts *in its own time zone* (TR-DATA-3), so an
// 11 pm Pacific ride is on Friday even though it is Saturday in UTC.

export type Day = string; // "YYYY-MM-DD"
export type CalendarView = "week" | "month";
export type CalendarShow = "all" | "going" | "saved" | "groups";

export const CALENDAR_SHOWS: Record<CalendarShow, string> = {
  all: "Going and saved",
  going: "Going only",
  saved: "Saved only",
  groups: "Everything from my groups",
};

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

const pad = (n: number) => String(n).padStart(2, "0");

function toUtc(day: Day): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date: Date): Day {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** A real calendar date in a sane range, or null ("2026-02-30" is null). */
export function parseDay(value: string | undefined): Day | null {
  const match = value ? DAY_RE.exec(value) : null;
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  if (y < MIN_YEAR || y > MAX_YEAR) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? (value as Day) : null;
}

export function addDays(day: Day, n: number): Day {
  const date = toUtc(day);
  date.setUTCDate(date.getUTCDate() + n);
  return fromUtc(date);
}

/** The same day of the month n months on, clamped (Jan 31 + 1 month = Feb 28). */
export function addMonths(day: Day, n: number): Day {
  const [y, m, d] = day.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return fromUtc(first);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(day: Day): number {
  return toUtc(day).getUTCDay();
}

/** The seven days of the week (Sunday first) that contains this day. */
export function weekDays(day: Day): Day[] {
  const start = addDays(day, -weekday(day));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export type GridDay = { day: Day; inMonth: boolean };

/**
 * The month as whole weeks, Sunday first: four to six rows of seven, with
 * the days from the months either side marked inMonth: false.
 */
export function monthGrid(day: Day): GridDay[][] {
  const month = day.slice(0, 7);
  const first = `${month}-01` as Day;
  let cursor = addDays(first, -weekday(first));
  const weeks: GridDay[][] = [];
  do {
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(cursor, i);
      return { day: d, inMonth: d.startsWith(month) };
    });
    weeks.push(week);
    cursor = addDays(cursor, 7);
  } while (cursor.startsWith(month));
  return weeks;
}

/** The days a view shows, first to last. */
export function viewDays(view: CalendarView, day: Day): Day[] {
  return view === "week" ? weekDays(day) : monthGrid(day).flat().map((g) => g.day);
}

/** Where the previous and next links go. */
export function stepDay(view: CalendarView, day: Day, direction: -1 | 1): Day {
  return view === "week" ? addDays(day, 7 * direction) : addMonths(`${day.slice(0, 7)}-01`, direction);
}

/**
 * UTC instants wide enough to catch every event that starts on any of these
 * days in any time zone (UTC-12 to UTC+14). The page then places each event
 * by its own zone and drops any that fall outside.
 */
export function queryWindow(days: Day[]): { from: string; to: string } {
  const first = toUtc(days[0]).getTime();
  const afterLast = toUtc(addDays(days[days.length - 1], 1)).getTime();
  const hour = 60 * 60 * 1000;
  return { from: new Date(first - 14 * hour).toISOString(), to: new Date(afterLast + 12 * hour).toISOString() };
}

/** The civil date an instant falls on in a time zone. */
export function dayInZone(instant: string | Date, timeZone: string): Day {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    typeof instant === "string" ? new Date(instant) : instant,
  );
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Events grouped by the day they start in their own zone, each day in start order. */
export function bucketByDay<E extends { starts_at: string; timezone: string }>(events: E[]): Map<Day, E[]> {
  const byDay = new Map<Day, E[]>();
  const sorted = [...events].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  for (const e of sorted) {
    const key = dayInZone(e.starts_at, e.timezone);
    const list = byDay.get(key);
    if (list) list.push(e);
    else byDay.set(key, [e]);
  }
  return byDay;
}

const label = (day: Day, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(toUtc(day));

/** "Thursday, October 9" */
export const longDay = (day: Day) => label(day, { weekday: "long", month: "long", day: "numeric" });
/** "October 2026" */
export const monthTitle = (day: Day) => label(day, { month: "long", year: "numeric" });
/** "Oct 5 – 11, 2026", or "Sep 28 – Oct 4, 2026" across months */
export function weekTitle(day: Day): string {
  const days = weekDays(day);
  const first = days[0];
  const last = days[6];
  const end = first.slice(0, 7) === last.slice(0, 7) ? label(last, { day: "numeric" }) : label(last, { month: "short", day: "numeric" });
  const startYear = first.slice(0, 4) === last.slice(0, 4) ? "" : `, ${first.slice(0, 4)}`;
  return `${label(first, { month: "short", day: "numeric" })}${startYear} – ${end}, ${last.slice(0, 4)}`;
}

export const WEEKDAYS = [
  ["Sun", "Sunday"],
  ["Mon", "Monday"],
  ["Tue", "Tuesday"],
  ["Wed", "Wednesday"],
  ["Thu", "Thursday"],
  ["Fri", "Friday"],
  ["Sat", "Saturday"],
] as const;

export type CalendarParams = { view: CalendarView | null; date: Day | null; show: CalendarShow; group: string | null };

/**
 * The calendar's GET parameters, checked. Anything unknown falls back to the
 * default: view null means "month on a computer, week on a phone".
 */
export function parseCalendarParams(get: (key: string) => string | undefined): CalendarParams {
  const view = get("cal");
  const show = get("show");
  const group = get("group");
  return {
    view: view === "week" || view === "month" ? view : null,
    date: parseDay(get("date")),
    show: show && Object.hasOwn(CALENDAR_SHOWS, show) ? (show as CalendarShow) : "all",
    group: group && /^[a-z0-9-]{1,80}$/.test(group) ? group : null,
  };
}
