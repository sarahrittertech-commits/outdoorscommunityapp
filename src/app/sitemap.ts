import type { MetadataRoute } from "next";

import { site } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

/** TR-SEO-4: the listing pages, every category and subcategory, active groups and upcoming events. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const [{ data: groups }, { data: events }, { data: subcategories }] = await Promise.all([
    supabase.from("groups").select("slug, updated_at").eq("status", "active").limit(5000),
    supabase
      .from("events")
      .select("id, updated_at")
      .eq("status", "scheduled")
      .gt("starts_at", new Date().toISOString())
      .limit(5000),
    supabase.from("subcategories").select("slug, categories(slug)"),
  ]);

  const categorySlugs = new Set((subcategories ?? []).map((s) => s.categories?.slug).filter(Boolean));

  return [
    { url: site.url, changeFrequency: "daily" },
    { url: `${site.url}/events`, changeFrequency: "daily" },
    { url: `${site.url}/browse`, changeFrequency: "daily" },
    { url: `${site.url}/communities`, changeFrequency: "daily" },
    ...["about", "guidelines", "terms", "privacy"].map((page) => ({ url: `${site.url}/${page}`, changeFrequency: "monthly" as const })),
    ...[...categorySlugs].map((c) => ({ url: `${site.url}/c/${c}`, changeFrequency: "daily" as const })),
    ...(subcategories ?? [])
      .filter((s) => s.categories?.slug)
      .map((s) => ({ url: `${site.url}/c/${s.categories!.slug}/${s.slug}`, changeFrequency: "daily" as const })),
    ...(groups ?? []).map((g) => ({ url: `${site.url}/g/${g.slug}`, lastModified: g.updated_at })),
    ...(events ?? []).map((e) => ({ url: `${site.url}/e/${e.id}`, lastModified: e.updated_at })),
  ];
}
