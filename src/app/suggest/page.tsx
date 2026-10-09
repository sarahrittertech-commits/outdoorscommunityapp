import type { Metadata } from "next";

import { submitSuggestion } from "@/app/actions/suggestions";
import { Notice } from "@/components/Notice";
import { requireViewer } from "@/lib/auth";
import { SUGGESTION_KIND_LABELS } from "@/lib/suggestions";
import { SUGGESTION_KINDS } from "@/lib/validation";

export const metadata: Metadata = { title: "Suggest something", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** UC-32, FR-AD-4 and FR-AD-5. Visitors are sent to sign in first. */
export default async function SuggestPage({ searchParams }: Props) {
  await requireViewer("/suggest");

  return (
    <>
      <h1>Suggest something</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        A region the board should cover, a feature, a group to invite or an event to add. Only the site admin reads
        suggestions; they aren&apos;t shown on the board. You&apos;ll see what happens to yours under My stuff.
      </p>
      <Notice params={await searchParams} />
      <form action={submitSuggestion} className="max-w-prose">
        <fieldset className="mt-3">
          <legend className="font-semibold">What kind of suggestion?</legend>
          {SUGGESTION_KINDS.map((kind) => (
            <label key={kind} className="check mt-1">
              <input type="radio" name="kind" value={kind} required />
              {SUGGESTION_KIND_LABELS[kind]}
            </label>
          ))}
        </fieldset>
        <label htmlFor="title">
          Title <span className="hint">3 to 120 characters</span>
        </label>
        <input id="title" name="title" type="text" required minLength={3} maxLength={120} />
        <label htmlFor="details">
          Details <span className="hint">Optional, up to 2,000 characters</span>
        </label>
        <textarea id="details" name="details" maxLength={2000} className="min-h-28" />
        <label htmlFor="link">
          Link <span className="hint">Optional: the group&apos;s website, the event page</span>
        </label>
        <input id="link" name="link" type="url" maxLength={500} placeholder="https://" />
        <button className="button mt-3">Send suggestion</button>
      </form>
    </>
  );
}
