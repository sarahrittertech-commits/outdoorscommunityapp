import type { Metadata } from "next";
import Link from "next/link";

import { deleteAccount, saveProfile } from "@/app/actions/auth";
import { Notice } from "@/components/Notice";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** FR-AC-3 and FR-AC-6. */
export default async function ProfilePage({ searchParams }: Props) {
  const viewer = await requireViewer("/me/profile");
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("display_name, bio, area").eq("id", viewer.id).single();

  return (
    <>
      <p className="text-sm">
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
        <h2 className="mt-0">Delete account</h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          This removes your profile, memberships and RSVPs. Your posts stay so conversations still make sense, but they
          will say &ldquo;deleted user&rdquo;. If you own a group, transfer or archive it first.
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
