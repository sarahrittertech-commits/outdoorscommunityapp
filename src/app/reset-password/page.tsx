import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { setNewPassword } from "@/app/actions/auth";
import { Notice } from "@/components/Notice";
import { getViewer } from "@/lib/auth";
import { withMessage } from "@/lib/navigation";
import { RESET_COOKIE } from "@/lib/password-reset";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** UC-29, FR-AC-20: reached only through the emailed reset link. */
export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const viewer = await getViewer();
  const fromLink = (await cookies()).get(RESET_COOKIE)?.value;
  if (!viewer || fromLink !== viewer.id) redirect(withMessage("/forgot-password", { e: "reset_link_needed" }));

  return (
    <>
      <h1>Set a new password</h1>
      <p className="mt-1 max-w-prose text-muted">
        Choose a new password. Any other devices signed in to your account will be signed out.
      </p>
      <Notice params={params} />
      <form action={setNewPassword} className="mt-2">
        <label htmlFor="password">
          New password <span className="hint">At least 10 characters.</span>
        </label>
        <input id="password" name="password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" />
        <label htmlFor="passwordAgain">New password again</label>
        <input id="passwordAgain" name="passwordAgain" type="password" required minLength={10} maxLength={72} autoComplete="new-password" />
        <button className="button mt-3">Set password</button>
      </form>
    </>
  );
}
