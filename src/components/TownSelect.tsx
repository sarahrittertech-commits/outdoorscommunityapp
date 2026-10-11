import { towns } from "@/config/towns";

const sortedTowns = towns.toSorted((a, b) => a.name.localeCompare(b.name));

/**
 * A select of the known towns, A to Z (UC-14). With `anywhere`, the first
 * option is "Anywhere" (an empty value), so a search can skip the distance
 * filter; `blank` names an empty first option the same way (UC-33: "Not
 * saying"). `keep` adds a value that isn't on the list, so a member's older
 * free-text area survives until they pick a town.
 */
export function TownSelect({
  id,
  name,
  defaultValue,
  anywhere = false,
  blank,
  keep,
  className,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  anywhere?: boolean;
  blank?: string;
  keep?: string | null;
  className?: string;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue} className={className}>
      {anywhere && <option value="">Anywhere</option>}
      {blank && <option value="">{blank}</option>}
      {keep && <option value={keep}>{keep} (as you typed it)</option>}
      {sortedTowns.map((t) => (
        <option key={t.name} value={t.name}>
          {t.name}, {t.state}
        </option>
      ))}
    </select>
  );
}
