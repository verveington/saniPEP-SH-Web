import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const fail = (message) => {
  throw new Error(message);
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const app = read("apps/frontend/src/App.tsx");
const workflow = read("apps/frontend/src/lib/requestWorkflow.ts");
const search = read("apps/frontend/src/lib/searchIndex.ts");
const privacy = read("apps/frontend/src/lib/privacySecurity.ts");
const auth = read("apps/frontend/src/lib/authAdapter.ts");
const conversion = read("apps/frontend/src/lib/conversionFunnel.ts");
const sourceBundle = [
  app,
  workflow,
  search,
  privacy,
  auth,
  conversion,
  read("apps/frontend/src/lib/omniaAdapter.ts"),
  read("apps/frontend/src/lib/calendarAdapter.ts"),
].join("\n");

const requiredConversionLabels = [
  "Termin buchen",
  "Rezept hochladen",
  "Anfrage senden",
  "Bestellanfrage vorbereiten",
  "Portal aktivieren",
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
  assert(app.includes(label), `Missing conversion CTA: ${label}`);
}

for (const title of requiredStepTitles) {
  assert(app.includes(`title="${title}"`), `Missing mobile form step: ${title}`);
}

assert(app.includes("function FormStep"), "Reusable mobile FormStep component is missing");
assert(app.includes("function StateNotice"), "Responsive state component is missing");
assert(app.includes("function ConversionFunnelPanel"), "Conversion funnel panel is missing");
assert(app.includes("onConversion"), "Request forms must emit safe conversion events");
assert(app.includes("Mobile Karten-/Reihenansicht"), "Portal history needs a mobile cards/list variant");
assert(!/<table[\s>]/i.test(app), "Tables are not allowed for the current mobile-first portal scope");

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
assert(auth.includes("oneTimePasswordDelivery"), "Portal activation must document one-time password delivery");
assert(conversion.includes("conversionPrivacyBoundary"), "Conversion tracking must define a privacy boundary");
assert(conversion.includes("Keine Namen"), "Conversion tracking must explicitly exclude personal data");
assert(conversion.includes("Keine Namen, Dateien, Diagnosen, Freitexte, Omnia-IDs"), "Conversion events must not contain sensitive request details");
assert(conversion.includes("request-submitted"), "Conversion tracking must cover submitted requests");

assert(!/\b(localStorage|sessionStorage|indexedDB)\b/.test(sourceBundle), "Sensitive MVP flows must not use browser persistence");

console.log("Flow check passed");
console.log("Conversion CTAs, mobile steps, Omnia guardrails, search priority and privacy boundaries checked");
