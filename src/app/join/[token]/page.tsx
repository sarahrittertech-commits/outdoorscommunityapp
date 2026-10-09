import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { joinByInvite } from "@/app/actions/invites";
import { Notice } from "@/components/Notice";
import { site } from "@/config/site";
import { getViewer } from "@/lib/auth";
import { inviteTokenSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Join by invite", robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * FR-MB-14: an invite link or email invite. Joining is a button, not the
 * page load, so link previews and prefetching never join anyone. The
 * database checks the code, the group and the person when it is pressed.
 */
export default async function JoinPage({ params, searchParams }: Props) {
  const { token } = await params;
  const valid = inviteTokenSchema.safeParse(token).success;

  if (!valid) {
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

  const here = `/join/${token}`;
  const viewer = await getViewer();
  if (!viewer) redirect(`/signin?next=${encodeURIComponent(here)}`);
  if (!viewer.onboarded) redirect(`/welcome?next=${encodeURIComponent(here)}`);

  return (
    <>
      <h1>You&apos;ve been invited to a group</h1>
      <Notice params={await searchParams} />
      <p className="mt-2 max-w-prose">
        Someone who runs a group on {site.name} sent you this invite. Accept it to join the group straight away; you can leave
        at any time.
      </p>
      <form action={joinByInvite.bind(null, token)} className="mt-4">
        <button className="button">Accept invite</button>
      </form>
    </>
  );
}
