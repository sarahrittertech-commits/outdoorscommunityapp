import type { Metadata } from "next";
import Link from "next/link";

import { ActivityIcon } from "@/components/ActivityIcon";
import { site } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

type Subcategory = { slug: string; name: string; count: number };
type Category = { slug: string; name: string; subcategories: Subcategory[] };

export const metadata: Metadata = {
  title: "Browse all activities",
  description: "Every activity on the board, with the number of groups in each.",
};

/** FR-BR-1: the whole directory on one page, Craigslist-style. Linked from the home page's activity row. */
export default async function BrowsePage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("subcategory_group_counts")
    .select("*")
    .order("category_sort_order")
    .order("subcategory_sort_order");

  const categories: Category[] = [];
  for (const row of rows ?? []) {
    let category = categories.find((c) => c.slug === row.category_slug);
    if (!category) {
      category = { slug: row.category_slug!, name: row.category_name!, subcategories: [] };
      categories.push(category);
    }
    category.subcategories.push({ slug: row.subcategory_slug!, name: row.subcategory_name!, count: row.group_count ?? 0 });
  }
  const total = categories.flatMap((c) => c.subcategories).reduce((sum, s) => sum + s.count, 0);

  return (
    <>
      <h1>Browse all activities</h1>
      <p className="mt-1 text-muted">
        {site.regionName} · categories A–Z · {total} {total === 1 ? "group" : "groups"} · <Link href="/events">upcoming events</Link> ·{" "}
        <Link href="/groups/new">start a group</Link>
      </p>

      <div className="mt-6 gap-8 sm:columns-2 lg:columns-3">
        {categories.map((category) => (
          <section key={category.slug} className="mb-6 break-inside-avoid" aria-labelledby={`cat-${category.slug}`}>
            <h2 id={`cat-${category.slug}`} className="mt-0 flex items-center gap-2 border-b border-rule pb-1 text-xl">
              <ActivityIcon slug={category.slug} className="h-6 w-6" />
              <Link href={`/c/${category.slug}`} prefetch={false} className="text-heading no-underline visited:text-heading hover:underline">
                {category.name}
              </Link>
            </h2>
            <ul className="mt-2 space-y-0.5">
              {category.subcategories.map((sub) => (
                <li key={sub.slug}>
                  <Link href={`/c/${category.slug}/${sub.slug}`} prefetch={false}>{sub.name}</Link>{" "}
                  <span className="text-sm text-muted">({sub.count})</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
