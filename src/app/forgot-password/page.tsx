import type { Metadata } from "next";
import Link from "next/link";

import { sendPasswordReset } from "@/app/actions/auth";
import { Notice } from "@/components/Notice";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** UC-29, FR-AC-20: the same answer whether or not the address has an account. */
export default async function ForgotPasswordPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <>
      <h1>Forgot password</h1>
      <p className="mt-1 max-w-prose text-muted">
        Enter the email address you signed up with and we&apos;ll send you a link to set a new password. The link works
        once, for 1 hour.
      </p>
      <Notice params={params} />
      <form action={sendPasswordReset} className="mt-2">
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" required autoComplete="email" maxLength={254} />
        <button className="button mt-3">Email me a link</button>
      </form>
      <p className="mt-4 text-sm">
        <Link href="/signin">Back to sign in</Link>
      </p>
    </>
  );
}
