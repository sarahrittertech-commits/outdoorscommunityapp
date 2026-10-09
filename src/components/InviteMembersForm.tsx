"use client";

import { useActionState } from "react";

import type { InviteFormState } from "@/app/actions/invites";

type Props = {
  action: (state: InviteFormState, formData: FormData) => Promise<InviteFormState>;
  disabled: boolean;
};

const initial: InviteFormState = { error: null, invalid: [], sent: null };

/**
 * FR-MB-13: paste one or many addresses. Works without JavaScript (React
 * posts the form and renders the returned state); invalid addresses are
 * listed back here rather than in the URL.
 */
export function InviteMembersForm({ action, disabled }: Props) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction}>
      <fieldset disabled={disabled || pending} className="disabled:opacity-60">
        <label htmlFor="invite-emails">
          Email addresses <span className="hint">Separate them with commas, spaces or new lines. Up to 25 at a time.</span>
        </label>
        <textarea id="invite-emails" name="emails" maxLength={10000} className="min-h-24" />
        <button className="button mt-2">Send invites</button>
      </fieldset>
      {state.error && (
        <div role="alert" className="mt-2 rounded border border-danger px-3 py-2 text-danger">
          {state.error}
          {state.invalid.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {state.invalid.map((address) => (
                <li key={address}>{address}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {state.sent !== null && (
        <p role="status" className="mt-2 rounded bg-notice px-3 py-2">
          {state.sent === 1 ? "1 invite" : `${state.sent} invites`} saved. Addresses invited in the last 30 days were skipped.
        </p>
      )}
    </form>
  );
}
