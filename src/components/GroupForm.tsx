import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type Group = Pick<
  Tables<"groups">,
  "name" | "description" | "rules" | "subcategory_id" | "area" | "join_policy" | "join_question" | "discussions_enabled"
>;

/** The fields shared by "start a group" and "edit group". Works without JavaScript. */
export async function GroupForm({
  action,
  group,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  group?: Group;
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

      <label htmlFor="area">
        Area <span className="hint">Town or area you usually meet, e.g. Brevard</span>
      </label>
      <input id="area" name="area" type="text" required minLength={2} maxLength={80} defaultValue={group?.area} />

      <label htmlFor="description">
        Description <span className="hint">What you do, how often, who it&apos;s for. Plain text; links work.</span>
      </label>
      <textarea id="description" name="description" required minLength={10} maxLength={5000} defaultValue={group?.description} />

      <label htmlFor="rules">
        Group rules <span className="hint">Optional. Shown before people join.</span>
      </label>
      <textarea id="rules" name="rules" maxLength={5000} className="min-h-20" defaultValue={group?.rules ?? ""} />

      <fieldset className="mt-4">
        <legend className="font-semibold">Who can join</legend>
        <label className="check">
          <input type="radio" name="joinPolicy" value="open" defaultChecked={(group?.join_policy ?? "open") === "open"} />
          Anyone can join straight away
        </label>
        <label className="check mt-1">
          <input type="radio" name="joinPolicy" value="approval" defaultChecked={group?.join_policy === "approval"} />
          People ask to join and an organizer approves them
        </label>
      </fieldset>

      <label htmlFor="joinQuestion">
        Question for people asking to join <span className="hint">Optional, approval groups only</span>
      </label>
      <input id="joinQuestion" name="joinQuestion" type="text" maxLength={280} defaultValue={group?.join_question ?? ""} />

      <label className="check mt-4">
        <input type="checkbox" name="discussionsEnabled" defaultChecked={group?.discussions_enabled ?? true} />
        Members can talk in a discussion board
      </label>

      <button className="button mt-6">{submitLabel}</button>
    </form>
  );
}
