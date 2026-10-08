import { affinityLabel } from "@/lib/affinity";

/** FR-GR-11: a group's affinity tags, as small labels. Renders nothing when there are none. */
export function AffinityTags({ tags, className = "" }: { tags: readonly string[] | null | undefined; className?: string }) {
  const labels = (tags ?? []).map(affinityLabel).filter((l): l is string => Boolean(l));
  if (!labels.length) return null;
  return (
    <span className={`inline-flex flex-wrap gap-1 ${className}`}>
      {labels.map((label) => (
        <span key={label} className="tag tag-affinity">
          {label}
        </span>
      ))}
    </span>
  );
}
