import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GroupList } from "@/components/Listings";
import { pageFrom, Pagination } from "@/components/Pagination";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function loadCategory(slug: string) {
  const supabase = await createClient();
  const { data: category } = await supabase.from("categories").select("id, slug, name").eq("slug", slug).maybeSingle();
  if (!category) notFound();
  return { supabase, category };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await loadCategory((await params).category);
  return { title: category.name, description: `${category.name} groups, listed A to Z.` };
}

/** FR-BR-3: every group in a category, alphabetically. */
export default async function CategoryPage({ params, searchParams }: Props) {
  const { supabase, category } = await loadCategory((await params).category);
  const page = pageFrom((await searchParams).page);

  const [{ data: subcategories }, { data: groups, count }] = await Promise.all([
    supabase.from("subcategories").select("slug, name").eq("category_id", category.id).order("sort_order"),
    supabase
      .from("group_listings")
      .select("slug, name, area, member_count, next_event_at, join_policy", { count: "exact" })
      .eq("category_id", category.id)
      .eq("status", "active")
      .order("name")
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
  ]);

  return (
    <>
      <p className="text-sm">
        <Link href="/">all categories</Link> ›
      </p>
      <h1>{category.name}</h1>
      <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
        {subcategories?.map((s) => (
          <Link key={s.slug} href={`/c/${category.slug}/${s.slug}`}>
            {s.name}
          </Link>
        ))}
      </p>
      <p className="mt-4 mb-2 text-sm text-muted">Groups sorted A to Z.</p>
      <GroupList groups={groups ?? []} />
      <Pagination basePath={`/c/${category.slug}`} page={page} pageCount={Math.ceil((count ?? 0) / PAGE_SIZE)} />
    </>
  );
}
