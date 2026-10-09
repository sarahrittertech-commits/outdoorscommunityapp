import { groupTypeLabel } from "@/lib/groupTypes";

/**
 * Line drawings for the five group types (FR-GR-16), in the ActivityIcon
 * style: 24px grid, 1.5px stroke in the current text color. The drawing is
 * decorative; the type's name always sits beside it, so this component
 * renders both.
 */
const PATHS: Record<string, React.ReactNode> = {
  // A pennant on a pole.
  club: <path d="M6 21V3M6 4h12l-3.5 4L18 12H6" />,
  // Two people side by side.
  meetup: (
    <>
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="16" cy="8" r="2.5" />
      <path d="M3 19c0-3 2.2-5 5-5s5 2 5 5M11 19c0-3 2.2-5 5-5s5 2 5 5" />
    </>
  ),
  // A trail shovel.
  volunteer: <path d="M10 2.5h4M12 2.5v11M8 13.5h8v3a4 4 0 0 1-8 0Z" />,
  // A heart.
  nonprofit: <path d="M12 20s-8-4.5-8-10a4 4 0 0 1 8-1.5A4 4 0 0 1 20 10c0 5.5-8 10-8 10Z" />,
  // A branch of a larger tree: one node above two.
  chapter: (
    <>
      <circle cx="12" cy="5" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M12 7v4M6 16v-5h12v5" />
    </>
  ),
};

export function GroupTypeIcon({
  type,
  className = "",
  iconClassName = "h-4 w-4",
}: {
  type: string | null | undefined;
  className?: string;
  iconClassName?: string;
}) {
  const label = groupTypeLabel(type);
  if (!type || !label) return null;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <svg
        viewBox="0 0 24 24"
        className={`activity-icon ${iconClassName}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {PATHS[type]}
      </svg>
      {label}
    </span>
  );
}
