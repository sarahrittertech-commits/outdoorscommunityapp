import type { Metadata } from "next";

import { site } from "@/config/site";

export const metadata: Metadata = { title: "Privacy" };

/** TR-PRIV-5. Plain language, in the same style as the bike map's policy. Draft. */
export default function PrivacyPage() {
  return (
    <article className="max-w-prose">
      <h1>Privacy</h1>
      <p className="mt-1 text-sm text-muted">Draft — to be reviewed before launch.</p>

      <h2>What we collect</h2>
      <ul className="mt-2 list-disc pl-6">
        <li>Your email address, to send sign-in links and the emails you choose to get. Nobody else can see it.</li>
        <li>Your display name, and your area and bio if you add them. These are public.</li>
        <li>What you do on the board: groups you join, events you RSVP to, posts you write, reports you send.</li>
      </ul>

      <h2>What we don&apos;t do</h2>
      <ul className="mt-2 list-disc pl-6">
        <li>No advertising, and we never sell or share your data.</li>
        <li>No analytics or tracking scripts. The only cookie is the one that keeps you signed in.</li>
        <li>No phone number, birth date or location tracking.</li>
      </ul>

      <h2>Who can see what</h2>
      <p className="mt-2">
        Group pages and events are public. Member lists, who&apos;s going to an event, members-only addresses and
        discussion boards are visible only to that group&apos;s members. These rules are enforced by the database
        itself.
      </p>

      <h2>Deleting your account</h2>
      <p className="mt-2">
        You can delete your account from your profile page. Your profile, memberships and RSVPs are removed straight
        away and your sign-in record within 24 hours. Posts you wrote stay, marked &ldquo;deleted user&rdquo;.
      </p>

      <h2>Where data lives</h2>
      <p className="mt-2">
        Data is stored with Supabase (database and sign-in) and the site runs on Railway. Emails are sent through
        Resend.
      </p>

      <p className="mt-6">
        Questions: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
      </p>
    </article>
  );
}
