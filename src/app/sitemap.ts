import type { MetadataRoute } from "next";

import { site } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

/**
 * TR-SEO-4: the listing pages, every category and subcategory, active
 * groups and upcoming events, and (UC-37) guide, shop and venue pages and
 * the upcoming events they run.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [{ data: groups }, { data: events }, { data: subcategories }, { data: listings }, { data: hosted }] = await Promise.all([
    supabase.from("groups").select("slug, updated_at").eq("status", "active").eq("review_status", "approved").limit(5000),
    supabase
      .from("events")
      .select("id, updated_at, groups!inner(status, review_status)")
      .eq("groups.status", "active")
      .eq("groups.review_status", "approved")
      .eq("status", "scheduled")
      .gt("starts_at", now)
      .limit(5000),
    supabase.from("subcategories").select("slug, categories(slug)"),
    supabase.from("business_listings").select("slug").limit(5000),
    supabase.from("event_listings").select("id").neq("host_kind", "group").eq("status", "scheduled").gt("starts_at", now).limit(5000),
  ]);

  const categorySlugs = new Set((subcategories ?? []).map((s) => s.categories?.slug).filter(Boolean));

  return [
    { url: site.url, changeFrequency: "daily" },
    { url: `${site.url}/events`, changeFrequency: "daily" },
    { url: `${site.url}/browse`, changeFrequency: "daily" },
    { url: `${site.url}/communities`, changeFrequency: "daily" },
    { url: `${site.url}/guides-and-shops`, changeFrequency: "weekly" },
    { url: `${site.url}/regions`, changeFrequency: "weekly" },
    ...["about", "guidelines", "terms", "privacy"].map((page) => ({ url: `${site.url}/${page}`, changeFrequency: "monthly" as const })),
    ...[...categorySlugs].map((c) => ({ url: `${site.url}/c/${c}`, changeFrequency: "daily" as const })),
    ...(subcategories ?? [])
      .filter((s) => s.categories?.slug)
      .map((s) => ({ url: `${site.url}/c/${s.categories!.slug}/${s.slug}`, changeFrequency: "daily" as const })),
    ...(groups ?? []).map((g) => ({ url: `${site.url}/g/${g.slug}`, lastModified: g.updated_at })),
    ...(events ?? []).map((e) => ({ url: `${site.url}/e/${e.id}`, lastModified: e.updated_at })),
    ...(listings ?? []).map((b) => ({ url: `${site.url}/b/${b.slug}` })),
    ...(hosted ?? []).map((e) => ({ url: `${site.url}/h/${e.id}` })),
  ];
}
