import Image from "next/image";

import { site } from "@/config/site";
import { AFFINITY_TAGS } from "@/lib/affinity";
import { GROUP_TYPES } from "@/lib/groupTypes";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type Group = Pick<
  Tables<"groups">,
  "name" | "description" | "rules" | "subcategory_id" | "area" | "join_policy" | "join_question" | "discussions_enabled" | "affinity_tags" | "website" | "member_list_visibility" | "group_type" | "cover_alt"
>;

const MEMBER_LIST_CHOICES = [
  { value: "members", label: "Members (default)" },
  { value: "organizers", label: "Organizers only" },
  { value: "signed_in", label: "Anyone signed in" },
] as const;

/** The fields shared by "start a group" and "edit group". Works without JavaScript. */
export async function GroupForm({
  action,
  group,
  coverUrl,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  group?: Group;
  /** FR-GR-14: the current cover's public URL, when the group has one. */
  coverUrl?: string | null;
  submitLabel: string;
}) {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, subcategories(id, name, sort_order)")
    .order("sort_order");

  return (
    <form action={action}>
      <label htmlFor="name">Group name</label>
      <input id="name" name="name" type="text" required minLength={3} maxLength={80} defaultValue={group?.name} />

      <label htmlFor="subcategoryId">Activity</label>
      <select id="subcategoryId" name="subcategoryId" required defaultValue={group?.subcategory_id ?? ""}>
        <option value="" disabled>
          Choose one
        </option>
        {categories?.map((c) => (
          <optgroup key={c.id} label={c.name}>
            {[...c.subcategories]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>

      {/* FR-GR-16 ---------------------------------------------------------- */}
      <fieldset className="mt-4">
        <legend className="font-semibold">
          Type of group <span className="hint">Helps newcomers tell groups apart.</span>
        </legend>
        {GROUP_TYPES.map((t) => (
          <label key={t.value} className="check mt-1">
            <input type="radio" name="groupType" value={t.value} defaultChecked={group?.group_type === t.value} />
            {t.label} <span className="hint">{t.hint}</span>
          </label>
        ))}
        {!group?.group_type && (
          <label className="check mt-1">
            <input type="radio" name="groupType" value="" defaultChecked />
            Not chosen yet
          </label>
        )}
      </fieldset>

      <label htmlFor="area">
        Area <span className="hint">Town or area you usually meet, e.g. {site.exampleArea}</span>
      </label>
      <input id="area" name="area" type="text" required minLength={2} maxLength={80} defaultValue={group?.area} />

      <label htmlFor="description">
        Description <span className="hint">What you do, how often, who it&apos;s for. Plain text; links work.</span>
      </label>
      <textarea id="description" name="description" required minLength={10} maxLength={5000} defaultValue={group?.description} />

      <label htmlFor="website">
        Website <span className="hint">Optional. Your club&apos;s own site, shown on the group page.</span>
      </label>
      <input id="website" name="website" type="url" maxLength={500} placeholder="https://" defaultValue={group?.website ?? ""} />

      <label htmlFor="rules">
        Group rules <span className="hint">Optional. Shown before people join.</span>
      </label>
      <textarea id="rules" name="rules" maxLength={5000} className="min-h-20" defaultValue={group?.rules ?? ""} />

      <fieldset className="mt-4">
        <legend className="font-semibold">Who can join</legend>
        <label className="check">
          <input type="radio" name="joinPolicy" value="open" defaultChecked={(group?.join_policy ?? site.defaultJoinPolicy) === "open"} />
          Anyone can join straight away
        </label>
        <label className="check mt-1">
          <input type="radio" name="joinPolicy" value="approval" defaultChecked={(group?.join_policy ?? site.defaultJoinPolicy) === "approval"} />
          People ask to join and an organizer approves them
        </label>
      </fieldset>

      <label htmlFor="joinQuestion">
        Question for people asking to join <span className="hint">Optional, approval groups only</span>
      </label>
      <input id="joinQuestion" name="joinQuestion" type="text" maxLength={280} defaultValue={group?.join_question ?? ""} />

      <fieldset className="mt-4">
        <legend className="font-semibold">
          Affinity <span className="hint">Optional. Tick any that describe who the group is for.</span>
        </legend>
        <div className="flex flex-wrap gap-x-5">
          {AFFINITY_TAGS.map((t) => (
            <label key={t.value} className="check">
              <input type="checkbox" name="affinityTags" value={t.value} defaultChecked={group?.affinity_tags?.includes(t.value)} />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* FR-MB-10: organizers are always listed; counts are always shown. */}
      <fieldset className="mt-4">
        <legend className="font-semibold">
          Who can see the member list{" "}
          <span className="hint">Also decides who sees names on &ldquo;who&apos;s going&rdquo;. Organizers and counts are always shown.</span>
        </legend>
        {MEMBER_LIST_CHOICES.map((c) => (
          <label key={c.value} className="check mt-1">
            <input
              type="radio"
              name="memberListVisibility"
              value={c.value}
              defaultChecked={(group?.member_list_visibility ?? "members") === c.value}
            />
            {c.label}
          </label>
        ))}
      </fieldset>

      {/* FR-GR-14: on the edit form only, since the photo goes in the group's own folder. */}
      {group && (
        <fieldset className="mt-6">
          <legend className="font-semibold">Cover photo</legend>
          {coverUrl && (
            <>
              <Image src={coverUrl} alt={group.cover_alt ?? ""} width={240} height={160} className="mt-2 rounded border border-rule object-cover" />
              <label className="check mt-2">
                <input type="checkbox" name="removeCover" />
                Remove this photo
              </label>
            </>
          )}
          <label htmlFor="cover">
            {coverUrl ? "Replace with" : "Add a photo"}{" "}
            <span className="hint">Optional. Shown at the top of the group page and in Communities. JPEG, PNG or WebP, up to 5 MB. Location data is removed.</span>
          </label>
          <input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" />
          <label htmlFor="coverAlt">
            Describe the photo <span className="hint">Required with a photo, for people who can&apos;t see it</span>
          </label>
          <input id="coverAlt" name="coverAlt" type="text" maxLength={200} defaultValue={group.cover_alt ?? ""} />
        </fieldset>
      )}

      <label className="check mt-4">
        <input type="checkbox" name="discussionsEnabled" defaultChecked={group?.discussions_enabled ?? true} />
        Members can talk in a discussion board
      </label>

      <button className="button mt-6">{submitLabel}</button>
    </form>
  );
}
