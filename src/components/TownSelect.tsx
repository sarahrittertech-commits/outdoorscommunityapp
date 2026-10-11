import { regions } from "@/config/regions";
import { site } from "@/config/site";
import { towns, type Town } from "@/config/towns";
import { townKey, townLabel } from "@/lib/geo";

const byName = (a: Town, b: Town) => a.name.localeCompare(b.name) || a.state.localeCompare(b.state);

/** Each region's towns A to Z, then towns in no region. */
const groups = [
  ...regions.map((r) => ({ slug: r.slug, label: r.name, towns: towns.filter((t) => t.region === r.slug).toSorted(byName) })),
  { slug: "", label: "Other places", towns: towns.filter((t) => !regions.some((r) => r.slug === t.region)).toSorted(byName) },
].filter((g) => g.towns.length);

/**
 * A select of the known towns, grouped by region with the current region
 * first, A to Z within each (UC-14). The value is the town's key (a name, or
 * "Name, ST" when two states share it). With `anywhere`, the first option is
 * "Anywhere" (an empty value), so a search can skip the distance filter;
 * `blank` names an empty first option the same way (UC-33: "Not saying").
 * `keep` adds a value that isn't on the list, so a member's older free-text
 * area survives until they pick a town.
 */
export function TownSelect({
  id,
  name,
  defaultValue,
  anywhere = false,
  blank,
  keep,
  className,
  region = site.defaultRegionSlug,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  anywhere?: boolean;
  blank?: string;
  keep?: string | null;
  className?: string;
  /** Slug of the region whose towns come first. */
  region?: string;
}) {
  const ordered = [...groups.filter((g) => g.slug === region), ...groups.filter((g) => g.slug !== region)];
  return (
    <select id={id} name={name} defaultValue={defaultValue} className={className}>
      {anywhere && <option value="">Anywhere</option>}
      {blank && <option value="">{blank}</option>}
      {keep && <option value={keep}>{keep} (as you typed it)</option>}
      {ordered.map((g) => (
        <optgroup key={g.slug || "other"} label={g.label}>
          {g.towns.map((t) => (
            <option key={townKey(t)} value={townKey(t)}>
              {townLabel(t)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
