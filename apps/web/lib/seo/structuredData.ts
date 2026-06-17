import seedContent from "../../../cms/mock-content/public-content.seed.json";
import type { Route } from "@frontend/lib/types";
import { getRouteMetadata } from "./metadata";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.sanipep.de";

const localBusiness = {
  "@type": "LocalBusiness",
  "@id": `${siteUrl}/#localbusiness`,
  name: "saniPEP Sanitätshaus",
  url: `${siteUrl}/`,
  telephone: "+49-89-678048-0",
  email: "sani@sanipep.de",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Charles-de-Gaulle-Str. 4",
    addressLocality: "München",
    addressCountry: "DE",
  },
  areaServed: "München",
  openingHoursSpecification: seedContent.openingHours.map((entry) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: entry.weekday,
    opens: entry.opensAt.slice(0, 5),
    closes: entry.closesAt.slice(0, 5),
  })),
};

const breadcrumbForRoute = (route: Route) => {
  const metadata = getRouteMetadata(route);
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Start",
        item: `${siteUrl}/`,
      },
      ...(route === "/"
        ? []
        : [
            {
              "@type": "ListItem",
              position: 2,
              name: metadata.title.split("|")[0].trim(),
              item: `${siteUrl}${metadata.canonicalPath}`,
            },
          ]),
    ],
  };
};

const serviceForRoute = (route: Route) => {
  const slug = route.slice(1);
  const service = seedContent.servicePages.find((entry) => entry.slug === slug);
  if (!service) return null;

  return {
    "@type": "Service",
    name: service.title,
    description: service.summary,
    areaServed: "München",
    provider: { "@id": `${siteUrl}/#localbusiness` },
  };
};

const webPageForRoute = (route: Route) => {
  const metadata = getRouteMetadata(route);
  return {
    "@type": "WebPage",
    "@id": `${siteUrl}${metadata.canonicalPath}#webpage`,
    url: `${siteUrl}${metadata.canonicalPath}`,
    name: metadata.title,
    description: metadata.description,
    isPartOf: { "@id": `${siteUrl}/#website` },
    about: route === "/" ? { "@id": `${siteUrl}/#localbusiness` } : undefined,
  };
};

export function buildStructuredData(route: Route) {
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: "saniPEP Sanitätshaus",
      inLanguage: "de-DE",
      publisher: { "@id": `${siteUrl}/#localbusiness` },
    },
    localBusiness,
    webPageForRoute(route),
    breadcrumbForRoute(route),
  ];

  const service = serviceForRoute(route);
  if (service) graph.push(service);

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
