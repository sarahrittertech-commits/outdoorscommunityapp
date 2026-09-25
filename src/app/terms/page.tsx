import type { Metadata } from "next";
import Link from "next/link";

import { site } from "@/config/site";

export const metadata: Metadata = { title: "Terms of use" };

/** FR-MD-5. Draft wording, to be reviewed before launch. */
export default function TermsPage() {
  return (
    <article className="max-w-prose">
      <h1>Terms of use</h1>
      <p className="mt-1 text-sm text-muted">Draft — to be reviewed before launch. Not legal advice.</p>
      <ol className="mt-4 list-decimal space-y-3 pl-6">
        <li>You must be 18 or older to create an account.</li>
        <li>
          You&apos;re responsible for what you post and for following the <Link href="/guidelines">community guidelines</Link>.
        </li>
        <li>
          {site.name} lists groups and events organized by volunteers. We don&apos;t run, supervise or check any event.
          Outdoor activities carry real risks; you take part at your own risk and should judge for yourself whether an
          event is right for you.
        </li>
        <li>We may remove content or suspend accounts that break these terms or the guidelines.</li>
        <li>You can delete your account at any time from your profile page.</li>
        <li>
          The service is provided as is, without warranties. We may change these terms and will post changes here.
        </li>
      </ol>
      <p className="mt-6">
        Contact: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
      </p>
    </article>
  );
}
