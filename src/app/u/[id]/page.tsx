import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { clearProfileSection } from "@/app/actions/profile";
import { Notice } from "@/components/Notice";
import { PlainText } from "@/components/PlainText";
import { SubmitButton } from "@/components/SubmitButton";
import { getViewer } from "@/lib/auth";
import { findTown } from "@/lib/geo";
import { CLEARABLE_SECTIONS, goalsDoneLine, goalYear, promptText, type ProfileSection } from "@/lib/profile";
import { signProfilePhoto } from "@/lib/profilePhotos";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation";

// Profiles stay out of search engines, organizers' included (FR-PR-8): an
// organizer's profile is public to read, but nobody needs it indexed.
export const metadata: Metadata = { title: "Profile", robots: { index: false } };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** "Brevard, NC" for a listed town; an older free-text area as typed. */
function townLine(town: string): string {
  const listed = findTown(town);
  return listed ? `${listed.name}, ${listed.state}` : town;
}

/**
 * UC-33 (FR-PR-1 to FR-PR-10). Who sees more than the display name is
 * decided by the database (can_view_profile, profile_card and each table's
 * policy); this page shows what comes back. Hidden and blank sections are
 * left out entirely.
 */
export default async function ProfilePage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: profile }, viewer, { data: cards }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, created_at").eq("id", id).maybeSingle(),
    getViewer(),
    supabase.rpc("profile_card", { p_user: id }),
  ]);
  if (!profile?.display_name) notFound();
  const card = cards?.[0];
  const isSelf = viewer?.id === profile.id;
  const query = await searchParams;

  const actions = (
    <>
      {!isSelf && (
        <p className="mt-4">
          {/* UC-20: the first message arrives as a request (FR-DM-1). Signed-out visitors are asked to sign in. */}
          <Link href={`/messages/new?to=${profile.id}`} className="button button-plain">
            Message
          </Link>
        </p>
      )}
    </>
  );

  const report = viewer && !isSelf && (
    <p className="mt-8 text-sm">
      <Link href={`/report?type=profile&id=${profile.id}&next=/u/${profile.id}`} className="text-muted">
        Report this profile
      </Link>
    </p>
  );

  if (!card?.can_view) {
    return (
      <>
        <h1>{profile.display_name}</h1>
        <Notice params={query} />
        <p className="mt-2 text-muted">
          {card?.could_see_more ? (
            <>
              <Link href={`/signin?next=/u/${profile.id}`}>Sign in</Link> to see more.
            </>
          ) : (
            "This profile is private."
          )}
        </p>
        {actions}
        {report}
      </>
    );
  }

  const year = goalYear();
  const [{ data: activities }, { data: prompts }, { data: goals }, { data: memberships }, { data: about }, photoUrl] =
    await Promise.all([
      supabase.from("profile_activities").select("categories(slug, name, sort_order)").eq("user_id", id),
      supabase.from("profile_prompts").select("prompt_key, answer, position").eq("user_id", id).order("position"),
      supabase.from("profile_goals").select("id, body, done, position").eq("user_id", id).eq("year", year).order("position"),
      card.show_groups
        ? supabase
            .from("group_members")
            .select("groups!inner(slug, name, status)")
            .eq("user_id", id)
            .eq("status", "active")
            .eq("groups.status", "active")
        : Promise.resolve({ data: [] }),
      // The owner's own settings, to mark what others don't see.
      isSelf
        ? supabase.from("profile_about").select("show_photo, show_town, show_bio, show_activities, show_prompts, show_goals, show_groups").eq("user_id", id).maybeSingle()
        : Promise.resolve({ data: null }),
      signProfilePhoto(supabase, card.photo_path),
    ]);

  const hidden = (section: ProfileSection) =>
    isSelf && about !== null && about[`show_${section}`] === false ? (
      <span className="ml-2 text-sm font-normal text-muted">(hidden: only you see this)</span>
    ) : null;

  const enjoys = (activities ?? [])
    .map((a) => a.categories)
    .filter((c) => c !== null)
    .toSorted((a, b) => a.sort_order - b.sort_order);
  const answered = (prompts ?? []).filter((p) => promptText(p.prompt_key));
  const groups = (memberships ?? [])
    .map((m) => m.groups)
    .filter((g) => g !== null)
    .toSorted((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <Notice params={query} />
      {isSelf && (
        <p className="mb-4 text-sm text-muted">
          This is your profile. <Link href="/me/profile">Edit it</Link>. Sections marked hidden are for you only.
        </p>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        {photoUrl && (
          <figure className="m-0 shrink-0">
            <Image
              src={photoUrl}
              alt={card.photo_alt ?? profile.display_name}
              width={120}
              height={120}
              unoptimized
              className="block h-[120px] w-[120px] rounded border border-rule object-cover"
            />
            {hidden("photo")}
          </figure>
        )}
        <div className="min-w-0">
          <h1 className="m-0">{profile.display_name}</h1>
          <p className="mt-1 text-muted">
            {card.town && (
              <>
                {townLine(card.town)}
                {hidden("town")} ·{" "}
              </>
            )}
            member since {new Date(profile.created_at).getFullYear()}
          </p>
          {card.bio && (
            <div className="mt-3 max-w-prose">
              <PlainText text={card.bio} />
              {hidden("bio")}
            </div>
          )}
          {enjoys.length > 0 && (
            <p className="mt-3">
              <strong>Enjoys:</strong>{" "}
              {enjoys.map((c, i) => (
                <span key={c.slug}>
                  {i > 0 && ", "}
                  <Link href={`/c/${c.slug}`}>{c.name.toLowerCase()}</Link>
                </span>
              ))}
              {hidden("activities")}
            </p>
          )}
          {actions}
        </div>
      </div>

      {answered.length > 0 && (
        <section className="mt-8 border-t border-rule pt-4">
          {hidden("prompts")}
          <ul className="m-0 list-none p-0">
            {answered.map((p) => (
              <li key={p.prompt_key} className="mt-1">
                <span className="text-muted">{promptText(p.prompt_key)} …</span> {p.answer}
              </li>
            ))}
          </ul>
        </section>
      )}

      {goals && goals.length > 0 && (
        <section className="mt-8 border-t border-rule pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0">
              {year} adventure goals{hidden("goals")}
            </h2>
            <span className="text-sm text-muted">{goalsDoneLine(goals)}</span>
          </div>
          <ul className="mt-2 list-none p-0">
            {goals.map((g) => (
              <li key={g.id} className="mt-1">
                <span aria-hidden="true" className="mr-2 inline-block w-5 font-bold">
                  {g.done ? "☑" : "☐"}
                </span>
                <span className="sr-only">{g.done ? "Done: " : "Not yet: "}</span>
                {g.body}
              </li>
            ))}
          </ul>
        </section>
      )}

      {groups.length > 0 && (
        <section className="mt-8 border-t border-rule pt-4">
          <h2 className="m-0">Groups{hidden("groups")}</h2>
          <p className="mt-2">
            {groups.map((g, i) => (
              <span key={g.slug}>
                {i > 0 && " · "}
                <Link href={`/g/${g.slug}`}>{g.name}</Link>
              </span>
            ))}
          </p>
        </section>
      )}

      {report}

      {viewer?.isSiteAdmin && !isSelf && (
        <section className="mt-8 border-t border-rule pt-4">
          <h2 className="m-0 text-xl">Site admin: clear part of this profile</h2>
          <p className="mt-1 text-sm text-muted">Logged in the moderation log with what was removed.</p>
          <form action={clearProfileSection.bind(null, profile.id)}>
            <label htmlFor="section">Section</label>
            <select id="section" name="section" className="max-w-xs">
              {CLEARABLE_SECTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <label htmlFor="reason">
              Reason <span className="hint">Optional</span>
            </label>
            <input id="reason" name="reason" type="text" maxLength={500} />
            <SubmitButton className="button button-danger mt-3" pendingText="Clearing…">
              Clear it
            </SubmitButton>
          </form>
        </section>
      )}
    </>
  );
}
