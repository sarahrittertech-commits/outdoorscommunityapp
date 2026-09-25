import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { sendSignInLink } from "@/app/actions/auth";
import { Notice } from "@/components/Notice";
import { getViewer, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** FR-AC-1: one form for signing up and signing in. No passwords. */
export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : undefined);
  if (await getViewer()) redirect(next);

  return (
    <>
      <h1>Sign in or sign up</h1>
      <p className="mt-1 max-w-prose text-muted">
        Enter your email and we&apos;ll send you a link. Click it and you&apos;re in. There&apos;s no password to remember,
        and your email address is never shown to anyone.
      </p>
      <Notice params={params} />
      <form action={sendSignInLink} className="mt-2">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" required autoComplete="email" maxLength={254} />
        <button className="button mt-3">Email me a sign-in link</button>
      </form>
    </>
  );
}
