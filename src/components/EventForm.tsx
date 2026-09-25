import { site } from "@/config/site";
import type { Tables } from "@/lib/supabase/database.types";
import { utcToZonedLocal } from "@/lib/time";

type Event = Pick<
  Tables<"events">,
  "title" | "description" | "starts_at" | "ends_at" | "timezone" | "location_name" | "address_visibility" | "capacity"
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

/** Fields shared by "post an event" and "edit event" (FR-EV-1). */
export function EventForm({
  action,
  event,
  address,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  event?: Event;
  address?: string | null;
  submitLabel: string;
}) {
  const timezone = event?.timezone ?? site.defaultTimezone;
  const zones = TIME_ZONES.includes(timezone) ? TIME_ZONES : [timezone, ...TIME_ZONES];

  return (
    <form action={action}>
      <label htmlFor="title">Title</label>
      <input id="title" name="title" type="text" required minLength={3} maxLength={120} defaultValue={event?.title} />

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
        Meeting place <span className="hint">Always public, e.g. &ldquo;Hooker Falls parking area&rdquo;</span>
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

      <label htmlFor="capacity">
        Capacity <span className="hint">Optional. Leave empty for no limit</span>
      </label>
      <input id="capacity" name="capacity" type="number" min={1} max={10000} defaultValue={event?.capacity ?? ""} className="max-w-32" />

      <label htmlFor="description">
        Details <span className="hint">What to bring, pace, difficulty. Plain text; links work.</span>
      </label>
      <textarea id="description" name="description" maxLength={10000} defaultValue={event?.description} />

      <button className="button mt-6">{submitLabel}</button>
    </form>
  );
}
