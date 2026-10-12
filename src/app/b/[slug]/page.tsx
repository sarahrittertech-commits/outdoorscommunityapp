import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { removeBusiness } from "@/app/actions/candidates";
import { AffinityTags } from "@/components/AffinityTags";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }> };

const loadBusiness = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_listings")
    .select("id, slug, name, kind, description, area, website, affinity_tags, is_unclaimed, region_name, region_slug, category_slug, category_name, subcategory_name")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) notFound();
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await loadBusiness((await params).slug);
  return { title: b.name, description: (b.description ?? "").slice(0, 160) };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** UC-12 (first part), FR-BZ-1: a guide service or shop, listed from its public website. */
export default async function BusinessPage({ params }: Props) {
  const b = await loadBusiness((await params).slug);
  const viewer = await getViewer();

  return (
    <article className="max-w-prose">
      <p className="text-sm text-muted">
        <Link href="/guides-and-shops">Guides and shops</Link> ›{" "}
        <Link href={`/guides-and-shops?category=${b.category_slug}&region=${b.region_slug}`}>{b.category_name}</Link> ›
      </p>
      <h1>{b.name}</h1>
      <AffinityTags tags={b.affinity_tags} />
      <p className="text-sm text-muted">
        {b.kind === "guide" ? "Guide service" : "Shop"} · {b.subcategory_name} · {b.area} · {b.region_name}
      </p>
      <p>{b.description}</p>
      {b.website && (
        <p className="text-sm">
          Website:{" "}
          <a href={b.website} rel="nofollow noopener" className="font-bold">
            {hostOf(b.website)}
          </a>
        </p>
      )}
      {b.is_unclaimed && (
        <p className="mt-6 border-t border-rule pt-3 text-sm text-muted">
          An unclaimed listing, written from the business&apos;s public website. It doesn&apos;t pay to be here. Prices, bookings and
          hours are on its own site. Something wrong, or is this yours? <Link href="/suggest">Tell the site admin</Link>.
        </p>
      )}
      {viewer?.isSiteAdmin && viewer.canWrite && (
        <form action={removeBusiness.bind(null, b.id!)} className="mt-4">
          <button className="button button-plain text-sm">Remove this listing</button>
        </form>
      )}
    </article>
  );
}
