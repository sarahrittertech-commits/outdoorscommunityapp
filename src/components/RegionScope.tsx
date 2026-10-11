import Link from "next/link";

import type { CurrentRegion } from "@/lib/currentRegion";

/**
 * Regions: the line that says which region a list covers, with a link to
 * every region at once (`?region=all`) and back. Plain links, so it works
 * without JavaScript. `path` is the page; `query` its other filters.
 */
export function RegionScope({
  current,
  path,
  query = {},
  className = "mt-1 text-sm text-muted",
}: {
  current: CurrentRegion;
  path: string;
  query?: Record<string, string | undefined>;
  className?: string;
}) {
  const href = (region?: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) q.set(k, v);
    if (region) q.set("region", region);
    return q.size ? `${path}?${q}` : path;
  };
  return (
    <p className={className}>
      {current.all ? (
        <>
          All regions · <Link href={href()}>just {current.region.name}</Link>
        </>
      ) : (
        <>
          In {current.region.name} · <Link href={href("all")}>all regions</Link> ·{" "}
          <Link href={`/regions?next=${encodeURIComponent(href())}`}>change region</Link>
        </>
      )}
    </p>
  );
}
