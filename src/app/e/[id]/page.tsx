import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { cancelEvent, leaveWaitlist, moveFromWaitlist, rsvp, saveEvent, unsaveEvent } from "@/app/actions/events";
import { groupPhotos } from "@/brand/activityPhotos";
import { Notice } from "@/components/Notice";
import { PlainText } from "@/components/PlainText";
import { site } from "@/config/site";
import { getViewer } from "@/lib/auth";
import { eventPhotoUrl } from "@/lib/eventPhotos";
import { loadEvent } from "@/lib/events";
import { loadGroup } from "@/lib/groups";
import { formatEventTime } from "@/lib/time";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { supabase, event, group } = await loadEvent((await params).id);
  const when = formatEventTime(event.starts_at, event.ends_at, event.timezone);
  // FR-EV-23: the description is used in link previews.
  const summary = `${when} · ${group.name}. ${event.description}`.slice(0, 200);
  return {
    title: event.title,
    description: summary,
    openGraph: {
      title: event.title,
      description: summary,
      ...(event.photo_path && { images: [{ url: eventPhotoUrl(supabase, event.photo_path), alt: event.photo_alt ?? "" }] }),
    },
  };
}

/** "Sign up at club.example.org" (FR-EV-27). */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** FR-BR-7 and FR-EV-*. Readable signed out; RSVPs for members. */
export default async function EventPage({ params, searchParams }: Props) {
  const { id } = await params;
  // Two round trips, not five: the event and the viewer together, then the
  // membership and everything on the page together. Row-level security
  // decides what each query returns, so nothing here waits on isMember.
  const [{ supabase, event, group }, viewer] = await Promise.all([loadEvent(id), getViewer()]);

  const [
    { isMember, canManage, seesMemberList },
    { data: details },
    { data: goingCount },
    { data: rsvpRows },
    { data: waitlistPlace },
    { data: saved },
  ] = await Promise.all([
    loadGroup(group.slug),
    supabase.from("event_private_details").select("address").eq("event_id", event.id).maybeSingle(),
    // Not event_listings, which leaves out archived groups (FR-GR-6).
    supabase.rpc("event_going_count", { p_event_id: event.id }),
    // Whoever the group's member list setting allows (FR-MB-10) reads every
    // RSVP to the event; anyone else reads only their own.
    viewer
      ? supabase
          .from("event_rsvps")
          .select("user_id, status, waitlisted_at, profiles(display_name)")
          .eq("event_id", event.id)
          .order("waitlisted_at", { ascending: true, nullsFirst: true })
      : Promise.resolve({ data: null }),
    // How many are waiting and the viewer's own place, without names.
    viewer ? supabase.rpc("event_waitlist_place", { p_event_id: event.id }).single() : Promise.resolve({ data: null }),
    // FR-EV-18: only the viewer's own save is readable.
    viewer ? supabase.from("saved_events").select("event_id").eq("event_id", event.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const mine = viewer ? (rsvpRows ?? []).find((r) => r.user_id === viewer.id) : undefined;

  // Names on who's going follow the group's member list setting (FR-EV-6,
  // FR-MB-10); anyone else reads only their own RSVP, so gets no list.
  const attendees = seesMemberList ? (rsvpRows ?? []).filter((r) => r.status === "going") : null;
  // Names for organizers; the count and your place for everyone (FR-EV-28).
  const waitlist = (rsvpRows ?? []).filter((r) => r.status === "waitlisted");
  const waiting = waitlistPlace?.waiting ?? 0;
  const myPlace = waitlistPlace?.my_place ?? 0;
  const going = goingCount ?? 0;
  // FR-EV-24: the event's own photo first; otherwise a representative photo
  // for a couple of sample groups (src/brand/activityPhotos.ts).
  const ownPhoto = event.photo_path ? { src: eventPhotoUrl(supabase, event.photo_path), alt: event.photo_alt ?? "" } : null;
  const samplePhoto = ownPhoto ? null : groupPhotos[group.slug];
  const started = new Date(event.starts_at) <= new Date();
  const cancelled = event.status === "cancelled";
  const placeFree = event.capacity === null || going < event.capacity;
  // FR-EV-28: while anyone is waiting, places go to the waitlist first.
  const waitlistOpen = event.waitlist_enabled && event.capacity !== null;
  const full = mine?.status !== "going" && (!placeFree || (waitlistOpen && waiting > 0 && !canManage));
  const when = formatEventTime(event.starts_at, event.ends_at, event.timezone);
  const url = `${site.url}/e/${event.id}`;
  // FR-GR-9: a listed group's event points to the organizer's own page.
  // Hidden once the event is cancelled: there is nothing left to sign up for.
  const organizerUrl = group.is_unclaimed && !cancelled ? (event.source_url ?? group.source_url) : null;
  // The database refuses RSVPs to an archived group's events, so offer none.
  const archived = group.status === "archived";

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
    isAccessibleForFree: !event.is_paid,
    ...(ownPhoto && { image: ownPhoto.src }),
    url,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Notice params={await searchParams} />
      <p className="breadcrumb">
        <Link href={`/g/${group.slug}`}>{group.name}</Link> ›
      </p>
      <h1>
        {event.title}
        {cancelled && <span className="ml-2 text-danger">(cancelled)</span>}
      </h1>

      <div className="event-top">
        <div>
          {/* FR-EV-23: the description comes first. */}
          <PlainText text={event.description} className="mt-3" />

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
            {/* FR-EV-25: the board shows the price; it never takes payment. */}
            <dt className="font-semibold">Price</dt>
            <dd>
              {event.is_paid
                ? [
                    event.registration_fee && `Registration fee: ${event.registration_fee}`,
                    event.total_cost && `Total cost: ${event.total_cost}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Free"}
            </dd>
            {!group.is_unclaimed && event.takes_rsvps && (
              <>
                <dt className="font-semibold">Going</dt>
                <dd>
                  {going}
                  {event.capacity !== null && ` of ${event.capacity}`}
                  {waitlistOpen && waiting > 0 && isMember && `, ${waiting} on the waitlist`}
                </dd>
              </>
            )}
          </dl>

          {/* RSVP ------------------------------------------------------------------ */}
          <section aria-label="RSVP" className="mt-4">
            {organizerUrl ? (
              <p className="rounded border border-rule bg-panel px-4 py-3">
                From an <Link href={`/g/${group.slug}`}>unclaimed listing</Link>, added from public information. Check the details and sign
                up on the organizer&apos;s own page:{" "}
                <a href={organizerUrl} rel="nofollow noopener" className="font-bold">
                  {group.name} event page
                </a>
              </p>
            ) : cancelled ? null : archived ? (
              <p className="text-muted">This group is archived.</p>
            ) : !event.takes_rsvps ? (
              // FR-EV-26 and FR-EV-27: no RSVPs here; perhaps the organizer's own page.
              event.signup_url ? (
                <p>
                  Sign up at{" "}
                  <a href={event.signup_url} rel="nofollow ugc noopener" className="font-bold">
                    {hostOf(event.signup_url)}
                  </a>
                </p>
              ) : (
                <p className="text-muted">No RSVPs for this one. Just come along.</p>
              )
            ) : started ? (
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
                ) : mine?.status === "waitlisted" ? (
                  <>
                    <strong>You&apos;re #{myPlace || "?"} on the waitlist.</strong>
                    <form action={leaveWaitlist.bind(null, event.id)}>
                      <button className="button button-plain">Leave the waitlist</button>
                    </form>
                  </>
                ) : full ? (
                  waitlistOpen ? (
                    <>
                      <strong>This event is full.</strong>
                      <form action={rsvp.bind(null, event.id, "waitlisted")}>
                        <button className="button">Join the waitlist</button>
                      </form>
                    </>
                  ) : (
                    <strong>This event is full.</strong>
                  )
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
        </div>
        {ownPhoto ? (
          <figure className="event-photo">
            <Image src={ownPhoto.src} alt={ownPhoto.alt} width={1600} height={1200} sizes="(min-width: 768px) 20rem, 100vw" />
          </figure>
        ) : (
          samplePhoto && (
            <figure className="event-photo">
              <Image src={samplePhoto.src} alt={samplePhoto.alt} width={900} height={604} sizes="(min-width: 768px) 20rem, 100vw" />
              <figcaption>{samplePhoto.label} · representative photo</figcaption>
            </figure>
          )
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        {/* FR-EV-18: save without RSVPing; nobody else can see it. */}
        {viewer?.canWrite &&
          (saved ? (
            <form action={unsaveEvent.bind(null, event.id, "event")} className="flex items-center gap-2">
              <span>Saved</span>
              <button className="button button-plain">Unsave</button>
            </form>
          ) : (
            <form action={saveEvent.bind(null, event.id)}>
              <button className="button button-plain">Save for later</button>
            </form>
          ))}
        <a href={`/e/${event.id}/calendar.ics`}>Add to calendar</a>
      </div>

      {canManage && !cancelled && (
        <nav aria-label="Page admin tools" className="mt-4 flex flex-wrap items-baseline gap-x-4 rounded bg-panel px-3 py-2 text-sm">
          <strong>Page admin tools:</strong>
          <Link href={`/e/${event.id}/edit`}>edit event</Link>
          <form action={cancelEvent.bind(null, event.id)} className="inline">
            <button className="link-button text-danger">cancel event</button>
          </form>
        </nav>
      )}

      {event.details && (
        <>
          <h2>Details</h2>
          <PlainText text={event.details} className="mt-2" />
        </>
      )}

      {!attendees && isMember && going > 0 && (
        <p className="mt-4 text-sm text-muted">This group shows who&apos;s going to its organizers only.</p>
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

      {/* FR-EV-28: organizers move people from the waitlist, in order, while a place is free. */}
      {canManage && waitlist.length > 0 && (
        <>
          <h2>Waitlist</h2>
          {!placeFree && <p className="mt-2 text-sm text-muted">The event is full. When someone drops out, move the next person to going.</p>}
          <ol className="mt-2 list-decimal pl-6">
            {waitlist.map((w) => (
              <li key={w.user_id} className="py-1">
                <Link href={`/u/${w.user_id}`}>{w.profiles?.display_name ?? "deleted user"}</Link>
                {placeFree && !cancelled && !started && (
                  <form action={moveFromWaitlist.bind(null, event.id, w.user_id)} className="ml-3 inline">
                    <button className="link-button">Move to going</button>
                  </form>
                )}
              </li>
            ))}
          </ol>
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
