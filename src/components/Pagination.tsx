import Link from "next/link";

/** Numbered pages, never infinite scroll (TR-PERF-4). */
export function Pagination({ basePath, page, pageCount }: { basePath: string; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const href = (n: number) => (n === 1 ? basePath : `${basePath}${basePath.includes("?") ? "&" : "?"}page=${n}`);

  return (
    <nav aria-label="Pages" className="mt-6 flex flex-wrap gap-3 text-sm">
      {page > 1 && <Link href={href(page - 1)}>← previous</Link>}
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) =>
        n === page ? (
          <span key={n} aria-current="page" className="font-bold">
            {n}
          </span>
        ) : (
          <Link key={n} href={href(n)}>
            {n}
          </Link>
        ),
      )}
      {page < pageCount && <Link href={href(page + 1)}>next →</Link>}
    </nav>
  );
}

/**
 * The page number from the URL, bounded (TR-SEC-12, UT-6).
 *
 * The result goes straight into a range query, so an unbounded number lets
 * `?page=99999999` ask Postgres to count and discard a whole table. Callers
 * that already know the row count pass `pageCount` to clamp to the last real
 * page; the ceiling covers the first query, before the count is known.
 */
const MAX_PAGE = 1000;

export function pageFrom(value: string | string[] | undefined, pageCount?: number): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, pageCount && pageCount > 0 ? pageCount : MAX_PAGE);
}
