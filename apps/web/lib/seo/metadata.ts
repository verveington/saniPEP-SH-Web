import type { Metadata } from "next";
import routeMetadataJson from "@frontend/lib/routeMetadata.json";
import type { Route, RouteMetadata } from "@frontend/lib/types";
import { getSeoEntry } from "../cms/strapi";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.sanipep.de";
const socialImage = {
  url: new URL("/brand/sanipep-social-preview.svg", siteUrl),
  width: 1200,
  height: 630,
  alt: "saniPEP Sanitätshaus München",
};
const metadataByRoute = routeMetadataJson as Record<Route, RouteMetadata>;

type CmsSeo = {
  title?: string;
  description?: string;
  canonicalPath?: string;
  robots?: RouteMetadata["robots"];
  ogTitle?: string;
  ogDescription?: string;
};

export const getRouteMetadata = (route: Route): RouteMetadata =>
  metadataByRoute[route] ?? metadataByRoute["/"];

export async function buildRouteMetadata(route: Route): Promise<Metadata> {
  const fallback = getRouteMetadata(route);
  const cmsSeo = (await getSeoEntry(route))?.seo as CmsSeo | undefined;
  const title = cmsSeo?.title ?? fallback.title;
  const description = cmsSeo?.description ?? fallback.description;
  const canonicalPath = cmsSeo?.canonicalPath ?? fallback.canonicalPath;
  const canonicalUrl = new URL(canonicalPath, siteUrl);
  const robots = cmsSeo?.robots ?? fallback.robots;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots,
    openGraph: {
      title: cmsSeo?.ogTitle ?? title,
      description: cmsSeo?.ogDescription ?? description,
      url: canonicalUrl,
      siteName: "saniPEP Sanitätshaus",
      locale: "de_DE",
      type: "website",
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage.url.toString()],
    },
  };
}
