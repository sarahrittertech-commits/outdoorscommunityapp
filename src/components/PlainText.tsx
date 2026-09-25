import { Fragment } from "react";

import { parsePlainText, USER_LINK_REL } from "@/lib/text";

/** Renders user-written text safely: paragraphs, line breaks and links only. */
export function PlainText({ text, className }: { text: string; className?: string }) {
  const paragraphs = parsePlainText(text);
  return (
    <div className={className}>
      {paragraphs.map((lines, p) => (
        <p key={p} className="mt-3 first:mt-0 break-words">
          {lines.map((segments, l) => (
            <Fragment key={l}>
              {l > 0 && <br />}
              {segments.map((segment, s) =>
                segment.kind === "link" ? (
                  <a key={s} href={segment.href} rel={USER_LINK_REL} target="_blank">
                    {segment.value}
                  </a>
                ) : (
                  <Fragment key={s}>{segment.value}</Fragment>
                ),
              )}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
