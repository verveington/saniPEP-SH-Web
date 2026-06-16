import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const fail = (message) => {
  throw new Error(message);
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const requiredRoutes = [
  "/",
  "/hilfe-finden",
  "/lymphoedem-lipoedem-narbenkompression",
  "/brustprothetik",
  "/bandagen-orthesen-reha-stoma",
  "/inkontinenz-pflege",
  "/rezept-hochladen",
  "/termin-anfragen",
  "/kontakt",
  "/portal/login",
  "/portal",
  "/admin/requests",
  "/admin/integrations",
  "/admin/design-lab",
];

const publicConversionRoutes = [
  "/",
  "/hilfe-finden",
  "/lymphoedem-lipoedem-narbenkompression",
  "/brustprothetik",
  "/bandagen-orthesen-reha-stoma",
  "/inkontinenz-pflege",
  "/rezept-hochladen",
  "/termin-anfragen",
  "/kontakt",
];

const privateRoutes = [
  "/portal/login",
  "/portal",
  "/admin/requests",
  "/admin/integrations",
  "/admin/design-lab",
];

const requiredContentTypes = [
  "landing-page-section",
  "service-page",
  "symptom",
  "product-group",
  "contact-setting",
  "portal-help-content",
  "form-configuration",
  "legal-page",
  "faq",
  "hero-content",
];

const forbiddenCmsAttributePatterns = [
  /patient/i,
  /birth/i,
  /insurance/i,
  /diagnos/i,
  /omnia/i,
  /rezept/i,
  /prescriptionFile/i,
  /healthDetail/i,
  /medicalRecord/i,
];

const routeMetadata = readJson("apps/frontend/src/lib/routeMetadata.json");
const routeKeys = Object.keys(routeMetadata);

for (const route of requiredRoutes) {
  const metadata = routeMetadata[route];
  assert(metadata, `Missing route metadata for ${route}`);
  assert(metadata.canonicalPath === route, `Canonical path mismatch for ${route}`);
  assert(metadata.title.length >= 20 && metadata.title.length <= 75, `SEO title length is off for ${route}`);
  assert(
    metadata.description.length >= 80 && metadata.description.length <= 180,
    `SEO description length is off for ${route}`,
  );
}

assert(
  routeKeys.length === requiredRoutes.length,
  `Route metadata has ${routeKeys.length} routes, expected ${requiredRoutes.length}`,
);

for (const route of publicConversionRoutes) {
  assert(routeMetadata[route].audience === "public", `${route} must be public`);
  assert(routeMetadata[route].robots === "index,follow", `${route} must be indexable for conversion`);
}

for (const route of privateRoutes) {
  assert(routeMetadata[route].robots === "noindex,nofollow", `${route} must stay noindex`);
}

const contentTypeUids = new Set();
const allCmsAttributeKeys = [];

for (const typeName of requiredContentTypes) {
  const schema = readJson(`apps/cms/content-types/${typeName}/schema.json`);
  assert(schema.kind === "collectionType" || schema.kind === "singleType", `${typeName} has invalid kind`);
  assert(schema.info?.singularName === typeName, `${typeName} singularName mismatch`);
  assert(schema.info?.pluralName, `${typeName} missing pluralName`);
  assert(schema.info?.displayName, `${typeName} missing displayName`);
  assert(schema.attributes && Object.keys(schema.attributes).length > 0, `${typeName} has no attributes`);

  contentTypeUids.add(`api::${schema.info.singularName}.${schema.info.singularName}`);
  allCmsAttributeKeys.push(...Object.keys(schema.attributes));
}

for (const [route, metadata] of Object.entries(routeMetadata)) {
  if (!metadata.strapiUid) continue;
  assert(contentTypeUids.has(metadata.strapiUid), `${route} references unknown Strapi UID ${metadata.strapiUid}`);
}

for (const key of allCmsAttributeKeys) {
  for (const pattern of forbiddenCmsAttributePatterns) {
    assert(!pattern.test(key), `Sensitive field name "${key}" must not be modeled in Strapi`);
  }
}

const formConfiguration = readJson("apps/cms/content-types/form-configuration/schema.json");
assert(
  formConfiguration.attributes.staffReviewRequired.default === true,
  "Form configurations must require staff review by default",
);
assert(
  formConfiguration.attributes.localPersistence.default === "none",
  "Form configurations must default to no local persistence",
);

const symptom = readJson("apps/cms/content-types/symptom/schema.json");
assert(
  symptom.attributes.category.enum.join(",") === "symptom,product,situation",
  "Symptom search categories must preserve symptom > product > situation architecture",
);

console.log("Architecture check passed");
console.log(`Routes checked: ${requiredRoutes.length}`);
console.log(`CMS content types checked: ${requiredContentTypes.length}`);
