"use server";

import { actingUser, fail, failOnError, succeed } from "@/lib/actions";
import { errorCode } from "@/lib/db-errors";
import { eventSchema, formFields, idSchema } from "@/lib/validation";

/** FR-EV-1. The address goes in its own table so members-only ones stay private. */
export async function createEvent(groupId: string, slug: string, formData: FormData) {
  const back = `/g/${slug}/events/new`;
  const { viewer, supabase } = await actingUser(back);
  const parsed = eventSchema.safeParse(formFields(formData));
  if (!idSchema.safeParse(groupId).success || !parsed.success) fail(back, "invalid");
  const event = parsed.data;

  const { data, error } = await supabase
    .from("events")
    .insert({
      group_id: groupId,
      title: event.title,
      description: event.description,
      starts_at: event.startsAt,
      ends_at: event.endsAt,
      timezone: event.timezone,
      location_name: event.locationName,
      address_visibility: event.addressVisibility,
      capacity: event.capacity,
      created_by: viewer.id,
    })
    .select("id")
    .single();
  if (error || !data) fail(back, errorCode(error));

  if (event.address) {
    const { error: addressError } = await supabase
      .from("event_private_details")
      .insert({ event_id: data.id, address: event.address });
    failOnError(`/e/${data.id}/edit`, addressError);
  }
  succeed(`/e/${data.id}`, "event_created");
}

/** FR-EV-2. */
export async function updateEvent(eventId: string, formData: FormData) {
  const back = `/e/${eventId}/edit`;
  const { supabase } = await actingUser(back);
  const parsed = eventSchema.safeParse(formFields(formData));
  if (!idSchema.safeParse(eventId).success || !parsed.success) fail(back, "invalid");
  const event = parsed.data;

  const { data, error } = await supabase
    .from("events")
    .update({
      title: event.title,
      description: event.description,
      starts_at: event.startsAt,
      ends_at: event.endsAt,
      timezone: event.timezone,
      location_name: event.locationName,
      address_visibility: event.addressVisibility,
      capacity: event.capacity,
    })
    .eq("id", eventId)
    .select("id");
  failOnError(back, error);
  if (!data?.length) fail(back, "not_allowed");

  const { error: addressError } = event.address
    ? await supabase.from("event_private_details").upsert({ event_id: eventId, address: event.address })
    : await supabase.from("event_private_details").delete().eq("event_id", eventId);
  failOnError(back, addressError);

  succeed(`/e/${eventId}`, "event_saved");
}

/** FR-EV-2: cancelled events stay visible, marked cancelled. */
export async function cancelEvent(eventId: string) {
  const back = `/e/${eventId}`;
  const { supabase } = await actingUser(back);
  const { data, error } = await supabase.from("events").update({ status: "cancelled" }).eq("id", eventId).select("id");
  failOnError(back, error);
  if (!data?.length) fail(back, "not_allowed");
  succeed(back, "event_cancelled");
}

/** FR-EV-3. Capacity, start time and cancellation are enforced by the database. */
export async function rsvp(eventId: string, status: "going" | "not_going") {
  const back = `/e/${eventId}`;
  const { viewer, supabase } = await actingUser(back);

  // Change an existing RSVP, or create one. (An upsert would also try to
  // rewrite event_id and user_id, which members are not allowed to change.)
  const { data: updated, error: updateError } = await supabase
    .from("event_rsvps")
    .update({ status })
    .eq("event_id", eventId)
    .eq("user_id", viewer.id)
    .select("event_id");
  failOnError(back, updateError);
  if (!updated?.length) {
    const { error } = await supabase.from("event_rsvps").insert({ event_id: eventId, user_id: viewer.id, status });
    failOnError(back, error);
  }
  succeed(back, status === "going" ? "rsvp_going" : "rsvp_not_going");
}
