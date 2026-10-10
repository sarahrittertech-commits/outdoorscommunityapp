import type { Metadata } from "next";
import Link from "next/link";

import { confirmEmailLink } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { LINK_TYPES } from "@/lib/email-links";
import { safeNext } from "@/lib/navigation";

export const metadata: Metadata = { title: "Continue", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * UC-29: where an emailed link lands. Nothing happens until the person
 * presses Continue, so mail scanners and link previews that open the link
 * first can't use it up, and the link works in any browser or app.
 */
export default async function ConfirmPage({ searchParams }: Props) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const type = typeof params.type === "string" ? params.type : "";
  const next = safeNext(typeof params.next === "string" ? params.next : undefined);
  const valid = /^[A-Za-z0-9_-]{8,200}$/.test(tokenHash) && (LINK_TYPES as readonly string[]).includes(type);

  if (!valid) {
    return (
      <>
        <h1>That link isn&apos;t working</h1>
        <p className="mt-1 max-w-prose text-subtle">
          It may be incomplete or already used. <Link href="/forgot-password">Send a new link</Link> or{" "}
          <Link href="/signin">sign in</Link>.
        </p>
      </>
    );
  }

  const isReset = type === "recovery";
  return (
    <>
      <h1>{isReset ? "Reset your password" : "Confirm your email"}</h1>
      <p className="mt-1 max-w-prose text-subtle">
        {isReset
          ? "Press Continue to choose a new password."
          : "Press Continue to confirm your address and create your password."}
      </p>
      <form action={confirmEmailLink}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next} />
        <SubmitButton pendingText="One moment…">Continue</SubmitButton>
      </form>
    </>
  );
}
