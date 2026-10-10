import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signIn } from "@/app/actions/auth";
import { Notice } from "@/components/Notice";
import { getViewer } from "@/lib/auth";
import { safeNext } from "@/lib/navigation";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** UC-29, FR-AC-19: email and password. */
export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : undefined);
  if (await getViewer()) redirect(next);
  const withNext = (path: string) => (next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`);

  return (
    <>
      <h1>Sign in</h1>
      <p className="mt-1 max-w-prose text-muted">
        New here? <Link href={withNext("/signup")}>Create an account</Link>. Your email address is never shown to anyone.
      </p>
      <Notice params={params} />
      <form action={signIn} className="mt-2">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" required autoComplete="email" maxLength={254} />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" maxLength={200} />
        <SubmitButton className="button mt-3" pendingText="Signing in…">Sign in</SubmitButton>
      </form>
      <p className="mt-4 text-sm">
        <Link href="/forgot-password">Forgot password?</Link>
      </p>
    </>
  );
}
