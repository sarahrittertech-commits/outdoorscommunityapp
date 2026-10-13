"use server";

import { z } from "zod";

import { actingUser, fail, failOnError, succeed } from "@/lib/actions";
import { SOURCE_KINDS } from "@/lib/sources";
import { idSchema } from "@/lib/validation";

const BACK = "/admin/sources";

const addSchema = z.object({
  host: z.string().trim().regex(/^(group|business):[a-z0-9]+(-[a-z0-9]+)*$/),
  url: z.string().trim().max(500).regex(/^https?:\/\/[^\s]+$/),
  kind: z.enum(SOURCE_KINDS),
});

/**
 * UC-39 step 4: the site admin adds a page where a listed host posts dates.
 * The host is "group:<slug>" or "business:<slug>". The database refuses
 * anyone but the site admin.
 */
export async function addEventSource(formData: FormData) {
  const { supabase } = await actingUser(BACK);
  const parsed = addSchema.safeParse({ host: formData.get("host"), url: formData.get("url"), kind: formData.get("kind") });
  if (!parsed.success) fail(BACK, "invalid");
  const [hostKind, hostSlug] = parsed.data.host.split(":");
  const { error } = await supabase.rpc("add_event_source", {
    p_host_kind: hostKind,
    p_host_slug: hostSlug,
    p_url: parsed.data.url,
    p_kind: parsed.data.kind,
  });
  failOnError(BACK, error);
  succeed(BACK, "source_added");
}

/** FR-ES-9: retire a source, or make a quiet or broken one active again. */
export async function setEventSourceStatus(sourceId: string, status: "active" | "retired") {
  const { supabase } = await actingUser(BACK);
  if (!idSchema.safeParse(sourceId).success || !["active", "retired"].includes(status)) fail(BACK, "invalid");
  const { error } = await supabase.rpc("set_event_source_status", { p_source_id: sourceId, p_status: status });
  failOnError(BACK, error);
  succeed(BACK, status === "retired" ? "source_retired" : "source_restored");
}
