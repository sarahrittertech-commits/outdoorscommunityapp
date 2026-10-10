"use client";

import { useFormStatus } from "react-dom";

/**
 * A submit button that shows it was pressed: while the form is sending it is
 * disabled and says so, so nobody presses it again and sends five emails.
 * Without JavaScript it is a plain submit button.
 */
export function SubmitButton({
  children,
  pendingText = "Sending…",
  className = "button mt-4",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} aria-disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
