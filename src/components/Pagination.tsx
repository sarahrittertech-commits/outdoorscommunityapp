import Link from "next/link";

/** Numbered pages, never infinite scroll (TR-PERF-4). */
export function Pagination({ basePath, page, pageCount }: { basePath: string; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const href = (n: number) => (n === 1 ? basePath : `${basePath}?page=${n}`);

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

export function pageFrom(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
