import type { MetadataRoute } from "next";

import { site } from "@/config/site";

/** TR-SEO-4: account, admin and discussion pages stay out of search engines. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/me", "/admin", "/signin", "/welcome", "/report", "/auth", "/g/*/discussions", "/g/*/members", "/g/*/edit", "/g/*/reports"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
