import { towns } from "@/config/towns";

const sortedTowns = towns.toSorted((a, b) => a.name.localeCompare(b.name));

/**
 * A select of the known towns, A to Z (UC-14). With `anywhere`, the first
 * option is "Anywhere" (an empty value), so a search can skip the distance
 * filter.
 */
export function TownSelect({
  id,
  name,
  defaultValue,
  anywhere = false,
  className,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  anywhere?: boolean;
  className?: string;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue} className={className}>
      {anywhere && <option value="">Anywhere</option>}
      {sortedTowns.map((t) => (
        <option key={t.name} value={t.name}>
          {t.name}, {t.state}
        </option>
      ))}
    </select>
  );
}
