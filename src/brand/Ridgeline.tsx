/** A pine as a trunk with two chevron tiers, standing on y = base. */
function pine(x: number, base: number, h: number, w: number) {
  const top = base - h;
  return [
    `M${x} ${base} V${top}`,
    `M${x - w} ${base - h * 0.28} L${x} ${base - h * 0.7} L${x + w} ${base - h * 0.28}`,
    `M${x - w * 0.75} ${base - h * 0.55} L${x} ${top} L${x + w * 0.75} ${base - h * 0.55}`,
  ].join(" ");
}

const BASE = 70;

/**
 * The home page's line drawing (8 October design): a Blue Ridge ridgeline
 * with a few pines and a low sun, sitting above the search fields. Colors
 * come from the --ridgeline and --sun slots.
 */
export function Ridgeline() {
  return (
    <svg
      viewBox="0 0 1248 72"
      preserveAspectRatio="xMidYMax slice"
      className="ridgeline block h-14 w-full md:h-[72px]"
      aria-hidden
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* far ridge, lighter: its peaks rise behind the saddles of the near ridge */}
      <path
        className="ridgeline-far"
        d="M300 70 C 380 66 440 56 470 44 C 488 36 500 30 512 22 C 524 32 540 38 560 40 C 596 40 620 32 640 20 C 656 32 668 38 690 40 C 704 38 716 34 730 28 C 748 40 780 52 830 58 C 900 64 980 68 1060 70"
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
      {/* near ridge: long soft foothills, then three peaks */}
      <path
        className="ridgeline-near"
        d="M100 70 C 240 69 340 64 410 52 C 438 46 456 34 470 20 C 480 30 490 38 500 40 C 530 34 562 22 588 2 C 604 18 614 32 630 38 C 648 32 662 26 676 16 C 690 30 712 40 740 46 C 820 58 960 68 1150 70"
        strokeWidth="2"
        strokeLinejoin="miter"
      />
      {/* the sun stays near the center so narrow screens keep it in view */}
      <circle className="ridgeline-sun" cx="790" cy="12" r="6.5" strokeWidth="2" />
      <path className="ridgeline-near" d={[pine(206, BASE, 22, 7), pine(1002, BASE, 34, 10), pine(1030, BASE, 24, 7.5)].join(" ")} strokeWidth="2" />
      <path className="ridgeline-ground" d={`M0 ${BASE} H1248`} strokeWidth="1.5" />
    </svg>
  );
}
