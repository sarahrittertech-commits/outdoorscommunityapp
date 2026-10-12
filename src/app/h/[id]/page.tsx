import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { removeBusinessEvent } from "@/app/actions/candidates";
import { getViewer } from "@/lib/auth";
import { BUSINESS_KIND_LABEL } from "@/lib/hosts";
import { createClient } from "@/lib/supabase/server";
import { formatEventTime } from "@/lib/time";
import { idSchema } from "@/lib/validation";

type Props = { params: Promise<{ id: string }> };

const loadHostedEvent = cache(async (id: string) => {
  if (!idSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_events")
    .select("id, title, starts_at, ends_at, timezone, location_name, price_text, is_paid, source_url, status, businesses(slug, name, kind, area, website)")
    .eq("id", id)
    .maybeSingle();
  if (!data?.businesses) notFound();
  return { event: data, host: data.businesses };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { event, host } = await loadHostedEvent((await params).id);
  return {
    title: event.title,
    description: `${formatEventTime(event.starts_at, event.ends_at, event.timezone)} · ${host.name}`.slice(0, 200),
  };
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * UC-37: an event a guide, shop or venue runs. The board shows when and
 * where, and sends people to the host to sign up; no RSVPs or discussion.
 */
export default async function HostedEventPage({ params }: Props) {
  const { event, host } = await loadHostedEvent((await params).id);
  const viewer = await getViewer();

  return (
    <article className="max-w-prose">
      <p className="text-sm text-muted">
        <Link href="/events">Events</Link> ›
      </p>
      <h1>{event.title}</h1>
      {event.status === "cancelled" && <p className="font-bold text-danger">Cancelled</p>}
      <p className="text-lg">{formatEventTime(event.starts_at, event.ends_at, event.timezone)}</p>
      <p>{event.location_name}</p>
      <p className="text-sm text-muted">
        Run by <Link href={`/b/${host.slug}`}>{host.name}</Link> ({BUSINESS_KIND_LABEL[host.kind] ?? host.kind}, {host.area})
        {event.price_text ? ` · ${event.price_text}` : event.is_paid ? " · paid" : ""}
      </p>
      <p>
        <a href={event.source_url} rel="nofollow noopener" className="button">
          Details and sign-up at {hostOf(event.source_url)}
        </a>
      </p>
      <p className="mt-6 border-t border-rule pt-3 text-sm text-muted">
        Listed from the host&apos;s public page. Times and prices can change, so check there before you go. The host doesn&apos;t pay to be
        here. Something wrong? <Link href="/suggest">Tell the site admin</Link>.
      </p>
      {viewer?.isSiteAdmin && viewer.canWrite && (
        <form action={removeBusinessEvent.bind(null, event.id)} className="mt-4">
          <button className="button button-plain text-sm">Remove this event</button>
        </form>
      )}
    </article>
  );
}
