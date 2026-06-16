import routeMetadataJson from "./routeMetadata.json";
import type { Route, RouteMetadata } from "./types";

export const routeMetadata = routeMetadataJson as Record<Route, RouteMetadata>;

export const getRouteMetadata = (route: Route): RouteMetadata =>
  routeMetadata[route] ?? routeMetadata["/"];

const upsertMeta = (attribute: "name" | "property", key: string, content: string) => {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.content = content;
};

const upsertCanonical = (href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }

  element.href = href;
};

export const applyRouteMetadata = (route: Route) => {
  if (typeof document === "undefined") return;

  const metadata = getRouteMetadata(route);
  const origin = typeof window === "undefined" ? "https://www.sanipep.de" : window.location.origin;
  const canonicalUrl = `${origin}${metadata.canonicalPath}`;

  document.title = metadata.title;
  upsertMeta("name", "description", metadata.description);
  upsertMeta("name", "robots", metadata.robots);
  upsertMeta("property", "og:title", metadata.title);
  upsertMeta("property", "og:description", metadata.description);
  upsertMeta("property", "og:type", "website");
  upsertMeta("property", "og:url", canonicalUrl);
  upsertCanonical(canonicalUrl);
};
