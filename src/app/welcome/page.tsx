import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { completeOnboarding } from "@/app/actions/auth";
import { Notice } from "@/components/Notice";
import { site } from "@/config/site";
import { getViewer, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** FR-AC-2 and FR-AC-3: name, 18+, terms. Nothing else is required. */
export default async function WelcomePage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : undefined);
  const viewer = await getViewer();
  if (!viewer) redirect(`/signin?next=${encodeURIComponent(next)}`);
  if (viewer.onboarded) redirect(next);

  return (
    <>
      <h1>Welcome to {site.name}</h1>
      <p className="mt-1 max-w-prose text-muted">One step before you join groups: tell people what to call you.</p>
      <Notice params={params} />
      <form action={completeOnboarding}>
        <input type="hidden" name="next" value={next} />
        <label htmlFor="displayName">
          Display name <span className="hint">Shown on your posts and RSVPs. A first name is fine.</span>
        </label>
        <input id="displayName" name="displayName" type="text" required minLength={2} maxLength={40} />

        <label htmlFor="area">
          Area <span className="hint">Optional, e.g. Brevard</span>
        </label>
        <input id="area" name="area" type="text" maxLength={80} />

        <label htmlFor="bio">
          About you <span className="hint">Optional, up to 280 characters</span>
        </label>
        <textarea id="bio" name="bio" maxLength={280} className="min-h-20" />

        <label className="check mt-5">
          <input type="checkbox" name="confirmAdult" required />I am 18 or older.
        </label>
        <label className="check mt-2">
          <input type="checkbox" name="acceptTerms" required />I accept the <Link href="/terms">terms</Link> and{" "}
          <Link href="/guidelines">community guidelines</Link>.
        </label>

        <button className="button mt-5">Continue</button>
      </form>
    </>
  );
}
