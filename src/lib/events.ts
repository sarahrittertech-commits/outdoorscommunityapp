import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { idSchema } from "./validation";
import { createClient } from "./supabase/server";

/** An event with its host group, cached per request. */
export const loadEvent = cache(async (id: string) => {
  if (!idSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("*, groups(id, slug, name, status)")
    .eq("id", id)
    .maybeSingle();
  if (!event?.groups) notFound();
  return { supabase, event, group: event.groups };
});
