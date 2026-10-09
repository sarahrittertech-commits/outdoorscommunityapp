"use server";

import { z } from "zod";

import { actingUser, checkArgs, fail, failOnError, succeed } from "@/lib/actions";
import { errorCode } from "@/lib/db-errors";
import { eventPhotoPath, reencodeEventPhoto, removeEventPhoto, uploadEventPhoto } from "@/lib/eventPhotos";
import { eventPhotoSchema, eventSchema, formFields, idSchema, slugSchema } from "@/lib/validation";

type ParsedEvent = z.infer<typeof eventSchema>;

/** The event columns the form sets (FR-EV-1, FR-EV-23 to FR-EV-28). */
function eventColumns(event: ParsedEvent) {
  return {
    title: event.title,
    description: event.description,
    details: event.details,
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    timezone: event.timezone,
    location_name: event.locationName,
    address_visibility: event.addressVisibility,
    capacity: event.capacity,
    is_paid: event.isPaid,
    registration_fee: event.registrationFee,
    total_cost: event.totalCost,
    takes_rsvps: event.takesRsvps,
    signup_url: event.signupUrl,
    waitlist_enabled: event.waitlistEnabled,
  };
}

/** The form's fields and photo, validated; the photo is re-encoded here (TR-SEC-9). */
async function parseEventForm(back: string, formData: FormData) {
  const parsed = eventSchema.safeParse(formFields(formData));
  if (!parsed.success) fail(back, "invalid");
  const photoFile = eventPhotoSchema.safeParse(formData.get("photo"));
  if (!photoFile.success) fail(back, "photo_invalid");
  let photo: Buffer | null = null;
  if (photoFile.data) {
    // FR-EV-24: a photo needs a short description of the picture.
    if (!parsed.data.photoAlt) fail(back, "photo_alt_required");
    photo = await reencodeEventPhoto(photoFile.data);
    if (!photo) fail(back, "photo_invalid");
  }
  return { event: parsed.data, photo };
}

/** FR-EV-1. The address goes in its own table so members-only ones stay private. */
export async function createEvent(groupId: string, slug: string, formData: FormData) {
  const back = `/g/${slug}/events/new`;
  const { viewer, supabase } = await actingUser(back);
  checkArgs(back, z.tuple([idSchema, slugSchema]), [groupId, slug]);
  const { event, photo } = await parseEventForm(back, formData);

  const { data, error } = await supabase
    .from("events")
    .insert({ group_id: groupId, created_by: viewer.id, ...eventColumns(event) })
    .select("id")
    .single();
  if (error || !data) fail(back, errorCode(error));
  const edit = `/e/${data.id}/edit`;

  if (event.address) {
    const { error: addressError } = await supabase
      .from("event_private_details")
      .insert({ event_id: data.id, address: event.address });
    failOnError(edit, addressError);
  }

  // FR-EV-24: the photo goes in the new event's own folder, then the event points at it.
  if (photo) {
    const path = eventPhotoPath(groupId, data.id);
    const { error: uploadError } = await uploadEventPhoto(supabase, path, photo);
    if (uploadError) fail(edit, "photo_failed");
    const { error: photoError } = await supabase
      .from("events")
      .update({ photo_path: path, photo_alt: event.photoAlt })
      .eq("id", data.id);
    if (photoError) {
      await removeEventPhoto(supabase, path);
      fail(edit, "photo_failed");
    }
  }
  succeed(`/e/${data.id}`, "event_created");
}

/** FR-EV-2, with the photo kept, replaced or removed (FR-EV-24). */
export async function updateEvent(eventId: string, formData: FormData) {
  const back = `/e/${eventId}/edit`;
  const { supabase } = await actingUser(back);
  checkArgs(back, z.tuple([idSchema]), [eventId]);
  const { event, photo } = await parseEventForm(back, formData);

  const { data: current } = await supabase.from("events").select("group_id, photo_path").eq("id", eventId).maybeSingle();
  if (!current) fail(back, "not_found");
  const keepPhoto = Boolean(current.photo_path) && !photo && !event.removePhoto;
  if (keepPhoto && !event.photoAlt) fail(back, "photo_alt_required");

  // A new photo is uploaded first; the storage policies refuse anyone but
  // the group's organizers.
  const newPath = photo ? eventPhotoPath(current.group_id, eventId) : null;
  if (photo && newPath) {
    const { error: uploadError } = await uploadEventPhoto(supabase, newPath, photo);
    if (uploadError) fail(back, "photo_failed");
  }
  const photoColumns = newPath
    ? { photo_path: newPath, photo_alt: event.photoAlt }
    : keepPhoto
      ? { photo_alt: event.photoAlt }
      : { photo_path: null, photo_alt: null };

  const { data, error } = await supabase
    .from("events")
    .update({ ...eventColumns(event), ...photoColumns })
    .eq("id", eventId)
    .select("id");
  if (error || !data?.length) {
    await removeEventPhoto(supabase, newPath);
    failOnError(back, error);
    fail(back, "not_allowed");
  }
  if (!keepPhoto) await removeEventPhoto(supabase, current.photo_path);

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
  checkArgs(back, z.tuple([idSchema]), [eventId]);
  const { data, error } = await supabase.from("events").update({ status: "cancelled" }).eq("id", eventId).select("id");
  failOnError(back, error);
  if (!data?.length) fail(back, "not_allowed");
  succeed(back, "event_cancelled");
}

const rsvpNotice = { going: "rsvp_going", not_going: "rsvp_not_going", waitlisted: "waitlist_joined" } as const;

/**
 * FR-EV-3, and joining the waitlist (FR-EV-28). Capacity, start time,
 * cancellation, RSVPs being off and the waitlist order are all enforced by
 * the database.
 */
export async function rsvp(eventId: string, status: "going" | "not_going" | "waitlisted") {
  const back = `/e/${eventId}`;
  const { viewer, supabase } = await actingUser(back);
  checkArgs(back, z.tuple([idSchema, z.enum(["going", "not_going", "waitlisted"])]), [eventId, status]);

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
  succeed(back, rsvpNotice[status]);
}

/** FR-EV-28: leaving the waitlist is always allowed. */
export async function leaveWaitlist(eventId: string) {
  const back = `/e/${eventId}`;
  const { viewer, supabase } = await actingUser(back);
  checkArgs(back, z.tuple([idSchema]), [eventId]);
  const { error } = await supabase
    .from("event_rsvps")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", viewer.id)
    .eq("status", "waitlisted");
  failOnError(back, error);
  succeed(back, "waitlist_left");
}

/** FR-EV-28: an organizer moves someone to going while a place is free. */
export async function moveFromWaitlist(eventId: string, userId: string) {
  const back = `/e/${eventId}`;
  const { supabase } = await actingUser(back);
  checkArgs(back, z.tuple([idSchema, idSchema]), [eventId, userId]);
  const { error } = await supabase.rpc("move_from_waitlist", { p_event_id: eventId, p_user_id: userId });
  failOnError(back, error);
  succeed(back, "moved_to_going");
}
