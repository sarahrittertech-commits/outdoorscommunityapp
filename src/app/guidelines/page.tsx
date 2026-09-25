import type { Metadata } from "next";

import { site } from "@/config/site";

export const metadata: Metadata = { title: "Community guidelines" };

/** FR-MD-5. Draft wording, to be reviewed before launch. */
export default function GuidelinesPage() {
  return (
    <article className="max-w-prose">
      <h1>Community guidelines</h1>
      <p className="mt-1 text-sm text-muted">Draft — to be reviewed before launch.</p>
      <p className="mt-3">{site.name} works because people treat each other well. In short:</p>
      <ol className="mt-3 list-decimal space-y-2 pl-6">
        <li>
          <strong>Be kind.</strong> No harassment, threats, hate or personal attacks, in posts or at events.
        </li>
        <li>
          <strong>Be honest about events.</strong> Describe the distance, difficulty and risks accurately. Everyone takes
          part at their own risk, and organizers are volunteers.
        </li>
        <li>
          <strong>No selling.</strong> This is not a place to advertise guided trips, gear or services.
        </li>
        <li>
          <strong>Respect privacy.</strong> Don&apos;t share other people&apos;s contact details, addresses or photos
          without asking.
        </li>
        <li>
          <strong>Leave no trace.</strong> Follow land rules, permits and closures.
        </li>
        <li>
          <strong>Adults only.</strong> Accounts are for people 18 and over.
        </li>
      </ol>
      <h2>Moderation</h2>
      <p className="mt-2">
        Group organizers moderate their own groups. Anyone signed in can report a post, event, group or profile. The
        site admin reviews reports and can remove content, remove groups and suspend accounts. Every moderation action
        is logged.
      </p>
    </article>
  );
}
