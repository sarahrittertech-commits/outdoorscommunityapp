import type { Metadata } from "next";
import Link from "next/link";

import { cancelEvent, rsvp } from "@/app/actions/events";
import { Notice } from "@/components/Notice";
import { PlainText } from "@/components/PlainText";
import { site } from "@/config/site";
import { loadEvent } from "@/lib/events";
import { loadGroup } from "@/lib/groups";
import { formatEventTime } from "@/lib/time";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { event, group } = await loadEvent((await params).id);
  const when = formatEventTime(event.starts_at, event.ends_at, event.timezone);
  return {
    title: event.title,
    description: `${when} · ${event.location_name} · ${group.name}`,
    openGraph: { title: event.title, description: `${when} · ${group.name}` },
  };
}

/** FR-BR-7 and FR-EV-*. Readable signed out; RSVPs for members. */
export default async function EventPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { supabase, event, group } = await loadEvent(id);
  const { viewer, isMember, canManage } = await loadGroup(group.slug);

  const [{ data: details }, { data: listing }, { data: attendees }, { data: mine }] = await Promise.all([
    supabase.from("event_private_details").select("address").eq("event_id", event.id).maybeSingle(),
    supabase.from("event_listings").select("going_count").eq("id", event.id).single(),
    isMember
      ? supabase.from("event_rsvps").select("user_id, profiles(display_name)").eq("event_id", event.id).eq("status", "going")
      : Promise.resolve({ data: null }),
    viewer
      ? supabase.from("event_rsvps").select("status").eq("event_id", event.id).eq("user_id", viewer.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const going = listing?.going_count ?? 0;
  const started = new Date(event.starts_at) <= new Date();
  const cancelled = event.status === "cancelled";
  const full = event.capacity !== null && going >= event.capacity && mine?.status !== "going";
  const when = formatEventTime(event.starts_at, event.ends_at, event.timezone);
  const url = `${site.url}/e/${event.id}`;

  // TR-SEO-3: schema.org Event data for search engines.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.starts_at,
    endDate: event.ends_at,
    eventStatus: cancelled ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: event.location_name, ...(details?.address && { address: details.address }) },
    organizer: { "@type": "Organization", name: group.name, url: `${site.url}/g/${group.slug}` },
    description: event.description,
    url,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Notice params={await searchParams} />
      <p className="text-sm">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> ›
      </p>
      <h1>
        {event.title}
        {cancelled && <span className="ml-2 text-danger">(cancelled)</span>}
      </h1>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="font-semibold">When</dt>
        <dd>{when}</dd>
        <dt className="font-semibold">Where</dt>
        <dd>
          {event.location_name}
          {details?.address ? (
            <span className="block text-sm">{details.address}</span>
          ) : event.address_visibility === "members" && !isMember ? (
            <span className="block text-sm text-muted">Address shown to group members.</span>
          ) : null}
        </dd>
        <dt className="font-semibold">Going</dt>
        <dd>
          {going}
          {event.capacity !== null && ` of ${event.capacity}`}
        </dd>
      </dl>

      {/* RSVP ------------------------------------------------------------------ */}
      <section aria-label="RSVP" className="mt-4">
        {cancelled ? null : started ? (
          <p className="text-muted">This event has started.</p>
        ) : !viewer ? (
          <Link href={`/signin?next=/e/${event.id}`} className="button">
            Sign in to RSVP
          </Link>
        ) : !isMember ? (
          <p>
            <Link href={`/g/${group.slug}`}>Join {group.name}</Link> to RSVP.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {mine?.status === "going" ? (
              <>
                <strong>You&apos;re going.</strong>
                <form action={rsvp.bind(null, event.id, "not_going")}>
                  <button className="button button-plain">Can&apos;t make it</button>
                </form>
              </>
            ) : full ? (
              <strong>This event is full.</strong>
            ) : (
              <>
                <form action={rsvp.bind(null, event.id, "going")}>
                  <button className="button">I&apos;m going</button>
                </form>
                {mine?.status !== "not_going" && (
                  <form action={rsvp.bind(null, event.id, "not_going")}>
                    <button className="button button-plain">Not going</button>
                  </form>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <p className="mt-3 text-sm">
        <a href={`/e/${event.id}/calendar.ics`}>Add to calendar</a>
      </p>

      {canManage && !cancelled && (
        <nav aria-label="Organizer tools" className="mt-4 flex flex-wrap items-baseline gap-x-4 rounded bg-panel px-3 py-2 text-sm">
          <strong>Organizer:</strong>
          <Link href={`/e/${event.id}/edit`}>edit event</Link>
          <form action={cancelEvent.bind(null, event.id)} className="inline">
            <button className="link-button text-danger">cancel event</button>
          </form>
        </nav>
      )}

      {event.description && (
        <>
          <h2>Details</h2>
          <PlainText text={event.description} className="mt-2" />
        </>
      )}

      {attendees && attendees.length > 0 && (
        <>
          <h2>Who&apos;s going</h2>
          <ul className="mt-2 flex flex-wrap gap-x-4">
            {attendees.map((a) => (
              <li key={a.user_id}>
                <Link href={`/u/${a.user_id}`}>{a.profiles?.display_name ?? "deleted user"}</Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {viewer && (
        <p className="mt-8 text-sm">
          <Link href={`/report?type=event&id=${event.id}&next=/e/${event.id}`} className="text-muted">
            Report this event
          </Link>
        </p>
      )}
    </>
  );
}
