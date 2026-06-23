import type { MetadataRoute } from "next";
import routeMetadataJson from "@frontend/lib/routeMetadata.json";
import type { Route, RouteMetadata } from "@frontend/lib/types";

const routeMetadata = routeMetadataJson as Record<Route, RouteMetadata>;

export default function robots(): MetadataRoute.Robots {
  const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.sanipep.de");
  const privatePaths = Object.values(routeMetadata)
    .filter((metadata) => metadata.robots === "noindex,nofollow")
    .map((metadata) => metadata.canonicalPath);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: privatePaths,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/, "");
}
