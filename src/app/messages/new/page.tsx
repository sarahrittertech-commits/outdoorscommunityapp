import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { sendMessage } from "@/app/actions/messages";
import { Notice } from "@/components/Notice";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "New message", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** UC-20 step 2: the first message to someone, which arrives as a request (FR-DM-1). */
export default async function NewMessagePage({ searchParams }: Props) {
  const params = await searchParams;
  const to = idSchema.safeParse(params.to);
  if (!to.success) notFound();
  const path = `/messages/new?to=${to.data}`;
  const viewer = await requireViewer(path);
  if (to.data === viewer.id) redirect("/messages");

  const supabase = await createClient();
  const [{ data: profile }, { data: existing }] = await Promise.all([
    supabase.from("profiles").select("id, display_name").eq("id", to.data).maybeSingle(),
    // One conversation per pair: if there is one already, go to it.
    supabase
      .from("conversations")
      .select("id")
      .or(
        `and(starter_id.eq.${viewer.id},recipient_id.eq.${to.data}),and(starter_id.eq.${to.data},recipient_id.eq.${viewer.id})`,
      )
      .maybeSingle(),
  ]);
  if (existing) redirect(`/messages/${existing.id}#latest`);
  if (!profile?.display_name) notFound();

  return (
    <>
      <p className="text-sm">
        <Link href={`/u/${profile.id}`}>← {profile.display_name}</Link>
      </p>
      <h1>Message {profile.display_name}</h1>
      <Notice params={params} />
      <p className="max-w-prose text-muted">
        Your first message arrives as a request. You can write again once {profile.display_name} accepts it. Only the two
        of you can read the conversation.
      </p>
      <form action={sendMessage.bind(null, path)} className="mt-3">
        <input type="hidden" name="to" value={profile.id} />
        <label htmlFor="body">Message</label>
        <textarea id="body" name="body" required maxLength={2000} className="min-h-32" />
        <p className="hint">Plain text, up to 2,000 characters. You can send up to 10 new requests a day.</p>
        <button className="button mt-2">Send request</button>
      </form>
    </>
  );
}
