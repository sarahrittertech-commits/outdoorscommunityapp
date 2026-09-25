// Plain-text posts (FR-DS-7, TR-SEC-6). User text is never treated as HTML.
// It is split into paragraphs, lines and links, and React escapes every
// piece of text when it renders.

export type TextSegment = { kind: "text"; value: string } | { kind: "link"; href: string; value: string };
export type TextParagraph = TextSegment[][]; // lines, each a list of segments

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/gi;

function segmentLine(line: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of line.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ kind: "text", value: line.slice(last, index) });
    segments.push({ kind: "link", href: match[0], value: match[0] });
    last = index + match[0].length;
  }
  if (last < line.length) segments.push({ kind: "text", value: line.slice(last) });
  return segments;
}

/** Blank lines separate paragraphs; single line breaks are kept within one. */
export function parsePlainText(input: string): TextParagraph[] {
  return input
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => block.split("\n").map(segmentLine));
}

/** Link attributes for user-supplied links. */
export const USER_LINK_REL = "nofollow ugc noopener noreferrer";
