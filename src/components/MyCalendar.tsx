import Link from "next/link";

import { ActivityIcon } from "@/brand/ActivityIcon";
import { site } from "@/config/site";
import {
  bucketByDay,
  CALENDAR_SHOWS,
  type CalendarParams,
  type CalendarView,
  type Day,
  dayInZone,
  longDay,
  monthGrid,
  monthTitle,
  queryWindow,
  stepDay,
  viewDays,
  WEEKDAYS,
  weekDays,
  weekTitle,
} from "@/lib/calendar";
import { createClient } from "@/lib/supabase/server";

type Entry = {
  id: string;
  title: string;
  starts_at: string;
  timezone: string;
  status: string;
  category_slug: string | null;
  group_name: string | null;
  going: boolean;
  saved: boolean;
};

type Props = {
  viewerId: string;
  params: CalendarParams;
  /** The home page's own parameters, kept on every calendar link. */
  keep: Record<string, string | undefined>;
  categoryName: Map<string, string>;
};

const MAX_EVENTS = 500;

/**
 * UC-18, FR-AC-9: the signed-in home page's calendar of the events the user
 * is going to and saved. A month on a computer and a week on a phone, unless
 * they pick one; every control is a link or a GET form, so it works without
 * JavaScript. Queries run as the user, so RLS decides what comes back: only
 * their own RSVPs and saves, and only events they can see.
 */
export async function MyCalendar({ viewerId, params, keep, categoryName }: Props) {
  const today = dayInZone(new Date(), site.defaultTimezone);
  const date = params.date ?? today;
  // The default shows both views (CSS picks one by screen width), and the
  // week is always inside the month's grid, so the month's days cover both.
  const days = viewDays(params.view ?? "month", date);
  const { from, to } = queryWindow(days);

  const supabase = await createClient();
  const [{ data: rsvps }, { data: saves }, { data: memberships }] = await Promise.all([
    supabase.from("event_rsvps").select("event_id").eq("user_id", viewerId).eq("status", "going"),
    supabase.from("saved_events").select("event_id").eq("user_id", viewerId),
    supabase.from("group_members").select("groups(id, slug, name)").eq("user_id", viewerId).eq("status", "active"),
  ]);
  const going = new Set((rsvps ?? []).map((r) => r.event_id));
  const saved = new Set((saves ?? []).map((r) => r.event_id));
  const groups = (memberships ?? [])
    .map((m) => m.groups)
    .filter((g): g is NonNullable<typeof g> => Boolean(g))
    .sort((a, b) => a.name.localeCompare(b.name));

  const ids = params.show === "going" ? [...going] : params.show === "saved" ? [...saved] : [...new Set([...going, ...saved])];
  const groupIds = groups.map((g) => g.id);
  const wanted = params.show === "groups" ? groupIds.length > 0 : ids.length > 0;

  let rows: Omit<Entry, "going" | "saved">[] = [];
  let truncated = false;
  if (wanted) {
    let query = supabase
      .from("event_listings")
      .select("id, title, starts_at, timezone, status, category_slug, group_name, group_slug")
      .gte("starts_at", from)
      .lt("starts_at", to);
    query = params.show === "groups" ? query.in("group_id", groupIds) : query.in("id", ids);
    if (params.group) query = query.eq("group_slug", params.group);
    const { data } = await query.order("starts_at").limit(MAX_EVENTS + 1);
    rows = (data ?? [])
      .filter((e) => e.id && e.title && e.starts_at && e.timezone && e.status)
      .map((e) => ({
        id: e.id!,
        title: e.title!,
        starts_at: e.starts_at!,
        timezone: e.timezone!,
        status: e.status!,
        category_slug: e.category_slug,
        group_name: e.group_name,
      }));
    truncated = rows.length > MAX_EVENTS;
    rows = rows.slice(0, MAX_EVENTS);
  }
  const byDay = bucketByDay(rows.map((e) => ({ ...e, going: going.has(e.id), saved: saved.has(e.id) })));

  const href = (next: Partial<{ cal: CalendarView | null; date: Day | null }>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(keep)) if (v) q.set(k, v);
    const cal = "cal" in next ? next.cal : params.view;
    const d = "date" in next ? next.date : params.date;
    if (cal) q.set("cal", cal);
    if (d) q.set("date", d);
    if (params.show !== "all") q.set("show", params.show);
    if (params.group) q.set("group", params.group);
    return `/?${q}#calendar`;
  };

  const shared = { date, today, byDay, href, categoryName };

  return (
    <section id="calendar" aria-labelledby="calendar-title" className="border-b border-rule py-10">
      <h2 id="calendar-title" className="mt-0">
        My calendar
      </h2>
      <p className="m-0 mt-1 text-subtle">Events you&rsquo;re going to and events you saved. Only you can see this.</p>

      <form action="/#calendar" className="cal-filters">
        <div>
          <label htmlFor="cal-show">Show</label>
          <select id="cal-show" name="show" defaultValue={params.show}>
            {Object.entries(CALENDAR_SHOWS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cal-group">Group</label>
          <select id="cal-group" name="group" defaultValue={params.group ?? ""}>
            <option value="">All my groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        {params.view && <input type="hidden" name="cal" value={params.view} />}
        {params.date && <input type="hidden" name="date" value={params.date} />}
        {Object.entries(keep).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
        <button className="button">Show</button>
      </form>

      {truncated && <p className="text-sm text-muted">Showing the first {MAX_EVENTS} events. Pick a group to see the rest.</p>}
      {!wanted && (
        <p className="text-muted">
          {params.show === "groups" ? (
            <>
              You haven&rsquo;t joined any groups yet. <Link href="/browse">Browse the board</Link>.
            </>
          ) : (
            <>
              Nothing here yet. RSVP to an event or save it for later and it shows up on your calendar. <Link href="/events">See every event</Link>.
            </>
          )}
        </p>
      )}

      {params.view ? (
        <CalendarBlock {...shared} shown={params.view} idPrefix="cal" />
      ) : (
        <>
          <div className="hidden md:block">
            <CalendarBlock {...shared} shown="month" idPrefix="cal-m" />
          </div>
          <div className="md:hidden">
            <CalendarBlock {...shared} shown="week" idPrefix="cal-w" />
          </div>
        </>
      )}
    </section>
  );
}

type BlockProps = {
  shown: CalendarView;
  date: Day;
  today: Day;
  byDay: Map<Day, Entry[]>;
  href: (next: Partial<{ cal: CalendarView | null; date: Day | null }>) => string;
  categoryName: Map<string, string>;
  idPrefix: string;
};

function CalendarBlock({ shown, date, today, byDay, href, categoryName, idPrefix }: BlockProps) {
  const title = shown === "month" ? monthTitle(date) : weekTitle(date);
  const unit = shown === "month" ? "month" : "week";
  const titleId = `${idPrefix}-title`;

  return (
    <div className="cal-block">
      <div className="cal-toolbar">
        <h3 id={titleId} className="m-0">
          {title}
        </h3>
        <nav aria-label={`Calendar: ${unit}s`} className="cal-nav">
          <Link href={href({ cal: shown, date: stepDay(shown, date, -1) })} prefetch={false}>
            ← Previous<span className="sr-only"> {unit}</span>
          </Link>
          <Link href={href({ cal: shown, date: null })} prefetch={false}>
            Today
          </Link>
          <Link href={href({ cal: shown, date: stepDay(shown, date, 1) })} prefetch={false}>
            Next<span className="sr-only"> {unit}</span> →
          </Link>
        </nav>
        <ul className="chip-row cal-switch" aria-label="Calendar view">
          {(["week", "month"] as const).map((v) => (
            <li key={v}>
              <Link href={href({ cal: v })} prefetch={false} className={v === shown ? "chip chip-on" : "chip"} aria-current={v === shown ? "true" : undefined}>
                {v === "week" ? "Week" : "Month"}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {shown === "month" ? (
        <>
          <MonthTable date={date} today={today} byDay={byDay} categoryName={categoryName} titleId={titleId} />
          {/* A seven-column table is too narrow on a phone: there, the month is a list of its busy days. */}
          <div className="md:hidden">
            <DayList
              days={monthGrid(date)
                .flat()
                .filter((g) => g.inMonth && byDay.has(g.day))
                .map((g) => g.day)}
              today={today}
              byDay={byDay}
              categoryName={categoryName}
              empty={`Nothing on your calendar in ${monthTitle(date)}.`}
            />
          </div>
        </>
      ) : (
        <DayList days={weekDays(date)} today={today} byDay={byDay} categoryName={categoryName} />
      )}
    </div>
  );
}

function MonthTable({ date, today, byDay, categoryName, titleId }: { date: Day; today: Day; byDay: Map<Day, Entry[]>; categoryName: Map<string, string>; titleId: string }) {
  return (
    <table className="cal-month hidden md:table" aria-labelledby={titleId}>
      <thead>
        <tr>
          {WEEKDAYS.map(([short, long]) => (
            <th key={short} scope="col">
              <abbr title={long}>{short}</abbr>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthGrid(date).map((week) => (
          <tr key={week[0].day}>
            {week.map(({ day, inMonth }) => (
              <td key={day} className={inMonth ? undefined : "cal-other"} aria-current={day === today ? "date" : undefined}>
                <span className="cal-daynum">
                  <span aria-hidden="true">{Number(day.slice(8))}</span>
                  <span className="sr-only">{longDay(day)}</span>
                </span>
                <Entries entries={byDay.get(day)} categoryName={categoryName} compact />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DayList({ days, today, byDay, categoryName, empty }: { days: Day[]; today: Day; byDay: Map<Day, Entry[]>; categoryName: Map<string, string>; empty?: string }) {
  if (!days.length) return <p className="text-muted">{empty}</p>;
  return (
    <ol className="cal-days">
      {days.map((day) => (
        <li key={day} aria-current={day === today ? "date" : undefined}>
          <h4 className="m-0">
            {longDay(day)}
            {day === today && <span className="text-sm font-normal text-muted"> · today</span>}
          </h4>
          {byDay.get(day)?.length ? <Entries entries={byDay.get(day)} categoryName={categoryName} /> : <p className="m-0 text-sm text-muted">Nothing planned.</p>}
        </li>
      ))}
    </ol>
  );
}

function Entries({ entries, categoryName, compact }: { entries?: Entry[]; categoryName: Map<string, string>; compact?: boolean }) {
  if (!entries?.length) return null;
  return (
    <ul className={compact ? "cal-entries cal-compact" : "cal-entries"}>
      {entries.map((e) => (
        <li key={e.id}>
          <span className="cal-time">{timeOf(e)}</span>
          {e.category_slug && (
            <span className="cal-icon">
              <ActivityIcon slug={e.category_slug} className="h-4 w-4" />
              <span className="sr-only">{categoryName.get(e.category_slug) ?? e.category_slug}:</span>
            </span>
          )}
          <Link href={`/e/${e.id}`} prefetch={false} className={e.status === "cancelled" ? "line-through" : undefined}>
            {e.title}
          </Link>
          <span className="cal-meta">
            {e.status === "cancelled" && " · cancelled"}
            {e.going ? " · going" : e.saved ? " · saved" : ""}
            {!compact && e.group_name && ` · ${e.group_name}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "9:00 AM", in the event's own zone, naming the zone when it isn't the board's. */
function timeOf(e: Entry): string {
  const time = new Intl.DateTimeFormat("en-US", { timeZone: e.timezone, hour: "numeric", minute: "2-digit" }).format(new Date(e.starts_at));
  if (e.timezone === site.defaultTimezone) return time;
  const zone = new Intl.DateTimeFormat("en-US", { timeZone: e.timezone, timeZoneName: "short" })
    .formatToParts(new Date(e.starts_at))
    .find((p) => p.type === "timeZoneName")?.value;
  return zone ? `${time} ${zone}` : time;
}
