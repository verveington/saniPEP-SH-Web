import seedContent from "../../../cms/mock-content/public-content.seed.json";
import type { Route } from "@frontend/lib/types";

type SeedContent = typeof seedContent;
type SeedSeoEntry = SeedContent["seoMetadata"][number];
type SeedServicePage = SeedContent["servicePages"][number];
type SeedLegalPage = SeedContent["legalPages"][number];
type SeedContactSetting = SeedContent["contactSetting"];
type SeedOpeningHour = SeedContent["openingHours"][number];

const strapiBaseUrl = process.env.STRAPI_API_URL;
const strapiApiToken = process.env.STRAPI_API_TOKEN ?? process.env.STRAPI_PUBLIC_READ_TOKEN;

const getStrapiHeaders = () => {
  const headers: HeadersInit = { Accept: "application/json" };
  if (strapiApiToken) headers.Authorization = `Bearer ${strapiApiToken}`;
  return headers;
};

async function fetchStrapiJson<T>(path: string): Promise<T | null> {
  if (!strapiBaseUrl) return null;

  try {
    const response = await fetch(`${strapiBaseUrl.replace(/\/$/, "")}${path}`, {
      headers: getStrapiHeaders(),
      next: { revalidate: 3600, tags: ["strapi-public-content"] },
    });

    if (!response.ok) return null;
    return response.json() as Promise<T>;
  } catch {
    return null;
  }
}

type StrapiRestItem<T> = T & { id?: number; documentId?: string; attributes?: T };
type StrapiCollectionResponse<T> = { data?: Array<StrapiRestItem<T>> | StrapiRestItem<T> | null };

function normalizeStrapiItem<T>(item: StrapiRestItem<T> | null | undefined): T | undefined {
  if (!item) return undefined;
  if ("attributes" in item && item.attributes) return item.attributes;
  return item;
}

function normalizeStrapiData<T>(response: StrapiCollectionResponse<T> | null): T[] {
  if (!response?.data) return [];
  const items = Array.isArray(response.data) ? response.data : [response.data];
  return items.map((item) => normalizeStrapiItem<T>(item)).filter((item): item is T => Boolean(item));
}

function firstStrapiItem<T>(response: StrapiCollectionResponse<T> | null): T | undefined {
  return normalizeStrapiData(response)[0];
}

export const getPublicContentSeed = async () => seedContent;

export const getSeoEntry = async (route: Route): Promise<SeedSeoEntry | undefined> => {
  const strapiEntry = await fetchStrapiJson<StrapiCollectionResponse<SeedSeoEntry>>(
    `/api/seo-metadata-entries?filters[route][$eq]=${encodeURIComponent(route)}&populate=*`,
  );

  return firstStrapiItem(strapiEntry) ?? seedContent.seoMetadata.find((entry) => entry.route === route);
};

export const getServicePageBySlug = async (slug: string): Promise<SeedServicePage | undefined> => {
  const strapiEntry = await fetchStrapiJson<StrapiCollectionResponse<SeedServicePage>>(
    `/api/service-pages?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`,
  );

  return firstStrapiItem(strapiEntry) ?? seedContent.servicePages.find((entry) => entry.slug === slug);
};

export const getLandingPageSections = async () => {
  const strapiEntries = await fetchStrapiJson<StrapiCollectionResponse<SeedContent["landingPageSections"][number]>>(
    "/api/landing-page-sections?filters[visibleOnWebsite][$eq]=true&sort=sortOrder:asc&populate=*",
  );

  const sections = normalizeStrapiData(strapiEntries);
  return sections.length > 0 ? sections : seedContent.landingPageSections;
};

export const getLegalPageByKind = async (kind: SeedLegalPage["legalKind"]): Promise<SeedLegalPage | undefined> => {
  const strapiEntry = await fetchStrapiJson<StrapiCollectionResponse<SeedLegalPage>>(
    `/api/legal-pages?filters[legalKind][$eq]=${encodeURIComponent(kind)}&populate=*`,
  );

  return firstStrapiItem(strapiEntry) ?? seedContent.legalPages.find((entry) => entry.legalKind === kind);
};

export const getContactContent = async (): Promise<{
  contactSetting: SeedContactSetting;
  openingHours: SeedOpeningHour[];
}> => {
  const contactEntry = await fetchStrapiJson<StrapiCollectionResponse<SeedContactSetting>>("/api/contact-setting?populate=*");
  const openingHourEntries = await fetchStrapiJson<StrapiCollectionResponse<SeedOpeningHour>>(
    "/api/opening-hours?filters[visibleOnWebsite][$eq]=true&sort=sortOrder:asc",
  );

  const openingHours = normalizeStrapiData(openingHourEntries);

  return {
    contactSetting: firstStrapiItem(contactEntry) ?? seedContent.contactSetting,
    openingHours: openingHours.length > 0 ? openingHours : seedContent.openingHours,
  };
};
