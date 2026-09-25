import Link from "next/link";

import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/** A link to whatever a report is about, as far as the viewer is allowed to see it. */
export async function ReportTarget({ type, id, groupSlug }: { type: Enums<"report_target">; id: string; groupSlug?: string }) {
  const supabase = await createClient();

  switch (type) {
    case "group": {
      const { data } = await supabase.from("groups").select("slug, name").eq("id", id).maybeSingle();
      return data ? <Link href={`/g/${data.slug}`}>{data.name}</Link> : <span>removed group</span>;
    }
    case "event": {
      const { data } = await supabase.from("events").select("title").eq("id", id).maybeSingle();
      return <Link href={`/e/${id}`}>{data?.title ?? "event"}</Link>;
    }
    case "thread": {
      const { data } = await supabase.from("threads").select("title, groups(slug)").eq("id", id).maybeSingle();
      const slug = data?.groups?.slug ?? groupSlug;
      return <Link href={`/g/${slug}/discussions/${id}`}>{data?.title ?? "thread"}</Link>;
    }
    case "reply": {
      const { data } = await supabase.from("replies").select("thread_id, body, threads(groups(slug))").eq("id", id).maybeSingle();
      const slug = data?.threads?.groups?.slug ?? groupSlug;
      return data ? (
        <Link href={`/g/${slug}/discussions/${data.thread_id}#reply-${id}`}>&ldquo;{data.body.slice(0, 60) || "removed"}&rdquo;</Link>
      ) : (
        <span>reply</span>
      );
    }
    case "profile": {
      const { data } = await supabase.from("profiles").select("display_name").eq("id", id).maybeSingle();
      return <Link href={`/u/${id}`}>{data?.display_name ?? "deleted user"}</Link>;
    }
  }
}
