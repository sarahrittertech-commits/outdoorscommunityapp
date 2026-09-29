/**
 * The compact branch mark from the brand guide: a plum stem with three
 * leaves in Rust, Marigold and Ember. Decorative; the wordmark beside it
 * carries the name.
 */
const LEAF = "M0 0 C 3 -6, 12 -8.5, 24 0 C 12 8.5, 3 6, 0 0 Z";
const VEINS = "M1 0 L22 0 M7 0 L10 -4.5 M12 0 L15.5 -4.5 M17 0 L19.5 -2.8 M7 0 L10 4.5 M12 0 L15.5 4.5 M17 0 L19.5 2.8";

function Leaf({ transform, fill }: { transform: string; fill: string }) {
  return (
    <g transform={transform}>
      <path d={LEAF} fill={fill} />
      <path d={VEINS} fill="none" stroke="#FAF6EF" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
    </g>
  );
}

export function BranchMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false" overflow="visible">
      <path className="branch-stem" d="M8 46 C 14 36, 20 26, 28 16" fill="none" strokeWidth="4" strokeLinecap="round" />
      <Leaf transform="translate(28 16) rotate(-55) scale(0.8)" fill="#DD7242" />
      <Leaf transform="translate(17 31) rotate(8) scale(0.75)" fill="#B43C34" />
      <Leaf transform="translate(21 25) rotate(-128) scale(0.7)" fill="#E7A855" />
    </svg>
  );
}
