import Link from "next/link";

import { Notice } from "@/components/Notice";
import { site } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

type Subcategory = { slug: string; name: string; count: number };
type Category = { slug: string; name: string; subcategories: Subcategory[] };

/** FR-BR-1: the whole directory on one page, Craigslist-style. */
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
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
      <Notice params={await searchParams} />
      <h1 className="sr-only">{site.name}</h1>
      <p className="text-muted">{site.tagline}</p>
      <p className="mt-1 text-sm text-muted">
        {total} {total === 1 ? "group" : "groups"} · <Link href="/events">upcoming events</Link> ·{" "}
        <Link href="/groups/new">start a group</Link>
      </p>

      <div className="mt-6 gap-8 sm:columns-2 lg:columns-3">
        {categories.map((category) => (
          <section key={category.slug} className="mb-6 break-inside-avoid" aria-labelledby={`cat-${category.slug}`}>
            <h2 id={`cat-${category.slug}`} className="mt-0 border-b border-rule pb-1">
              <Link href={`/c/${category.slug}`} className="text-ink visited:text-ink">
                {category.name}
              </Link>
            </h2>
            <ul className="mt-2 space-y-0.5">
              {category.subcategories.map((sub) => (
                <li key={sub.slug}>
                  <Link href={`/c/${category.slug}/${sub.slug}`}>{sub.name}</Link>{" "}
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
