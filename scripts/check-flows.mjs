import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const readSourceFiles = (relativeDir) => {
  const absoluteDir = path.join(root, relativeDir);
  return fs
    .readdirSync(absoluteDir, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) return readSourceFiles(entryPath);
      if (!/\.(ts|tsx)$/.test(entry.name)) return [];
      return read(entryPath);
    });
};

const fail = (message) => {
  throw new Error(message);
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const publicUiSource = [
  read("apps/frontend/src/App.tsx"),
  ...readSourceFiles("apps/frontend/src/app"),
  ...readSourceFiles("apps/frontend/src/components"),
  ...readSourceFiles("apps/frontend/src/pages"),
].join("\n");
const workflow = read("apps/frontend/src/lib/requestWorkflow.ts");
const search = read("apps/frontend/src/lib/searchIndex.ts");
const privacy = read("apps/frontend/src/lib/privacySecurity.ts");
const auth = read("apps/frontend/src/lib/authAdapter.ts");
const conversion = read("apps/frontend/src/lib/conversionFunnel.ts");
const accessControl = read("apps/shared/security/accessControl.ts");
const sourceBundle = [
  publicUiSource,
  workflow,
  search,
  privacy,
  conversion,
  read("apps/frontend/src/lib/calendarAdapter.ts"),
].join("\n");

const requiredConversionLabels = [
  "Termin anfragen",
  "Rezept hochladen",
  "Anfrage senden",
  "Bestellanfrage vorbereiten",
  "Kundenportal Login",
];

const requiredStepTitles = [
  "Bedarf einordnen",
  "Rezept auswählen",
  "Einwilligung bestätigen",
  "Anliegen wählen",
  "Wunschfenster nennen",
  "Kontakt und Fragebogen",
  "Anfrage zuordnen",
  "Kontaktweg festlegen",
  "Nachricht senden",
];

const blockedOmniaIntents = [
  "direct-update-omnia-master-data",
  "direct-change-supply",
  "final-order-submit",
  "edit-prescription-data",
];

for (const label of requiredConversionLabels) {
  assert(publicUiSource.includes(label), `Missing conversion CTA: ${label}`);
}

for (const title of requiredStepTitles) {
  assert(publicUiSource.includes(`title="${title}"`), `Missing mobile form step: ${title}`);
}

assert(publicUiSource.includes("function FormStep"), "Reusable mobile FormStep component is missing");
assert(publicUiSource.includes("validateAppointmentInput"), "Appointment submit must use existing validation");
assert(publicUiSource.includes("validateContactInquiryInput"), "Contact submit must use existing validation");
assert(publicUiSource.includes("validateCareConfigurationInput"), "Care configuration submit must use existing validation");
assert(publicUiSource.includes("validateUploadInput"), "Upload submit must use existing validation");
assert(publicUiSource.includes("aria-invalid"), "Form fields must expose aria-invalid");
assert(publicUiSource.includes("aria-describedby"), "Form fields must expose aria-describedby");
assert(publicUiSource.includes("disabled={!validation.valid}"), "Submit buttons must be disabled until valid");
assert(publicUiSource.includes("onConversion"), "Request forms must emit safe conversion events");
assert(!/<table[\s>]/i.test(publicUiSource), "Tables are not allowed for the current mobile-first portal scope");
assert(!publicUiSource.includes("authAdapter"), "Public app must not import mock auth");
assert(!publicUiSource.includes("portalDashboard"), "Public app must not import mock portal data");
assert(!publicUiSource.includes("/admin"), "Public app must not expose admin links");
assert(!publicUiSource.includes("design-lab"), "Public app must not expose design-lab links");

for (const intent of blockedOmniaIntents) {
  const start = workflow.indexOf(`"${intent}":`);
  assert(start >= 0, `Missing blocked Omnia intent ${intent}`);
  const block = workflow.slice(start, workflow.indexOf("},", start) + 2);
  assert(block.includes("allowed: false"), `${intent} must be blocked`);
  assert(block.includes("omniaWriteAllowed: false"), `${intent} must not allow Omnia writes`);
}

const allowedPolicyBlocks = workflow.match(/allowed: true,[\s\S]*?omniaWriteAllowed: false/g) ?? [];
assert(allowedPolicyBlocks.length >= 7, "All allowed portal actions must remain request-based without Omnia writes");
assert(!workflow.includes("allowed: true,\n    executionMode: \"request\",\n    staffReviewRequired: false"), "Allowed request actions require staff review");

assert(search.includes("symptom: 300"), "Search must prioritize symptoms above product and situation language");
assert(search.includes("product: 200"), "Search product boost is missing");
assert(search.includes("situation: 100"), "Search situation boost is missing");
assert(search.includes("primaryAction: \"appointment\""), "Search must route appointment-ready users");
assert(search.includes("primaryAction: \"upload\""), "Search must route prescription-upload users");
assert(search.includes("primaryAction: \"configure\""), "Search must route care configuration users");
assert(search.includes("primaryAction: \"inquiry\""), "Search must route written inquiry users");

assert(privacy.includes("localPersistence: \"none\""), "Upload policy must default to no local persistence");
assert(privacy.includes("antivirusScanRequired: true"), "Prescription upload policy must require antivirus scan");
assert(privacy.includes("encryptionRequired: true"), "Prescription upload policy must require encryption");
assert(privacy.includes("uploadAcceptAttribute"), "Upload accept attribute must be centralized");
assert(privacy.includes("maxUploadFileSizeBytes"), "Upload max size must be centralized");
assert(privacy.includes("mime-sniff-file-signature"), "Server-side MIME sniffing must be part of the upload boundary");
assert(privacy.includes("store-in-quarantine-bucket"), "Quarantine bucket must be part of the upload boundary");
assert(privacy.includes("run-antivirus-scan-before-staff-review"), "AV scan must be part of the upload boundary");
assert(publicUiSource.includes("useState<ConsentScope[]>([])"), "Upload consent scopes must start empty");
assert(publicUiSource.includes("accept: uploadAcceptAttribute"), "FileUpload must receive accept policy");
assert(publicUiSource.includes("\"data-max-file-size\": String(maxUploadFileSizeBytes)"), "FileUpload must receive max file size metadata");
assert(auth.includes("oneTimePasswordDelivery"), "Portal activation must document one-time password delivery");
assert(conversion.includes("conversionPrivacyBoundary"), "Conversion tracking must define a privacy boundary");
assert(conversion.includes("Keine Namen"), "Conversion tracking must explicitly exclude personal data");
assert(conversion.includes("Keine Namen, Dateien, Diagnosen, Fachbereiche, Freitexte, Omnia-IDs"), "Conversion events must not contain sensitive request details");
assert(conversion.includes("request-submitted"), "Conversion tracking must cover submitted requests");
assert(!conversion.includes("safeCategory"), "Conversion events must not include medical categories");
assert(!conversion.includes("requestType"), "Conversion events must not include request types");
assert(!conversion.includes("route: input.route"), "Conversion events must not persist routes");
assert(!conversion.includes("route: \"/"), "Seed conversion events must not persist routes");
assert(!/Lipödem|Lymphödem|Brustprothetik/i.test(conversion), "Conversion module must not contain medical categories");
assert(accessControl.includes("\"public\", \"customer\", \"staff\", \"admin\""), "Required roles must be modeled");
assert(accessControl.includes("serverAuthBoundary"), "Server-side auth boundary must be prepared");
assert(accessControl.includes("Client gates are only development diagnostics"), "Mock gates must be marked non-production");

assert(!/\b(localStorage|sessionStorage|indexedDB)\b/.test(sourceBundle), "Sensitive MVP flows must not use browser persistence");

console.log("Flow check passed");
console.log("Public forms, upload security, auth boundary, coarse analytics and privacy boundaries checked");
