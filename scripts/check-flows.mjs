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
const portalUiSource = readSourceFiles("apps/portal/src").join("\n");
const adminUiSource = readSourceFiles("apps/admin/src").join("\n");
const workflow = read("apps/frontend/src/lib/requestWorkflow.ts");
const search = read("apps/frontend/src/lib/searchIndex.ts");
const privacy = read("apps/frontend/src/lib/privacySecurity.ts");
const auth = read("apps/frontend/src/lib/authAdapter.ts");
const conversion = read("apps/frontend/src/lib/conversionFunnel.ts");
const accessControl = read("apps/shared/security/accessControl.ts");
const backendApp = read("apps/backend/src/app.ts");
const portalRepository = read("apps/backend/src/repositories/portalMvpRepository.ts");
const portalApi = read("apps/portal/src/api.ts");
const portalViteConfig = read("apps/portal/vite.config.ts");
const adminViteConfig = read("apps/admin/vite.config.ts");
const portalMigration = read("apps/backend/migrations/0002_portal_mvp_request_details.sql");
const portalDemo = read("scripts/demo-portal-mvp.mjs");
const packageJson = read("package.json");
const postgresPublicRequestCheck = read("scripts/check-public-requests-postgres.mjs");
const sourceBundle = [
  publicUiSource,
  portalUiSource,
  adminUiSource,
  backendApp,
  portalRepository,
  workflow,
  search,
  privacy,
  conversion,
  read("apps/frontend/src/lib/calendarAdapter.ts"),
].join("\n");

const requiredConversionLabels = [
  "Termin anfragen",
  "Rezept vorab einreichen",
  "Anfrage senden",
  "Bestellanfrage vorbereiten",
  "Portal in Vorbereitung",
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
assert(publicUiSource.includes("disabled={!validation.valid"), "Submit buttons must be disabled until valid");
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
assert(publicUiSource.includes("type: \"document\""), "Prescription/document flow must submit a metadata-only public request");
assert(publicUiSource.includes("Metadaten-Anfrage senden"), "Prescription/document flow must not label the action as a productive upload");
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

assert(portalUiSource.includes("portalApi.login"), "Portal app must login against backend API");
assert(portalUiSource.includes("credentials: \"include\""), "Portal API must use cookie credentials");
assert(portalUiSource.includes("csrfToken"), "Portal API must keep CSRF token in memory");
assert(!portalApi.includes("?? \"http://localhost:4100\""), "Portal API must not default browser fetches to a fixed backend localhost port");
assert(
  portalViteConfig.includes("\"/api\"") &&
  portalViteConfig.includes("PORTAL_BACKEND_PROXY_TARGET") &&
  portalViteConfig.includes("127.0.0.1:4100"),
  "Portal dev server must proxy same-origin /api calls to the backend",
);
assert(portalUiSource.includes("Rezeptupload-Anfrage"), "Portal MVP must expose prescription-upload request creation");
assert(portalUiSource.includes("Terminwunsch"), "Portal MVP must expose appointment request creation");
assert(portalUiSource.includes("Bestellanfrage"), "Portal MVP must expose reorder request creation");
assert(portalUiSource.includes("Abo-Wunsch"), "Portal MVP must expose subscription-change request creation");
assert(portalUiSource.includes("Kontaktanfrage"), "Portal MVP must expose contact request creation");
assert(portalUiSource.includes("Mitarbeiterstatus"), "Portal MVP must display staff review status");
assert(portalUiSource.includes("Letzte Aktivitäten"), "Portal MVP must display latest activities");
assert(portalUiSource.includes("Audit Events"), "Portal MVP must display audit events");
assert(portalUiSource.includes("StaffAdminWorkbench"), "Portal MVP must expose a staff/admin request workbench");
assert(portalUiSource.includes("Filter anwenden"), "Staff/admin UI must support request filters");
assert(portalUiSource.includes("Detailansicht"), "Staff/admin UI must show request details");
assert(portalUiSource.includes("Status ändern"), "Staff/admin UI must support status changes");
assert(portalUiSource.includes("portalApi.staffRequests"), "Staff/admin UI must load requests from the backend");
assert(!portalUiSource.includes("authAdapter"), "Portal MVP must not use the frontend mock auth adapter");
assert(!portalUiSource.includes("portalDashboard"), "Portal MVP must not render mock portalDashboard data");
assert(!portalApi.includes("fileName"), "Portal API must not send upload file names to the backend");
assert(!backendApp.includes("fileName"), "Backend must not accept or store upload file names");

assert(backendApp.includes("\"/api/auth/login\""), "Backend must expose auth login endpoint");
assert(backendApp.includes("\"/api/staff/auth/login\""), "Backend must expose a staff-only login endpoint");
assert(backendApp.includes("\"/api/auth/session\""), "Backend must expose session endpoint");
assert(backendApp.includes("\"/api/staff/session\""), "Backend must expose a staff-only session endpoint");
assert(backendApp.includes("\"/api/portal/dashboard\""), "Backend must expose portal dashboard endpoint");
assert(backendApp.includes("\"/api/portal/requests\""), "Backend must expose portal request creation endpoint");
assert(backendApp.includes("\"/api/staff/requests\""), "Backend must expose staff/admin request list endpoint");
assert(backendApp.includes("statusRoute") && backendApp.includes("PATCH"), "Backend must expose server-side staff status endpoint");
assert(backendApp.includes("metadata-only-no-file-content"), "Backend upload MVP must store metadata only");
assert(backendApp.includes("\"document\""), "Backend public request API must accept document metadata requests");
assert(backendApp.includes("metadata-only-no-file-transfer"), "Backend public document requests must remain metadata-only");
assert(backendApp.includes("productionUpload: false"), "Backend must mark upload requests as non-production");
assert(backendApp.includes("omniaWriteAllowed: false"), "Backend portal requests must block Omnia writes");
assert(backendApp.includes("portal-request-created"), "Backend must audit created portal requests");
assert(backendApp.includes("portal-request-submitted"), "Backend must audit submitted portal requests");
assert(backendApp.includes("portal-request-changed"), "Backend must audit changed portal requests");
assert(backendApp.includes("portal-request-approved"), "Backend must audit approved portal requests");
assert(backendApp.includes("portal-request-rejected"), "Backend must audit rejected portal requests");
assert(backendApp.includes("requireRole"), "Backend must enforce server-side role checks");
assert(backendApp.includes("portal-login-rate-limited"), "Backend must prepare route-specific login rate-limit auditing");
assert(backendApp.includes("actorStaffUserId"), "Staff status audit metadata must carry staff actor context");
assert(!backendApp.includes("OMNIA_API_BASE_URL"), "Portal MVP request path must not call Omnia");
assert(!backendApp.includes("createPortalMvpState"), "Backend MVP must not use in-memory portal state");

assert(portalRepository.includes("createFilePortalMvpRepository"), "Portal MVP must use repository-layer persistence");
assert(portalRepository.includes("readFile") && portalRepository.includes("writeFile"), "Local development repository must persist data to disk");
assert(portalRepository.includes("listAllRequests"), "Repository must support staff/admin request lists");
assert(portalRepository.includes("passwordHashSha256"), "Repository seed users must store password hashes, not demo passwords");
assert(portalMigration.includes("portal_request_details"), "Portal MVP request detail migration is missing");
assert(portalMigration.includes("safe-metadata-only"), "Portal MVP migration must constrain request details to safe metadata");

assert(adminUiSource.includes("staffAdminApi.login"), "Staff admin UI must login through the staff auth API");
assert(adminUiSource.includes("staffAdminApi.listRequests"), "Staff admin UI must load request lists from the backend");
assert(adminUiSource.includes("staffAdminApi.requestDetail"), "Staff admin UI must load request details from the backend");
assert(adminUiSource.includes("staffAdminApi.updateStatus"), "Staff admin UI must update status through the backend");
assert(adminUiSource.includes("credentials: \"include\""), "Staff admin API must use cookie credentials");
assert(adminUiSource.includes("csrfToken"), "Staff admin UI must keep CSRF token in memory");
assert(adminUiSource.includes("Request-Liste"), "Staff admin UI must render the request list");
assert(adminUiSource.includes("Request-Details"), "Staff admin UI must render request details");
assert(
  adminViteConfig.includes("\"/api\"") &&
  adminViteConfig.includes("PORTAL_BACKEND_PROXY_TARGET") &&
  adminViteConfig.includes("127.0.0.1:4100"),
  "Admin dev server must proxy same-origin /api calls to the backend",
);
assert(packageJson.includes("check:public-requests:postgres"), "Postgres public-request check script must be exposed through package.json");
assert(postgresPublicRequestCheck.includes("assertBackendSchema"), "Postgres public-request check must assert backend schema before API tests");
assert(postgresPublicRequestCheck.includes("schema_migrations"), "Postgres public-request check must validate migration history");
assert(postgresPublicRequestCheck.includes("checksumSha256"), "Postgres public-request check must validate migration checksums");
assert(postgresPublicRequestCheck.includes("uploadObjectsCreated"), "Postgres public-request check must report no upload objects");
assert(postgresPublicRequestCheck.includes("Max-Age=0"), "Postgres public-request check must verify logout cookie expiry");
assert(postgresPublicRequestCheck.includes("invalid-csrf-token"), "Postgres public-request check must verify CSRF rejection");

assert(portalDemo.includes("/api/auth/login"), "Portal MVP demo must exercise backend login");
assert(portalDemo.includes("prescription_upload"), "Portal MVP demo must create prescription upload request");
assert(portalDemo.includes("appointment_request"), "Portal MVP demo must create appointment request");
assert(portalDemo.includes("reorder_request"), "Portal MVP demo must create reorder request");
assert(portalDemo.includes("subscription_change_request"), "Portal MVP demo must create subscription-change request");
assert(portalDemo.includes("health_contact_request"), "Portal MVP demo must create contact request");
assert(portalDemo.includes("PORTAL_DEV_STAFF_EMAIL"), "Portal MVP demo must require env-provided staff credentials");
assert(portalDemo.includes("/api/staff/requests?status=new"), "Portal MVP demo must exercise staff request filters");
assert(portalDemo.includes("Customer dashboard did not show the staff-updated completed status"), "Portal MVP demo must verify the customer sees staff status changes");
assert(portalDemo.includes("portal-request-approved"), "Portal MVP demo must assert approved audit action");
assert(portalDemo.includes("portal-request-rejected"), "Portal MVP demo must assert rejected audit action");
assert(portalDemo.includes("omniaWrites === 0"), "Portal MVP demo must assert no Omnia writes");

assert(!/\b(localStorage|sessionStorage|indexedDB)\b/.test(sourceBundle), "Sensitive MVP flows must not use browser persistence");

console.log("Flow check passed");
console.log("Public forms, portal MVP, upload security, auth boundary, coarse analytics and privacy boundaries checked");
