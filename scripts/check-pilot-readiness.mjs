import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBackendRequestHandler } from "../apps/backend/dist/app.js";
import { loadBackendEnv } from "../apps/backend/dist/config/env.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const productionPilotEnv = {
  NODE_ENV: "production",
  PORT: "4100",
  PORTAL_BACKEND_BASE_URL: "https://api.pilot.sanipep.local",
  TRUSTED_ORIGINS: "https://pilot.sanipep.local,https://staff-pilot.sanipep.local",
  PORTAL_DATABASE_URL: "postgres://sanipep_app:pilot-postgres-password@postgres:5432/sanipep_portal",
  PORTAL_DATABASE_SSL: "false",
  PORTAL_REPOSITORY_DRIVER: "postgres",
  REDIS_URL: "redis://redis:6379",
  PORTAL_SESSION_COOKIE_NAME: "__Host-sanipep_portal_session",
  PORTAL_SESSION_SECRET: "pilot-session-secret-32-characters-min",
  CSRF_SECRET: "pilot-csrf-secret-32-characters-min",
  PORTAL_OTP_HASH_SECRET: "pilot-otp-hash-secret-32-characters-min",
  PORTAL_PASSWORD_PEPPER: "pilot-password-pepper-32-characters-min",
  AUDIT_LOG_HASH_SECRET: "pilot-audit-hash-secret-32-characters-min",
  UPLOADS_ENABLED: "false",
  AV_SCANNER_MODE: "stub-disabled",
  OMNIA_WRITE_MODE: "read_only",
};

const env = loadBackendEnv(productionPilotEnv);
assert(env.nodeEnv === "production", "Pilot env must run the backend in production mode");
assert(env.portalRepositoryDriver === "postgres", "Controlled pilot must use Postgres repository");
assert(env.uploadsEnabled === false, "Controlled pilot must keep uploads disabled");
assert(env.avScannerMode === "stub-disabled", "Controlled pilot must keep AV disabled only because uploads are disabled");
assert(env.omniaWriteMode === "read_only", "Controlled pilot must keep Omnia write mode read_only");
assert(env.trustedOrigins.every((origin) => origin.startsWith("https://")), "Trusted origins must be HTTPS in production");

await assertReadyzForMetadataOnlyPilot(env);
assertPlaceholderProductionEnvIsRejected();
assertUploadProductionEnvStaysStrict();
assertRepoInvariants();

console.log("Controlled pilot readiness check passed");
console.log(JSON.stringify({
  backendNodeEnv: env.nodeEnv,
  repository: env.portalRepositoryDriver,
  uploadsEnabled: env.uploadsEnabled,
  omniaWriteMode: env.omniaWriteMode,
  readiness: "metadata-only-pilot-ready",
}, null, 2));

async function assertReadyzForMetadataOnlyPilot(pilotEnv) {
  const handler = createBackendRequestHandler(pilotEnv, {
    repository: minimalRepository(),
    readinessChecks: {
      database: async () => true,
      redis: async () => true,
    },
  });
  const response = await request(handler, "GET", "/readyz");

  assert(response.status === 200, `Expected /readyz 200 for metadata-only pilot, got ${response.status}`);
  assert(response.body.status === "ready", "Expected /readyz status ready");
  assert(response.body.checks.database.ok === true, "Database readiness must be ok");
  assert(response.body.checks.redis.ok === true, "Redis readiness must be ok");
  assert(response.body.checks.repository.ok === true, "Repository readiness must be ok");
  assert(response.body.checks.antivirus.status === "disabled", "Antivirus must be disabled when uploads are disabled");
  assert(response.body.checks.antivirus.required === false, "Antivirus must not be required when uploads are disabled");
  assert(response.body.checks.antivirus.ok === true, "Disabled antivirus must be ok for metadata-only pilot");
  assert(response.body.checks.objectStorage.status === "disabled", "Object storage must be disabled when uploads are disabled");
  assert(response.body.checks.objectStorage.required === false, "Object storage must not be required when uploads are disabled");
  assert(response.body.checks.objectStorage.ok === true, "Disabled object storage must be ok for metadata-only pilot");
}

function assertPlaceholderProductionEnvIsRejected() {
  const withPlaceholders = {
    ...productionPilotEnv,
    PORTAL_BACKEND_BASE_URL: "https://replace-with-owned-api-staging-host.invalid",
    TRUSTED_ORIGINS: "https://replace-with-owned-web-staging-host.invalid",
    PORTAL_SESSION_SECRET: "replace-with-at-least-32-random-characters",
  };

  assertThrowsEnv(withPlaceholders, "placeholder values");
}

function assertUploadProductionEnvStaysStrict() {
  const withUploadsEnabled = {
    ...productionPilotEnv,
    UPLOADS_ENABLED: "true",
    AV_SCANNER_MODE: "stub-disabled",
  };

  assertThrowsEnv(withUploadsEnabled, "UPLOAD_QUARANTINE_BUCKET");
  assertThrowsEnv(withUploadsEnabled, "AV_SCANNER_MODE=stub-disabled");
}

function assertRepoInvariants() {
  const packageJson = read("package.json");
  const stagingExample = read(".env.staging.example");
  const internalExample = read(".env.staging.internal.example");
  const adminNginx = read("apps/admin/nginx.conf");
  const pilotRunbook = read("docs/controlled-pilot-runbook.md");
  const pilotStartChecklist = read("docs/controlled-pilot-start-checklist.md");
  const staffProvisionScript = read("scripts/provision-staff-user.mjs");
  const pilotEnvCheck = read("scripts/check-pilot-env.mjs");
  const liveSmokeCheck = read("scripts/check-pilot-live-smoke.mjs");
  const backupRestoreCheck = read("scripts/check-postgres-backup-restore.mjs");
  const publicRequestsCheck = read("scripts/check-public-requests.mjs");
  const staffMvpCheck = read("scripts/check-staff-admin-mvp.mjs");

  const gitIndex = fs.readFileSync(path.join(root, ".git/index"));
  const isTracked = (fileName) => gitIndex.includes(Buffer.from(`${fileName}\0`));

  assert(!isTracked(".env.staging"), ".env.staging must not be tracked");
  assert(!isTracked(".env.staging.internal"), ".env.staging.internal must not be tracked");
  assert(isTracked(".env.staging.example"), ".env.staging.example must stay tracked");
  assert(isTracked(".env.staging.internal.example"), ".env.staging.internal.example must stay tracked");

  assert(packageJson.includes("check:pilot:readiness"), "package.json must expose check:pilot:readiness");
  assert(packageJson.includes("check:pilot:env"), "package.json must expose check:pilot:env");
  assert(packageJson.includes("check:pilot:live"), "package.json must expose check:pilot:live");
  assert(packageJson.includes("check:postgres:backup-restore"), "package.json must expose check:postgres:backup-restore");
  assert(packageJson.includes("check:public-requests"), "package.json must expose check:public-requests");
  assert(packageJson.includes("check:staff-admin:mvp"), "package.json must expose check:staff-admin:mvp");
  assert(packageJson.includes("staff:provision"), "package.json must expose staff:provision");

  assert(stagingExample.includes("BACKEND_NODE_ENV=production"), "Public staging example must run backend in production mode");
  assert(stagingExample.includes("UPLOADS_ENABLED=false"), "Public staging example must keep uploads disabled for pilot");
  assert(stagingExample.includes("OMNIA_WRITE_MODE=read_only"), "Public staging example must keep Omnia read-only");
  assert(
    !activeEnvLines(stagingExample).some((line) => line.includes("example-sanitaetshaus.de")),
    "Staging example must not reuse invalid example-sanitaetshaus domains in active env values",
  );
  assert(internalExample.includes("UPLOADS_ENABLED=false"), "Internal staging example must keep uploads disabled");

  assert(adminNginx.includes("X-Robots-Tag \"noindex, nofollow\""), "Staff Admin must stay noindex");
  assert(adminNginx.includes("X-Frame-Options \"DENY\""), "Staff Admin must deny framing");
  assert(adminNginx.includes("Cache-Control \"no-store\""), "Staff Admin must stay no-store");

  assert(publicRequestsCheck.includes("uploadObjectsCreated"), "Public request check must report uploadObjectsCreated");
  assert(publicRequestsCheck.includes("omniaWriteAllowed === false"), "Public request check must assert Omnia writes stay disabled");
  assert(staffMvpCheck.includes("wrong-staff-password"), "Staff MVP check must verify wrong-password rejection");
  assert(staffMvpCheck.includes("invalid-csrf-token"), "Staff MVP check must verify CSRF rejection");
  assert(staffMvpCheck.includes("uploadObjectsCreated"), "Staff MVP check must report uploadObjectsCreated");
  assert(staffProvisionScript.includes("NODE_ENV=production"), "Staff provision script must require production mode");
  assert(staffProvisionScript.includes("PORTAL_REPOSITORY_DRIVER=postgres"), "Staff provision script must require Postgres repository");
  assert(staffProvisionScript.includes("staff-user-provisioned"), "Staff provision script must write an audit event");
  assert(staffProvisionScript.includes("passwordHashSha256"), "Staff provision script must store only a password hash");
  assert(pilotEnvCheck.includes("PILOT_ENV_FILE"), "Pilot env check must support file-based env validation");
  assert(pilotEnvCheck.includes("PILOT_INTERNAL_IP_STAGING"), "Pilot env check must require an explicit internal-IP staging flag");
  assert(liveSmokeCheck.includes("PILOT_WEB_URL"), "Pilot live smoke must require a web URL");
  assert(liveSmokeCheck.includes("PILOT_STAFF_URL"), "Pilot live smoke must require a staff URL");
  assert(liveSmokeCheck.includes("PILOT_API_URL"), "Pilot live smoke must require an API URL");
  assert(liveSmokeCheck.includes("/api/staff/session"), "Pilot live smoke must verify staff session without login");
  assert(backupRestoreCheck.includes("PILOT_RESTORE_DATABASE_URL"), "Backup/restore check must require a restore database");
  assert(backupRestoreCheck.includes("PILOT_RESTORE_CONFIRM"), "Backup/restore check must require explicit restore confirmation");
  assert(backupRestoreCheck.includes("restore-to-scratch-db"), "Backup/restore check must force scratch restore acknowledgement");

  assert(pilotRunbook.includes("UPLOADS_ENABLED=false"), "Pilot runbook must document disabled uploads");
  assert(pilotRunbook.includes("OMNIA_WRITE_MODE=read_only"), "Pilot runbook must document Omnia read-only");
  assert(pilotRunbook.includes("npm run check:pilot:readiness"), "Pilot runbook must include the pilot readiness gate");
  assert(pilotRunbook.includes("npm run check:pilot:env"), "Pilot runbook must include the pilot env gate");
  assert(pilotRunbook.includes("npm run check:pilot:live"), "Pilot runbook must include the pilot live smoke gate");
  assert(pilotRunbook.includes("npm run check:postgres:backup-restore"), "Pilot runbook must include the backup/restore gate");
  assert(pilotRunbook.includes("npm run staff:provision"), "Pilot runbook must document staff provisioning");
  assert(pilotStartChecklist.includes("UPLOADS_ENABLED=false"), "Pilot start checklist must document disabled uploads");
  assert(pilotStartChecklist.includes("OMNIA_WRITE_MODE=read_only"), "Pilot start checklist must document Omnia read-only");
  assert(pilotStartChecklist.includes("npm run check:postgres:backup-restore"), "Pilot start checklist must include backup/restore evidence");
  assert(pilotStartChecklist.includes("Freigabe Legal/DSGVO/Ops"), "Pilot start checklist must include Legal/DSGVO/Ops signoff");
}

function assertThrowsEnv(source, expectedMessagePart) {
  try {
    loadBackendEnv(source);
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes(expectedMessagePart),
      `Expected env error to include ${expectedMessagePart}, got ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }
  throw new Error(`Expected production env to reject ${expectedMessagePart}`);
}

function activeEnvLines(source) {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

async function request(handler, method, url) {
  const incoming = {
    method,
    url,
    headers: {},
    socket: {
      remoteAddress: "127.0.0.1",
    },
    async *[Symbol.asyncIterator]() {},
  };

  return new Promise((resolve) => {
    const outgoing = {
      statusCode: 200,
      headers: {},
      setHeader(name, value) {
        this.headers[name.toLowerCase()] = value;
      },
      end(payload = "") {
        const text = Buffer.isBuffer(payload) ? payload.toString("utf8") : String(payload);
        resolve({
          status: this.statusCode,
          headers: this.headers,
          body: text ? JSON.parse(text) : {},
        });
      },
    };

    handler(incoming, outgoing);
  });
}

function minimalRepository() {
  return {
    async getUserByEmail() {
      return undefined;
    },
    async getUserById() {
      return undefined;
    },
    async saveSession() {},
    async getSession() {
      return undefined;
    },
    async deleteSession() {},
    async appendAuditEvent() {},
    async listAuditEvents() {
      return [];
    },
    async upsertRequest() {
      throw new Error("minimal repository is readiness-only");
    },
    async listRequests() {
      return [];
    },
    async getRequestById() {
      return undefined;
    },
    async updateRequest() {
      throw new Error("minimal repository is readiness-only");
    },
  };
}
