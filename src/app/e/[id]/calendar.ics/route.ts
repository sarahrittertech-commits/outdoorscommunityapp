import { site } from "@/config/site";
import { buildIcs } from "@/lib/ics";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation";

/** FR-EV-7: download an .ics file. Uses only what the requester may see. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const [{ data: event }, { data: details }] = await Promise.all([
    supabase.from("events").select("id, title, description, starts_at, ends_at, location_name").eq("id", id).maybeSingle(),
    supabase.from("event_private_details").select("address").eq("event_id", id).maybeSingle(),
  ]);
  if (!event) return new Response("Not found", { status: 404 });

  const body = buildIcs(
    {
      id: event.id,
      title: event.title,
      description: event.description,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      location: [event.location_name, details?.address].filter(Boolean).join(", "),
      url: `${site.url}/e/${event.id}`,
    },
    new URL(site.url).host,
  );

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-${event.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
