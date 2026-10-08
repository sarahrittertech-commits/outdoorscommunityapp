/**
 * The twig mark from the 8 October design: a plum twig with four almond
 * leaves in Marigold, Ember and Rust. Decorative; the wordmark beside it
 * carries the name. The same drawing is the favicon (src/app/icon.svg).
 */
const LEAF = "M0 0 C 4 -5.5, 12 -5.5, 17 0 C 12 5.5, 4 5.5, 0 0 Z";
const LEAVES = [
  { x: 31, y: 9, r: -58, s: 0.95, fill: "#E7A855" },
  { x: 25, y: 22, r: -148, s: 1, fill: "#DD7242" },
  { x: 20, y: 33, r: -158, s: 0.95, fill: "#E7A855" },
  { x: 21, y: 31, r: 14, s: 1, fill: "#B43C34" },
];

export function BranchMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 64" className={className} aria-hidden="true" focusable="false" overflow="visible">
      <path className="branch-stem" d="M7 59 L 31 9" fill="none" strokeWidth="3.5" strokeLinecap="round" />
      {LEAVES.map((l) => (
        <path key={`${l.x}-${l.y}-${l.r}`} d={LEAF} fill={l.fill} transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(${l.s})`} />
      ))}
    </svg>
  );
}
