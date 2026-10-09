// FR-GR-16: the types a group can be. The database allows only these values
// (the group_type enum, migration 20261010000007).

import type { Enums } from "@/lib/supabase/database.types";

export type GroupType = Enums<"group_type">;

export const GROUP_TYPES: readonly { value: GroupType; label: string; hint: string }[] = [
  { value: "club", label: "Club", hint: "members, often dues, regular outings" },
  { value: "meetup", label: "Meetup", hint: "informal, come when you can" },
  { value: "volunteer", label: "Volunteer group", hint: "trail work, cleanups, helping at events" },
  { value: "nonprofit", label: "Nonprofit", hint: "a registered charity or association" },
  { value: "chapter", label: "Chapter", hint: "the local branch of a larger organization" },
];

export function groupTypeLabel(value: string | null | undefined): string | null {
  return GROUP_TYPES.find((t) => t.value === value)?.label ?? null;
}

export function isGroupType(value: unknown): value is GroupType {
  return GROUP_TYPES.some((t) => t.value === value);
}
