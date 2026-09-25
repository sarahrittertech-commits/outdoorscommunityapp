import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { submitReport } from "@/app/actions/moderation";
import { Notice } from "@/components/Notice";
import { ReportTarget } from "@/components/ReportTarget";
import { requireViewer, safeNext } from "@/lib/auth";
import { reportSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Report", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const REASONS = [
  ["spam", "Spam or advertising"],
  ["harassment", "Harassment or abuse"],
  ["unsafe", "Unsafe or dangerous"],
  ["off_topic", "Off-topic or in the wrong place"],
  ["other", "Something else"],
] as const;

/** FR-MD-1. */
export default async function ReportPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : undefined);
  const target = reportSchema.pick({ targetType: true, targetId: true }).safeParse({ targetType: params.type, targetId: params.id });
  if (!target.success) notFound();
  await requireViewer(`/report?type=${target.data.targetType}&id=${target.data.targetId}&next=${encodeURIComponent(next)}`);

  return (
    <>
      <h1>Report a {target.data.targetType}</h1>
      <p className="mt-1">
        <ReportTarget type={target.data.targetType} id={target.data.targetId} />
      </p>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Reports about things inside a group go to that group&apos;s organizers and to the site admin. Reports about a
        group or a person go to the site admin. Your name is not shown to the person you report.
      </p>
      <Notice params={params} />
      <form action={submitReport}>
        <input type="hidden" name="targetType" value={target.data.targetType} />
        <input type="hidden" name="targetId" value={target.data.targetId} />
        <input type="hidden" name="next" value={next} />
        <fieldset className="mt-3">
          <legend className="font-semibold">What&apos;s wrong?</legend>
          {REASONS.map(([value, label]) => (
            <label key={value} className="check mt-1">
              <input type="radio" name="reason" value={value} required />
              {label}
            </label>
          ))}
        </fieldset>
        <label htmlFor="note">
          Anything else? <span className="hint">Optional</span>
        </label>
        <textarea id="note" name="note" maxLength={1000} className="min-h-20" />
        <button className="button mt-3">Send report</button>
      </form>
    </>
  );
}
