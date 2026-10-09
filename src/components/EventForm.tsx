import Image from "next/image";

import { site } from "@/config/site";
import type { Tables } from "@/lib/supabase/database.types";
import { utcToZonedLocal } from "@/lib/time";

type Event = Pick<
  Tables<"events">,
  | "title"
  | "description"
  | "details"
  | "starts_at"
  | "ends_at"
  | "timezone"
  | "location_name"
  | "address_visibility"
  | "capacity"
  | "photo_alt"
  | "is_paid"
  | "registration_fee"
  | "total_cost"
  | "takes_rsvps"
  | "signup_url"
  | "waitlist_enabled"
>;

const TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

/**
 * Fields shared by "post an event" and "edit event" (FR-EV-1, FR-EV-23 to
 * FR-EV-28). Every field is visible without JavaScript; the ones that apply
 * to only one choice say so in their label.
 */
export function EventForm({
  action,
  event,
  address,
  photoUrl,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  event?: Event;
  address?: string | null;
  photoUrl?: string | null;
  submitLabel: string;
}) {
  const timezone = event?.timezone ?? site.defaultTimezone;
  const zones = TIME_ZONES.includes(timezone) ? TIME_ZONES : [timezone, ...TIME_ZONES];

  return (
    <form action={action}>
      <label htmlFor="title">Title</label>
      <input id="title" name="title" type="text" required minLength={3} maxLength={120} defaultValue={event?.title} />

      <label htmlFor="description">
        Description <span className="hint">What the event is and who it&apos;s for. Shown first and in link previews.</span>
      </label>
      <textarea
        id="description"
        name="description"
        required
        minLength={10}
        maxLength={2000}
        defaultValue={event?.description}
        className="min-h-24"
      />

      <div className="flex flex-wrap gap-x-6">
        <div>
          <label htmlFor="startsLocal">Starts</label>
          <input
            id="startsLocal"
            name="startsLocal"
            type="datetime-local"
            required
            defaultValue={event ? utcToZonedLocal(event.starts_at, timezone) : undefined}
          />
        </div>
        <div>
          <label htmlFor="endsLocal">Ends</label>
          <input
            id="endsLocal"
            name="endsLocal"
            type="datetime-local"
            required
            defaultValue={event ? utcToZonedLocal(event.ends_at, timezone) : undefined}
          />
        </div>
      </div>

      <label htmlFor="timezone">
        Time zone <span className="hint">The times above are in this zone</span>
      </label>
      <select id="timezone" name="timezone" defaultValue={timezone}>
        {zones.map((z) => (
          <option key={z} value={z}>
            {z.replace("_", " ")}
          </option>
        ))}
      </select>

      <label htmlFor="locationName">
        Meeting place <span className="hint">Always public, e.g. &ldquo;{site.exampleMeetingPlace}&rdquo;</span>
      </label>
      <input id="locationName" name="locationName" type="text" required minLength={2} maxLength={200} defaultValue={event?.location_name} />

      <label htmlFor="address">
        Street address <span className="hint">Optional</span>
      </label>
      <input id="address" name="address" type="text" maxLength={300} defaultValue={address ?? ""} />

      <fieldset className="mt-3">
        <legend className="font-semibold">Who can see the address</legend>
        <label className="check">
          <input type="radio" name="addressVisibility" value="public" defaultChecked={(event?.address_visibility ?? "public") === "public"} />
          Everyone
        </label>
        <label className="check mt-1">
          <input type="radio" name="addressVisibility" value="members" defaultChecked={event?.address_visibility === "members"} />
          Group members only
        </label>
      </fieldset>

      {/* FR-EV-24 ---------------------------------------------------------- */}
      <fieldset className="mt-6">
        <legend className="font-semibold">Photo</legend>
        {photoUrl && (
          <>
            <Image src={photoUrl} alt={event?.photo_alt ?? ""} width={240} height={180} className="mt-2 rounded border border-rule object-cover" />
            <label className="check mt-2">
              <input type="checkbox" name="removePhoto" />
              Remove this photo
            </label>
          </>
        )}
        <label htmlFor="photo">
          {photoUrl ? "Replace with" : "Add a photo"}{" "}
          <span className="hint">Optional. JPEG, PNG or WebP, up to 5 MB. Location data is removed.</span>
        </label>
        <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
        <label htmlFor="photoAlt">
          Describe the photo <span className="hint">Required with a photo, for people who can&apos;t see it</span>
        </label>
        <input id="photoAlt" name="photoAlt" type="text" maxLength={200} defaultValue={event?.photo_alt ?? ""} />
      </fieldset>

      {/* FR-EV-25 ---------------------------------------------------------- */}
      <fieldset className="mt-6">
        <legend className="font-semibold">Price</legend>
        <label className="check">
          <input type="radio" name="price" value="free" defaultChecked={!event?.is_paid} />
          Free
        </label>
        <label className="check mt-1">
          <input type="radio" name="price" value="paid" defaultChecked={event?.is_paid} />
          Paid <span className="hint">The board shows the price; it never takes payment</span>
        </label>
        <label htmlFor="registrationFee">
          Registration fee <span className="hint">If paid, e.g. &ldquo;$25 registration&rdquo;</span>
        </label>
        <input id="registrationFee" name="registrationFee" type="text" maxLength={80} defaultValue={event?.registration_fee ?? ""} />
        <label htmlFor="totalCost">
          Total cost <span className="hint">If paid, optional, e.g. &ldquo;about $60 with bike rental&rdquo;</span>
        </label>
        <input id="totalCost" name="totalCost" type="text" maxLength={80} defaultValue={event?.total_cost ?? ""} />
      </fieldset>

      {/* FR-EV-26 to FR-EV-28 ---------------------------------------------- */}
      <fieldset className="mt-6">
        <legend className="font-semibold">RSVPs</legend>
        <label className="check">
          <input type="checkbox" name="takesRsvps" defaultChecked={event?.takes_rsvps ?? true} />
          Take RSVPs on {site.name}
        </label>
        <label htmlFor="capacity">
          Places <span className="hint">With RSVPs. Leave empty for no limit</span>
        </label>
        <input id="capacity" name="capacity" type="number" min={1} max={10000} defaultValue={event?.capacity ?? ""} className="max-w-32" />
        <label className="check mt-2">
          <input type="checkbox" name="waitlistEnabled" defaultChecked={event?.waitlist_enabled ?? false} />
          Waitlist when full <span className="hint">With places. You move people from the waitlist to going.</span>
        </label>
        <label htmlFor="signupUrl">
          Sign-up link <span className="hint">Without RSVPs, optional: your own sign-up page</span>
        </label>
        <input
          id="signupUrl"
          name="signupUrl"
          type="url"
          maxLength={500}
          placeholder="https://"
          defaultValue={event?.signup_url ?? ""}
        />
      </fieldset>

      <label htmlFor="details">
        Details <span className="hint">Optional: what to bring, pace, difficulty. Plain text; links work.</span>
      </label>
      <textarea id="details" name="details" maxLength={10000} defaultValue={event?.details ?? ""} />

      <button className="button mt-6">{submitLabel}</button>
    </form>
  );
}
