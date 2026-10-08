// FR-GR-11: the affinity tags a group can carry. The database allows only
// these values (see the research_candidates migration).

export const AFFINITY_TAGS = [
  { value: "women", label: "Women" },
  { value: "youth", label: "Youth" },
  { value: "bipoc", label: "BIPOC" },
  { value: "lgbtqia", label: "LGBTQIA+" },
] as const;

export type AffinityTag = (typeof AFFINITY_TAGS)[number]["value"];

export function affinityLabel(value: string): string | null {
  return AFFINITY_TAGS.find((t) => t.value === value)?.label ?? null;
}
