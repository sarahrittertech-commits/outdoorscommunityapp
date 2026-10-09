import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signUp } from "@/app/actions/auth";
import { Notice } from "@/components/Notice";
import { getViewer } from "@/lib/auth";
import { safeNext } from "@/lib/navigation";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** UC-29, FR-AC-17 and FR-AC-18. */
export default async function SignUpPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : undefined);
  if (await getViewer()) redirect(next);
  const signInHref = next === "/" ? "/signin" : `/signin?next=${encodeURIComponent(next)}`;

  return (
    <>
      <h1>Create an account</h1>
      <p className="mt-1 max-w-prose text-muted">
        We&apos;ll email you a link to confirm your address before you can sign in. Your email address is never shown to
        anyone. Already have an account? <Link href={signInHref}>Sign in</Link>.
      </p>
      <Notice params={params} />
      <form action={signUp} className="mt-2">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" required autoComplete="email" maxLength={254} />
        <label htmlFor="password">
          Password <span className="hint">At least 10 characters. A short sentence works well.</span>
        </label>
        <input id="password" name="password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" />
        <label htmlFor="passwordAgain">Password again</label>
        <input id="passwordAgain" name="passwordAgain" type="password" required minLength={10} maxLength={72} autoComplete="new-password" />
        <button className="button mt-3">Create account</button>
      </form>
    </>
  );
}
