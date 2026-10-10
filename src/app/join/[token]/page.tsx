import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signUp } from "@/app/actions/auth";
import { joinByInvite } from "@/app/actions/invites";
import { Notice } from "@/components/Notice";
import { site } from "@/config/site";
import { getViewer } from "@/lib/auth";
import { loadGroup } from "@/lib/groups";
import { createClient } from "@/lib/supabase/server";
import { inviteTokenSchema } from "@/lib/validation";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Join by invite", robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function NotWorking() {
  return (
    <>
      <h1>That invite link isn&apos;t working</h1>
      <p className="mt-2 max-w-prose">
        Check that the whole link was copied. If it was, it may have been turned off or expired: ask the group for a new one.
      </p>
      <p className="mt-4">
        <Link href="/browse">Browse groups</Link>
      </p>
    </>
  );
}

/**
 * FR-MB-14: one page for an invite link or an email invite.
 *
 * - Signed out: what the group is and where they are, and a form that
 *   creates their account (Supabase Auth, UC-29's rules) with the
 *   confirmation link pointing back here.
 * - Signed in but not onboarded: the welcome step, then back here.
 * - Signed in: a *Join* button. Joining is a POST, never the page load, so
 *   link previews and prefetching never join anyone or use up an invite.
 *
 * invite_preview() returns only the group's name and slug, and nothing for
 * a bad, turned-off or expired code. The database checks everything again
 * when Join is pressed.
 */
export default async function JoinPage({ params, searchParams }: Props) {
  const { token } = await params;
  if (!inviteTokenSchema.safeParse(token).success) return <NotWorking />;

  const supabase = await createClient();
  const [{ data: preview }, viewer] = await Promise.all([
    supabase.rpc("invite_preview", { p_token: token }),
    getViewer(),
  ]);
  const group = preview?.[0];
  if (!group) return <NotWorking />;

  const here = `/join/${token}`;
  const query = await searchParams;

  if (!viewer) {
    const checkEmail = query.m === "signup_sent";
    return (
      <>
        <h1>
          {group.name} is on {site.name}
        </h1>
        <p className="mt-2 max-w-prose">
          {site.name} is the community board {group.name} uses for its events and discussions. You&apos;re creating a free
          account and joining the group in one step.
        </p>
        {checkEmail ? (
          <p role="status" className="mt-4 rounded bg-notice px-3 py-2">
            Check your email. The link confirms your address, lets you create your password, and brings you straight back to
            join {group.name}. Nothing arrived? If you&apos;ve signed up before, you already have an account:{" "}
            <Link href={`/forgot-password`}>reset your password</Link>, then sign in and come back to this link.
          </p>
        ) : (
          <>
            <Notice params={query} />
            <h2>Create your account and join</h2>
            <form action={signUp} className="mt-2">
              <input type="hidden" name="next" value={here} />
              <label htmlFor="email">
                Email address <span className="hint">Never shown to anyone.</span>
              </label>
              <input id="email" name="email" type="email" required autoComplete="email" maxLength={254} />
              <SubmitButton className="button mt-4" pendingText="Sending…">Email me the link</SubmitButton>
            </form>
          </>
        )}
        <p className="mt-4">
          Already have an account? <Link href={`/signin?next=${encodeURIComponent(here)}`}>Sign in</Link>
        </p>
      </>
    );
  }

  if (!viewer.onboarded) redirect(`/welcome?next=${encodeURIComponent(here)}`);

  // Already in: nothing to do but go there.
  const { isMember } = await loadGroup(group.slug);
  if (isMember) redirect(`/g/${group.slug}`);

  return (
    <>
      <h1>{group.name} invites you</h1>
      <Notice params={query} />
      <p className="mt-2 max-w-prose">
        Join to see the group&apos;s events and discussions on {site.name}. No approval needed; you can leave at any time.
      </p>
      <form action={joinByInvite.bind(null, token)} className="mt-4">
        <SubmitButton className="button" pendingText="Joining…">Join {group.name}</SubmitButton>
      </form>
    </>
  );
}
