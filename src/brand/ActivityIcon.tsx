/**
 * Line drawings for the eleven directory categories (home page and browse).
 * Drawn for this board: 24px grid, 1.5px stroke in the heading color.
 * Decorative; the category name always sits beside the icon.
 */
const PATHS: Record<string, React.ReactNode> = {
  // Two peaks and a sun.
  hiking: (
    <>
      <path d="M2 20 9 8l4 6 2-3 7 9Z" />
      <circle cx="17" cy="5" r="1.6" />
    </>
  ),
  // Bicycle.
  cycling: (
    <>
      <circle cx="6" cy="16" r="3.5" />
      <circle cx="18" cy="16" r="3.5" />
      <path d="M6 16 9.5 9h6L18 16M9.5 9 12 16h-2M14 6h2.5l-1 3" />
    </>
  ),
  // Kayak with a paddle across it.
  paddling: (
    <>
      <path d="M2 15c4 2.5 16 2.5 20 0-4-2.5-16-2.5-20 0Z" />
      <path d="M5 6l14 14M4 5l2 2M18 19l2 2" />
    </>
  ),
  // Carabiner.
  climbing: (
    <>
      <path d="M9 3h4a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V7" />
      <path d="M7 7 9 3M7 7v4" />
    </>
  ),
  // Trail shoe.
  running: (
    <>
      <path d="M3 16h16a2 2 0 0 0 2-2c0-1.5-2-2-4-2.5L13 10l-1-3H9l-.5 2L5 8 3 11Z" />
      <path d="M3 19h18M10 12l1.5-1M12.5 13 14 12" />
    </>
  ),
  // Tent and a pine.
  camping: (
    <>
      <path d="M2 20 9 7l7 13ZM9 20v-5" />
      <path d="m19 5-2.5 5h5Zm-3 5-1.5 4h6L19 10M19 14v6" />
    </>
  ),
  // Snowflake.
  snow: (
    <path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5M3 10.5l3.5-.5-1.5-3M21 13.5l-3.5.5 1.5 3M3 13.5l3.5.5-1.5 3M21 10.5l-3.5-.5 1.5-3" />
  ),
  // Fish.
  water: (
    <>
      <path d="M3 12c3-4 9-5.5 13-2 1 1 2 1 5-2-1 2.5-1 5.5 0 8-3-3-4-3-5-2-4 3.5-10 2-13-2Z" />
      <circle cx="8" cy="11.5" r="0.8" />
    </>
  ),
  // Leaf.
  nature: (
    <>
      <path d="M5 19C4 11 9 5 20 4c0 9-5 15-13 15Z" />
      <path d="M5 19 14 10" />
    </>
  ),
  // Seedling in the ground.
  stewardship: (
    <>
      <path d="M12 20v-8M12 12c0-4 3-6 7-6 0 4-3 6-7 6ZM12 14c0-3-2-5-6-5 0 3 2 5 6 5Z" />
      <path d="M4 20h16" />
    </>
  ),
  // Compass.
  skills: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5Z" />
    </>
  ),
};

export function ActivityIcon({ slug, className = "h-9 w-9" }: { slug: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`activity-icon ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[slug] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}
