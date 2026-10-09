// UC-32: how suggestion kinds and statuses read on the page.

import type { Database } from "./supabase/database.types";

type Kind = Database["public"]["Enums"]["suggestion_kind"];
type Status = Database["public"]["Enums"]["suggestion_status"];

export const SUGGESTION_KIND_LABELS: Record<Kind, string> = {
  region: "A region to cover",
  feature: "A feature",
  group: "A group to invite",
  event: "An event to add",
  other: "Something else",
};

export const SUGGESTION_STATUS_LABELS: Record<Status, string> = {
  new: "New",
  planned: "Planned",
  done: "Done",
  declined: "Declined",
};
