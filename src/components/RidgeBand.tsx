import { site } from "@/config/site";

/**
 * The home page hero: layered Blue Ridge silhouettes drawn as SVG behind the
 * heading and search. Colors come from the --ridge-* tokens in globals.css,
 * so a cloned deployment re-colors it without a new image, or replaces it
 * with its own (site.heroImage). The art is decorative; everything readable
 * is real text on top.
 */
export function RidgeBand({ children }: { children: React.ReactNode }) {
  return (
    <div className="ridge-band full-bleed relative overflow-hidden">
      {site.heroImage ? (
        // A plain <img>: the art is a static file, and the CSP blocks the
        // inline style a CSS background would need.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={site.heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-left sm:object-center"
        />
      ) : (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1200 240"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden="true"
          focusable="false"
        >
          <rect className="ridge-haze" x="0" y="120" width="1200" height="60" />
          <path
            className="ridge-1"
            d="M0 150 C80 140 110 128 170 136 C250 146 300 118 380 112 C450 108 500 132 560 128 C640 122 700 96 780 102 C860 108 920 124 990 116 C1060 108 1120 88 1200 84 V240 H0 Z"
          />
          <path
            className="ridge-2"
            d="M0 170 C70 160 130 150 200 158 C280 168 330 150 400 146 C480 142 540 164 620 160 C700 156 760 136 840 140 C920 144 980 158 1060 150 C1120 144 1160 136 1200 132 V240 H0 Z"
          />
          <path
            className="ridge-3"
            d="M0 186 C90 176 160 190 250 184 C340 178 420 164 520 170 C610 176 680 190 780 182 C870 175 950 166 1040 172 C1110 177 1160 170 1200 166 V240 H0 Z"
          />
          <path
            className="ridge-4"
            d="M0 204 C120 196 220 210 340 206 C460 202 560 194 680 200 C800 206 900 214 1020 208 C1100 204 1160 200 1200 198 V240 H0 Z"
          />
        </svg>
      )}
      <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-24 sm:pt-16 sm:pb-32">
        {children}
      </div>
    </div>
  );
}
