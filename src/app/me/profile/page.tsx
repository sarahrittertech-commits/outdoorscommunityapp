import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { changePassword, deleteAccount } from "@/app/actions/auth";
import { removeProfilePhoto, saveAboutMe, saveProfilePhoto } from "@/app/actions/profile";
import { Notice } from "@/components/Notice";
import { SubmitButton } from "@/components/SubmitButton";
import { TownSelect } from "@/components/TownSelect";
import { site } from "@/config/site";
import { requireViewer } from "@/lib/auth";
import { findTown } from "@/lib/geo";
import { GOAL_MAX, goalYear, MAX_GOALS, MAX_PROMPTS, PROMPT_ANSWER_MAX, type ProfileSection } from "@/lib/profile";
import { signProfilePhoto } from "@/lib/profilePhotos";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** A section's Show/Hide select (FR-PR-7). Plain HTML, so it works without JavaScript. */
function ShowHide({ section, shown, label }: { section: ProfileSection; shown: boolean; label: string }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <label htmlFor={`show_${section}`} className="m-0 text-sm font-normal text-muted">
        {label}
      </label>
      <select id={`show_${section}`} name={`show_${section}`} defaultValue={shown ? "show" : "hide"} className="m-0 w-auto">
        <option value="show">Show</option>
        <option value="hide">Hide</option>
      </select>
    </div>
  );
}

/** UC-33 (FR-PR-1 to FR-PR-10), FR-AC-3, FR-AC-6 and FR-AC-21. */
export default async function EditProfilePage({ searchParams }: Props) {
  const viewer = await requireViewer("/me/profile");
  const supabase = await createClient();
  const year = goalYear();

  const [{ data: profile }, { data: about }, { data: categories }, { data: activities }, { data: prompts }, { data: goals }] =
    await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", viewer.id).single(),
      supabase.from("profile_about").select("*").eq("user_id", viewer.id).maybeSingle(),
      supabase.from("categories").select("id, name").order("sort_order"),
      supabase.from("profile_activities").select("category_id").eq("user_id", viewer.id),
      supabase.from("profile_prompts").select("prompt_key, answer").eq("user_id", viewer.id).order("position"),
      supabase.from("profile_goals").select("body, done").eq("user_id", viewer.id).eq("year", year).order("position"),
    ]);
  const photoUrl = await signProfilePhoto(supabase, about?.photo_path);

  const shown = (section: ProfileSection) => about?.[`show_${section}`] ?? true;
  const ticked = new Set((activities ?? []).map((a) => a.category_id));
  // FR-PR-2: an older free-text area stays selectable until a town is picked.
  const legacyTown = about?.town && !findTown(about.town) ? about.town : null;
  const townValue = about?.town ? (findTown(about.town)?.name ?? about.town) : "";

  return (
    <>
      <p className="breadcrumb">
        <Link href="/me">my stuff</Link> ›
      </p>
      <h1>Profile</h1>
      <Notice params={await searchParams} />
      <p className="mt-1 max-w-prose text-sm text-muted">
        Every part is optional. Nobody can see your email address.{" "}
        <Link href={`/u/${viewer.id}`}>See your profile</Link>.
      </p>

      <section className="mt-6 max-w-prose rounded border border-rule p-4">
        <h2 className="m-0 text-xl">Who sees your profile</h2>
        <ul className="mt-2 list-disc pl-5 text-sm">
          <li>Everyone sees your display name.</li>
          <li>
            Page admins and page managers of a group you&apos;re in, or have asked to join, always see the rest, so they
            know who they&apos;re letting in.
          </li>
          <li>If you&apos;re a page admin or page manager of a listed group, your profile is public: anyone can see it.</li>
          <li>Other members of your groups see it only if you tick &ldquo;Share my profile with members of my groups&rdquo; below.</li>
          <li>A section set to Hide is seen by you only, whoever else can see your profile.</li>
        </ul>
      </section>

      <section className="mt-8 border-t border-rule pt-4">
        <h2 className="m-0">Photo</h2>
        {photoUrl && (
          <Image
            src={photoUrl}
            alt={about?.photo_alt ?? viewer.displayName ?? "Your photo"}
            width={120}
            height={120}
            unoptimized
            className="mt-3 block h-[120px] w-[120px] rounded border border-rule object-cover"
          />
        )}
        <form action={saveProfilePhoto}>
          <label htmlFor="photo">
            {photoUrl ? "Replace your photo" : "Add a photo"}{" "}
            <span className="hint">
              Any photo of you outdoors works: on the trail, on your bike, at camp. It&apos;s shown small and square.
            </span>
          </label>
          <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
          <p className="mt-1 text-sm text-muted">JPEG, PNG or WebP, at most 5 MB. Location and camera details are removed.</p>
          <label htmlFor="photoAlt">
            Describe it in a few words <span className="hint">For people who can&apos;t see it. Blank uses your name.</span>
          </label>
          <input id="photoAlt" name="photoAlt" type="text" maxLength={200} defaultValue={about?.photo_alt ?? ""} />
          <SubmitButton className="button mt-3" pendingText="Saving…">
            Save photo
          </SubmitButton>
        </form>
        {photoUrl && (
          <form action={removeProfilePhoto} className="mt-2">
            <SubmitButton className="button button-plain" pendingText="Removing…">
              Remove photo
            </SubmitButton>
          </form>
        )}
      </section>

      <form action={saveAboutMe} className="mt-8 border-t border-rule pt-4">
        <h2 className="m-0">About you</h2>
        <ShowHide section="photo" shown={shown("photo")} label="Photo:" />

        <label htmlFor="displayName">Display name <span className="hint">Always shown, on your posts and RSVPs.</span></label>
        <input id="displayName" name="displayName" type="text" required minLength={2} maxLength={40} defaultValue={profile?.display_name ?? ""} />

        <label htmlFor="town">Home town</label>
        <TownSelect id="town" name="town" blank="Not saying" keep={legacyTown} defaultValue={townValue} />
        <ShowHide section="town" shown={shown("town")} label="Home town:" />

        <label htmlFor="bio">
          Blurb <span className="hint">Up to 280 characters</span>
        </label>
        <textarea id="bio" name="bio" maxLength={280} className="min-h-20" defaultValue={about?.bio ?? ""} />
        <ShowHide section="bio" shown={shown("bio")} label="Blurb:" />

        <fieldset className="mt-6 border-0 p-0">
          <legend className="font-bold">Activities I enjoy</legend>
          <div className="mt-1 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {(categories ?? []).map((c) => (
              <label key={c.id} className="check mt-1">
                <input type="checkbox" name="activity" value={c.id} defaultChecked={ticked.has(c.id)} />
                {c.name}
              </label>
            ))}
          </div>
          <ShowHide section="activities" shown={shown("activities")} label="Activities:" />
        </fieldset>

        <fieldset className="mt-6 border-0 p-0">
          <legend className="font-bold">Fill in the blanks</legend>
          <p className="m-0 text-sm text-muted">Pick up to {MAX_PROMPTS}, and finish each in {PROMPT_ANSWER_MAX} characters or fewer.</p>
          {Array.from({ length: MAX_PROMPTS }, (_, i) => {
            const n = i + 1;
            const current = prompts?.[i];
            return (
              <div key={n} className="mt-3 sm:flex sm:items-end sm:gap-3">
                <div>
                  <label htmlFor={`promptKey${n}`} className="mt-0 text-sm font-normal">
                    Prompt {n}
                  </label>
                  <select id={`promptKey${n}`} name={`promptKey${n}`} defaultValue={current?.prompt_key ?? site.profilePrompts[i]?.key}>
                    {site.profilePrompts.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.text} …
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grow">
                  <label htmlFor={`promptAnswer${n}`} className="mt-1 text-sm font-normal sm:mt-0">
                    Answer {n}
                  </label>
                  <input
                    id={`promptAnswer${n}`}
                    name={`promptAnswer${n}`}
                    type="text"
                    maxLength={PROMPT_ANSWER_MAX}
                    defaultValue={current?.answer ?? ""}
                  />
                </div>
              </div>
            );
          })}
          <p className="mt-1 text-sm text-muted">Leave an answer blank to skip that prompt.</p>
          <ShowHide section="prompts" shown={shown("prompts")} label="Fill-in-the-blanks:" />
        </fieldset>

        <fieldset className="mt-6 border-0 p-0">
          <legend className="font-bold">{year} adventure goals</legend>
          <p className="m-0 text-sm text-muted">
            Up to {MAX_GOALS}, {GOAL_MAX} characters each. Tick one when it&apos;s done. On 1 January the list starts
            fresh; earlier years stay visible to you only.
          </p>
          <ol className="mt-2 list-none p-0">
            {Array.from({ length: MAX_GOALS }, (_, i) => {
              const n = i + 1;
              const goal = goals?.[i];
              return (
                <li key={n} className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`goalDone${n}`}
                    name={`goalDone${n}`}
                    defaultChecked={goal?.done ?? false}
                    aria-label={`Goal ${n} done`}
                  />
                  <input
                    type="text"
                    id={`goal${n}`}
                    name={`goal${n}`}
                    maxLength={GOAL_MAX}
                    defaultValue={goal?.body ?? ""}
                    aria-label={`Goal ${n}`}
                    className="m-0"
                  />
                </li>
              );
            })}
          </ol>
          <ShowHide section="goals" shown={shown("goals")} label="Adventure goals:" />
        </fieldset>

        <fieldset className="mt-6 border-0 p-0">
          <legend className="font-bold">Groups I&apos;m in</legend>
          <p className="m-0 text-sm text-muted">
            Your active groups, linked. A reader sees only groups whose member list they could see anyway.
          </p>
          <ShowHide section="groups" shown={shown("groups")} label="Groups:" />
        </fieldset>

        <label className="check mt-6">
          <input type="checkbox" name="shareWithMembers" defaultChecked={about?.share_with_members ?? false} />
          Share my profile with members of my groups
        </label>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Off unless you tick it. When it&apos;s on, anyone in a group you&apos;re in can see the sections you show.
        </p>

        <SubmitButton className="button mt-5" pendingText="Saving…">
          Save profile
        </SubmitButton>
      </form>

      <section className="mt-12 border-t border-rule pt-4">
        <h2 className="mt-0">Change password</h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Any other devices signed in to your account will be signed out. Forgotten it?{" "}
          <Link href="/forgot-password">Reset it by email</Link>.
        </p>
        <form action={changePassword}>
          <label htmlFor="currentPassword">Current password</label>
          <input id="currentPassword" name="currentPassword" type="password" required maxLength={200} autoComplete="current-password" />
          <label htmlFor="password">
            New password <span className="hint">At least 10 characters.</span>
          </label>
          <input id="password" name="password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" />
          <label htmlFor="passwordAgain">New password again</label>
          <input id="passwordAgain" name="passwordAgain" type="password" required minLength={10} maxLength={72} autoComplete="new-password" />
          <SubmitButton className="button mt-3" pendingText="Saving…">Change password</SubmitButton>
        </form>
      </section>

      <section className="mt-12 border-t border-rule pt-4">
        <h2 className="mt-0">Delete account</h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          This removes your profile, memberships and RSVPs. Your posts stay so conversations still make sense, but they
          will say &ldquo;deleted user&rdquo;. If you own a group, make one of its page managers the page admin first; otherwise it goes
          read-only, its upcoming events are cancelled, and someone else can ask to take it over.
        </p>
        <form action={deleteAccount}>
          <label htmlFor="confirm">
            Type <strong>DELETE</strong> to confirm
          </label>
          <input id="confirm" name="confirm" type="text" required pattern="DELETE" className="max-w-48" />
          <SubmitButton className="button button-danger mt-2" pendingText="Deleting…">Delete my account</SubmitButton>
        </form>
      </section>
    </>
  );
}
