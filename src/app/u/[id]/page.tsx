import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlainText } from "@/components/PlainText";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

/** FR-AC-4: display name, area and bio. Nothing else. */
export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id, display_name, bio, area, created_at").eq("id", id).maybeSingle();
  if (!profile?.display_name) notFound();
  const viewer = await getViewer();

  return (
    <>
      <h1>{profile.display_name}</h1>
      {profile.area && <p className="text-muted">{profile.area}</p>}
      {profile.bio && <PlainText text={profile.bio} className="mt-3 max-w-prose" />}
      <p className="mt-2 text-sm text-muted">Member since {new Date(profile.created_at).getFullYear()}</p>
      {viewer && viewer.id !== profile.id && (
        <p className="mt-8 text-sm">
          <Link href={`/report?type=profile&id=${profile.id}&next=/u/${profile.id}`} className="text-muted">
            Report this profile
          </Link>
        </p>
      )}
    </>
  );
}
