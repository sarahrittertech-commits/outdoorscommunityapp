import type { NextConfig } from "next";

// FR-EV-24: event photos are served from Supabase Storage's public
// event-photos bucket, and only from there.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const eventPhotoPattern = supabaseUrl ? [new URL("/storage/v1/object/public/event-photos/**", supabaseUrl)] : [];

const nextConfig: NextConfig = {
  // A small self-contained server for Railway (ADR-0003).
  output: "standalone",
  poweredByHeader: false,
  images: { remotePatterns: eventPhotoPattern },
  experimental: {
    // An event photo may be up to 5 MB (FR-EV-24), plus the rest of the form.
    serverActions: { bodySizeLimit: "6mb" },
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
