// UC-33: the About me profile's sections and limits, shared by the pages,
// the form validation and the tests. The database enforces the same limits
// (supabase/migrations/20261010000014_about_me_profile.sql).

import { site } from "@/config/site";

/** FR-PR-7: every section its owner can show or hide, in page order. */
export const PROFILE_SECTIONS = [
  { value: "photo", label: "Photo" },
  { value: "town", label: "Home town" },
  { value: "bio", label: "Blurb" },
  { value: "activities", label: "Activities I enjoy" },
  { value: "prompts", label: "Fill-in-the-blanks" },
  { value: "goals", label: "Adventure goals" },
  { value: "groups", label: "Groups I'm in" },
] as const;

export type ProfileSection = (typeof PROFILE_SECTIONS)[number]["value"];

export const PROFILE_SECTION_VALUES = PROFILE_SECTIONS.map((s) => s.value) as [ProfileSection, ...ProfileSection[]];

/** The sections the site admin can clear (FR-PR-9): every one but Groups, which is just memberships. */
export const CLEARABLE_SECTIONS = PROFILE_SECTIONS.filter((s) => s.value !== "groups");

/** FR-PR-4 and FR-PR-5. */
export const MAX_PROMPTS = 3;
export const PROMPT_ANSWER_MAX = 60;
export const MAX_GOALS = 10;
export const GOAL_MAX = 100;

/**
 * The year adventure goals belong to. The database uses its own clock in
 * UTC (profile_goal_year()), so the page does too.
 */
export function goalYear(now: Date = new Date()): number {
  return now.getUTCFullYear();
}

/** The fill-in-the-blank prompt for a stored key, or undefined if this board doesn't ask it. */
export function promptText(key: string): string | undefined {
  return site.profilePrompts.find((p) => p.key === key)?.text;
}

/** "3 of 5 done". */
export function goalsDoneLine(goals: { done: boolean }[]): string {
  return `${goals.filter((g) => g.done).length} of ${goals.length} done`;
}
