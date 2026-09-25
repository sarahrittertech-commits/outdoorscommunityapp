import type { MetadataRoute } from "next";

import { site } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

/** TR-SEO-4: active groups and upcoming events. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const [{ data: groups }, { data: events }] = await Promise.all([
    supabase.from("groups").select("slug, updated_at").eq("status", "active").limit(5000),
    supabase
      .from("events")
      .select("id, updated_at")
      .eq("status", "scheduled")
      .gt("starts_at", new Date().toISOString())
      .limit(5000),
  ]);

  return [
    { url: site.url, changeFrequency: "daily" },
    { url: `${site.url}/events`, changeFrequency: "daily" },
    ...(groups ?? []).map((g) => ({ url: `${site.url}/g/${g.slug}`, lastModified: g.updated_at })),
    ...(events ?? []).map((e) => ({ url: `${site.url}/e/${e.id}`, lastModified: e.updated_at })),
  ];
}
