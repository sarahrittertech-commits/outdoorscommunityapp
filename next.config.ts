import type { NextConfig } from "next";

// FR-EV-24, FR-GR-14: event photos and group covers are served from Supabase
// Storage's public event-photos and group-covers-v2 buckets, and only from there.
// Gallery photos (FR-GR-12) are private: pages show them through short-lived
// signed URLs, unoptimized, so the image optimizer never caches a members-only
// photo on the server.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const photoPatterns = supabaseUrl
  ? ["event-photos", "group-covers-v2"].map((bucket) => new URL(`/storage/v1/object/public/${bucket}/**`, supabaseUrl))
  : [];

const nextConfig: NextConfig = {
  // A small self-contained server for Railway (ADR-0003).
  output: "standalone",
  poweredByHeader: false,
  images: { remotePatterns: photoPatterns },
  experimental: {
    // An event photo or group cover may be up to 5 MB (FR-EV-24, FR-GR-14); a
    // batch of gallery photos up to 25 MB together (FR-GR-12), plus the form.
    serverActions: { bodySizeLimit: "26mb" },
    // The proxy (src/proxy.ts) buffers request bodies up to 10 MB by default
    // and cuts off the rest, so it needs the same ceiling.
    proxyClientMaxBodySize: "26mb",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // HTTPS only from the first visit on. No includeSubDomains or preload
          // until the domain is chosen (docs/runbook.md).
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
        ],
      },
    ];
  },
};

export default nextConfig;
