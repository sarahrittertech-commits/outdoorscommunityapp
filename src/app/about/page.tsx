import type { Metadata } from "next";
import Link from "next/link";

import { site } from "@/config/site";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className="max-w-prose">
      <h1>About {site.name}</h1>
      <p className="mt-3">{site.description}</p>
      <p className="mt-3">
        It works the way the web used to: a directory you can read without signing up, organized by activity. Every
        group has a page, a calendar and, if it wants one, a discussion board.
      </p>
      <h2>What we don&apos;t do</h2>
      <ul className="mt-2 list-disc pl-6">
        <li>No feed and no algorithm. Lists are sorted by name or by date, and say so.</li>
        <li>No ads, no promoted groups and no tracking scripts.</li>
        <li>No likes, follower counts or notification badges.</li>
        <li>Email only when it&apos;s useful, and every email has an unsubscribe link.</li>
      </ul>
      <h2>Who it&apos;s for</h2>
      <p className="mt-2">{site.audience}</p>
      <p className="mt-6">
        Questions? <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> · <Link href="/guidelines">Community guidelines</Link>
      </p>
    </article>
  );
}
