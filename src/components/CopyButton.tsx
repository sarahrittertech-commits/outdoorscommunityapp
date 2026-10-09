"use client";

import { useEffect, useState } from "react";

/**
 * Copies text to the clipboard. Progressive enhancement: it renders only
 * once JavaScript runs, so without it the link next to it is still there
 * to select and copy by hand.
 */
export function CopyButton({ text }: { text: string }) {
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- show the button only after hydration
  useEffect(() => setReady(Boolean(navigator.clipboard)), []);
  if (!ready) return null;
  return (
    <button
      type="button"
      className="button button-plain"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
