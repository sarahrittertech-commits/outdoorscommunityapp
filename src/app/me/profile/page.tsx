import type { Metadata } from "next";
import Link from "next/link";

import { changePassword, deleteAccount, saveProfile } from "@/app/actions/auth";
import { Notice } from "@/components/Notice";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** FR-AC-3, FR-AC-6 and FR-AC-21. */
export default async function ProfilePage({ searchParams }: Props) {
  const viewer = await requireViewer("/me/profile");
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("display_name, bio, area").eq("id", viewer.id).single();

  return (
    <>
      <p className="breadcrumb">
        <Link href="/me">my stuff</Link> ›
      </p>
      <h1>Profile</h1>
      <Notice params={await searchParams} />
      <p className="mt-1 text-sm text-muted">
        Everyone can see your display name, area and bio. Nobody can see your email address.{" "}
        <Link href={`/u/${viewer.id}`}>View your public profile</Link>.
      </p>

      <form action={saveProfile}>
        <label htmlFor="displayName">Display name</label>
        <input id="displayName" name="displayName" type="text" required minLength={2} maxLength={40} defaultValue={profile?.display_name ?? ""} />
        <label htmlFor="area">Area</label>
        <input id="area" name="area" type="text" maxLength={80} defaultValue={profile?.area ?? ""} />
        <label htmlFor="bio">About you</label>
        <textarea id="bio" name="bio" maxLength={280} className="min-h-20" defaultValue={profile?.bio ?? ""} />
        <button className="button mt-3">Save profile</button>
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
          <button className="button mt-3">Change password</button>
        </form>
      </section>

      <section className="mt-12 border-t border-rule pt-4">
        <h2 className="mt-0">Delete account</h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          This removes your profile, memberships and RSVPs. Your posts stay so conversations still make sense, but they
          will say &ldquo;deleted user&rdquo;. If you own a group, transfer it to one of its admins first; otherwise it goes
          read-only, its upcoming events are cancelled, and someone else can ask to take it over.
        </p>
        <form action={deleteAccount}>
          <label htmlFor="confirm">
            Type <strong>DELETE</strong> to confirm
          </label>
          <input id="confirm" name="confirm" type="text" required pattern="DELETE" className="max-w-48" />
          <button className="button button-danger mt-2">Delete my account</button>
        </form>
      </section>
    </>
  );
}
