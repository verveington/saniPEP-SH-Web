import type { MetadataRoute } from "next";
import routeMetadataJson from "@frontend/lib/routeMetadata.json";
import type { Route, RouteMetadata } from "@frontend/lib/types";
import { getSiteUrl } from "../lib/seo/siteUrl";

const routeMetadata = routeMetadataJson as Record<Route, RouteMetadata>;

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return Object.values(routeMetadata)
    .filter((metadata) => metadata.audience === "public" && metadata.robots === "index,follow")
    .map((metadata) => ({
      url: `${siteUrl}${metadata.canonicalPath}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: metadata.canonicalPath === "/" ? 1 : 0.7,
    }));
}
