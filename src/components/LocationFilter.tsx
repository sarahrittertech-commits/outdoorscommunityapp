import { TownSelect } from "@/components/TownSelect";
import { distances } from "@/config/towns";

/**
 * The side filters' location form (FR-BR-12, FR-BR-13): a town, or a zip
 * code typed beside it (the zip wins when given), and a distance. A plain
 * GET form, so it works without JavaScript and the result is a shareable
 * address (FR-BR-15). `keep` carries the page's other filters along.
 */
export function LocationFilter({
  action,
  idPrefix,
  keep,
  town,
  zip,
  within,
}: {
  action: string;
  idPrefix: string;
  keep: Record<string, string | undefined>;
  town?: string;
  zip?: string;
  within: number;
}) {
  return (
    <form action={action} className="mt-1 space-y-1">
      {Object.entries(keep).map(([name, value]) => value && <input key={name} type="hidden" name={name} value={value} />)}
      <label htmlFor={`${idPrefix}-near`} className="sr-only">
        Town
      </label>
      <TownSelect id={`${idPrefix}-near`} name="near" defaultValue={town ?? ""} anywhere className="w-full py-1 text-sm" />
      <label htmlFor={`${idPrefix}-zip`} className="mt-1 font-normal text-muted">
        or zip code
      </label>
      <input
        id={`${idPrefix}-zip`}
        name="zip"
        type="text"
        inputMode="numeric"
        autoComplete="postal-code"
        pattern="\d{5}(-\d{4})?"
        maxLength={10}
        defaultValue={zip ?? ""}
        placeholder="28712"
        className="w-full py-1 text-sm"
      />
      <label htmlFor={`${idPrefix}-within`} className="sr-only">
        Distance
      </label>
      <select id={`${idPrefix}-within`} name="within" defaultValue={String(within)} className="w-full py-1 text-sm">
        {distances.map((d) => (
          <option key={d} value={d}>
            within {d} miles
          </option>
        ))}
      </select>
      <button className="button px-2 py-1 text-sm">show</button>
    </form>
  );
}

/** The plain notice for a zip code that isn't in the built-in table (FR-BR-12). */
export function UnknownZip({ zip, fallback }: { zip: string; fallback?: string }) {
  return (
    <p role="status" className="mt-2 text-sm">
      We don’t know the zip code “{zip}” — this board only knows zip codes in its own region.{" "}
      {fallback ? `Showing results near ${fallback} instead.` : "Showing results everywhere; pick a town to narrow them."}
    </p>
  );
}
