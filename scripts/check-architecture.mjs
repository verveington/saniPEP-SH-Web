import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const readSourceFileEntries = (relativeDir) => {
  const absoluteDir = path.join(root, relativeDir);
  return fs
    .readdirSync(absoluteDir, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) return readSourceFileEntries(entryPath);
      if (!/\.(ts|tsx)$/.test(entry.name)) return [];
      return {
        relativePath: entryPath.split(path.sep).join("/"),
        source: fs.readFileSync(path.join(root, entryPath), "utf8"),
      };
    });
};
const readSourceFiles = (relativeDir) => readSourceFileEntries(relativeDir).map((entry) => entry.source);

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
  "/inkontinenz-pflegehilfsmittel",
  "/rezept-upload",
  "/termin-anfragen",
  "/kontakt",
  "/impressum",
  "/datenschutz",
  "/einwilligung",
  "/portal/login",
];

const publicConversionRoutes = [
  "/",
  "/hilfe-finden",
  "/lymphoedem-lipoedem-narbenkompression",
  "/brustprothetik",
  "/bandagen-orthesen-reha-stoma",
  "/inkontinenz-pflegehilfsmittel",
  "/rezept-upload",
  "/termin-anfragen",
  "/kontakt",
];

const privateRoutes = [
  "/portal/login",
];

const requiredContentTypes = [
  "landing-page-section",
  "service-page",
  "symptom",
  "product-group",
  "contact-setting",
  "opening-hour",
  "portal-help-content",
  "seo-metadata",
  "form-configuration",
  "legal-page",
  "faq",
  "hero-content",
  "icon-asset",
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
const cmsSeed = readJson("apps/cms/mock-content/public-content.seed.json");
const saniPepCmsConfig = fs.readFileSync(path.join(root, "apps/cms/config/sanipep.js"), "utf8");
const routeKeys = Object.keys(routeMetadata);
const publicApp = [
  fs.readFileSync(path.join(root, "apps/frontend/src/App.tsx"), "utf8"),
  ...readSourceFiles("apps/frontend/src/app"),
  ...readSourceFiles("apps/frontend/src/components"),
  ...readSourceFiles("apps/frontend/src/pages"),
].join("\n");

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

assert(!routeKeys.some((route) => route.startsWith("/admin")), "Public route metadata must not expose admin routes");
assert(!routeKeys.includes("/portal"), "Public route metadata must not expose the portal dashboard route");
assert(!publicApp.includes("/admin/"), "Public app must not link admin routes");
assert(!publicApp.includes("/admin"), "Public app must not contain admin routes");
assert(!publicApp.includes("design-lab"), "Public app must not contain design-lab routes");
assert(!publicApp.includes("authAdapter"), "Public app must not import mock auth");
assert(!publicApp.includes("mockData"), "Public app must not import mock data");
assert(!publicApp.includes("staffReview"), "Public app must not import staff review mocks");
assert(fs.existsSync(path.join(root, "apps/portal/vite.config.ts")), "Portal must have a separate build config");
assert(fs.existsSync(path.join(root, "apps/admin/vite.config.ts")), "Admin must have a separate build config");
assert(fs.existsSync(path.join(root, "apps/design-lab/vite.config.ts")), "Design-Lab must have a separate build config");
assert(fs.existsSync(path.join(root, "apps/shared/security/accessControl.ts")), "Shared server auth boundary must exist");
assert(fs.existsSync(path.join(root, "apps/shared/icons/png/outline")), "Shared outline icon database must exist");
assert(fs.existsSync(path.join(root, "apps/shared/icons/SharedIcon.tsx")), "SharedIcon renderer must exist");
assert(fs.existsSync(path.join(root, "apps/shared/icons/README.md")), "Icon governance documentation must exist");

const iconRegistrySource = fs.readFileSync(path.join(root, "apps/shared/icons/iconRegistry.ts"), "utf8");
for (const match of iconRegistrySource.matchAll(/from\s+["'](.+)["']/g)) {
  assert(
    match[1].startsWith("./png/outline/"),
    `Shared icon registry must import only outline assets, found ${match[1]}`,
  );
}

const sourceEntriesForIconPolicy = [
  ...readSourceFileEntries("apps/web/components"),
  ...readSourceFileEntries("apps/frontend/src/components"),
  ...readSourceFileEntries("apps/frontend/src/pages"),
  ...readSourceFileEntries("apps/portal/src"),
  ...readSourceFileEntries("apps/admin/src"),
  ...readSourceFileEntries("apps/design-lab/src"),
];
const lucideControlGlyphFiles = new Set([
  "apps/web/components/common.tsx",
  "apps/web/components/PublicLayout.tsx",
  "apps/web/components/LandingPage.tsx",
  "apps/web/components/ServiceCard.tsx",
  "apps/web/components/ServicePage.tsx",
  "apps/web/components/HelpFinderClient.tsx",
  "apps/web/components/LocationContact.tsx",
  "apps/web/components/forms/AppointmentRequestForm.tsx",
  "apps/web/components/forms/CareConfiguratorForm.tsx",
  "apps/web/components/forms/ContactInquiryForm.tsx",
  "apps/web/components/forms/PrescriptionUploadForm.tsx",
  "apps/frontend/src/components/common.tsx",
  "apps/frontend/src/components/PublicLayout.tsx",
  "apps/frontend/src/components/ServiceCard.tsx",
  "apps/frontend/src/components/LocationContact.tsx",
  "apps/frontend/src/pages/AppointmentRequestPage.tsx",
  "apps/frontend/src/pages/ConfiguratorPage.tsx",
  "apps/frontend/src/pages/ContactPage.tsx",
  "apps/frontend/src/pages/HelpFinderPage.tsx",
  "apps/frontend/src/pages/LandingPage.tsx",
  "apps/frontend/src/pages/PrescriptionUploadPage.tsx",
  "apps/frontend/src/pages/ServicePage.tsx",
  "apps/portal/src/main.tsx",
  "apps/admin/src/main.tsx",
  "apps/design-lab/src/main.tsx",
  "apps/design-lab/src/BrandSystemWorkshop.tsx",
]);
for (const { relativePath, source } of sourceEntriesForIconPolicy) {
  assert(
    !source.includes("shared/icons/png/outline") && !source.includes("../icons/png/outline"),
    `${relativePath} must use SharedIconName/SharedIcon instead of direct outline asset paths`,
  );
  if (source.includes("lucide-react")) {
    assert(
      lucideControlGlyphFiles.has(relativePath),
      `${relativePath} imports lucide-react. Content/meaning icons must use SharedIcon; add Lucide only for control/navigation glyphs and update the policy allowlist intentionally.`,
    );
  }
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

const iconAsset = readJson("apps/cms/content-types/icon-asset/schema.json");
assert(iconAsset.attributes.key?.unique === true, "Icon assets must use unique stable keys");
assert(iconAsset.attributes.file?.type === "media", "Icon assets must reference Strapi media");
assert(iconAsset.attributes.file?.required === true, "Icon assets must require a media file");
assert(
  iconAsset.attributes.file?.allowedTypes?.join(",") === "images",
  "Icon assets must only allow image uploads",
);
assert(
  saniPepCmsConfig.includes("'api::icon-asset.icon-asset'"),
  "Icon assets must be public read content for future public pages",
);
assert(saniPepCmsConfig.includes("'Icons'"), "Strapi media folders must include Icons");

assert(cmsSeed.contentPolicy?.containsRealPatientData === false, "CMS seed must not contain real patient data");
assert(cmsSeed.contentPolicy?.containsFinalLegalTexts === false, "CMS seed must not contain final legal texts");
assert(Array.isArray(cmsSeed.seoMetadata), "CMS seed must contain seoMetadata");
const seededSeoRoutes = new Set(cmsSeed.seoMetadata.map((entry) => entry.route));
for (const route of requiredRoutes) {
  assert(seededSeoRoutes.has(route), `CMS seed missing SEO metadata for ${route}`);
}

for (const page of cmsSeed.legalPages ?? []) {
  assert(page.reviewStatus === "placeholder", `${page.slug} legal seed must stay a placeholder`);
  assert(
    /Platzhalter/i.test(page.placeholderNotice ?? "") && /Platzhalter/i.test(page.body ?? ""),
    `${page.slug} legal seed must visibly mark placeholder content`,
  );
}

const cmsSeedText = JSON.stringify(cmsSeed);
assert(!/\/rezept-hochladen|\/inkontinenz-pflege"/.test(cmsSeedText), "CMS seed must use the final public slugs");
assert(!/\b(garantiert|schmerzfrei|beschwerdefrei|heilen)\b/i.test(cmsSeedText), "CMS seed must not contain healing promises");

console.log("Architecture check passed");
console.log(`Routes checked: ${requiredRoutes.length}`);
console.log(`CMS content types checked: ${requiredContentTypes.length}`);
