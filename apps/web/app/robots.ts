import type { MetadataRoute } from "next";
import routeMetadataJson from "@frontend/lib/routeMetadata.json";
import type { Route, RouteMetadata } from "@frontend/lib/types";
import { getSiteUrl } from "../lib/seo/siteUrl";

const routeMetadata = routeMetadataJson as Record<Route, RouteMetadata>;

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
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
