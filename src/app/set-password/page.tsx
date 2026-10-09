import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { setNewPassword } from "@/app/actions/auth";
import { Notice } from "@/components/Notice";
import { getViewer } from "@/lib/auth";
import { safeNext, withMessage } from "@/lib/navigation";
import { RESET_COOKIE } from "@/lib/password-reset";

export const metadata: Metadata = { title: "Create your password", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * UC-29, FR-AC-18: reached only through the sign-up confirmation link. The
 * new member chooses their password, types it again to confirm, and goes on
 * to the welcome step and then wherever they were headed.
 */
export default async function SetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : undefined);
  const viewer = await getViewer();
  const fromLink = (await cookies()).get(RESET_COOKIE)?.value;
  if (!viewer || fromLink !== viewer.id) redirect(withMessage("/forgot-password", { e: "reset_link_needed" }));

  return (
    <>
      <h1>Create your password</h1>
      <p className="mt-1 max-w-prose text-subtle">
        Your email address is confirmed. Choose a password, then type it again to make sure it&apos;s right.
      </p>
      <Notice params={params} />
      <form action={setNewPassword} className="mt-2">
        <input type="hidden" name="mode" value="create" />
        <input type="hidden" name="next" value={next} />
        <label htmlFor="password">
          Password <span className="hint">At least 10 characters. A short sentence works well.</span>
        </label>
        <input id="password" name="password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" />
        <label htmlFor="passwordAgain">Password again</label>
        <input id="passwordAgain" name="passwordAgain" type="password" required minLength={10} maxLength={72} autoComplete="new-password" />
        <button className="button mt-4">Create password</button>
      </form>
    </>
  );
}
