import Link from "next/link";

import type { CurrentRegion } from "@/lib/currentRegion";
import { groupOf } from "@/lib/regions";

/**
 * The line that says what a list covers, with plain links to widen or
 * narrow it (UC-34, UC-40): one area, all of its big region
 * (`?region=southeast`), or every region (`?region=all`). Works without
 * JavaScript. `path` is the page; `query` its other filters.
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
  const area = current.region;
  const big = groupOf(area);
  const change = <Link href={`/regions?next=${encodeURIComponent(href(current.param))}`}>change</Link>;
  if (current.all) {
    return (
      <p className={className}>
        All regions · <Link href={href(area.slug)}>just {area.name}</Link> · <Link href={href(big.slug)}>all of the {big.name}</Link>
      </p>
    );
  }
  if (current.group) {
    return (
      <p className={className}>
        All of the {current.group.name} · <Link href={href(area.slug)}>just {area.name}</Link> · <Link href={href("all")}>all regions</Link> · {change}
      </p>
    );
  }
  return (
    <p className={className}>
      In {area.name} · <Link href={href(big.slug)}>all of the {big.name}</Link> · <Link href={href("all")}>all regions</Link> · {change}
    </p>
  );
}
