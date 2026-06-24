import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBackendEnv } from "../apps/backend/dist/config/env.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = process.env.PILOT_ENV_FILE;
const source = {
  ...process.env,
  ...(envPath ? readEnvFile(envPath) : {}),
};
const internalIpStaging = source.PILOT_INTERNAL_IP_STAGING === "true";

const report = {
  checkedEnvFile: envPath ? path.relative(root, path.resolve(envPath)) : "process.env",
  requiredPresent: [],
  optionalPresent: [],
  pilotBoundaries: {},
};

const required = [
  "BACKEND_NODE_ENV",
  "PORTAL_BACKEND_BASE_URL",
  "TRUSTED_ORIGINS",
  "PORTAL_DATABASE_URL",
  "PORTAL_REPOSITORY_DRIVER",
  "REDIS_URL",
  "PORTAL_SESSION_COOKIE_NAME",
  "PORTAL_SESSION_SECRET",
  "CSRF_SECRET",
  "PORTAL_OTP_HASH_SECRET",
  "PORTAL_PASSWORD_PEPPER",
  "AUDIT_LOG_HASH_SECRET",
  "UPLOADS_ENABLED",
  "OMNIA_WRITE_MODE",
];

const optional = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_PORTAL_BACKEND_URL",
  "VITE_PORTAL_BACKEND_URL",
  "STAFF_ADMIN_PUBLIC_URL",
  "PORTAL_DATABASE_SSL",
  "POSTGRES_POOL_MAX",
  "REDIS_KEY_PREFIX",
  "AV_SCANNER_MODE",
];

for (const name of required) {
  assertPresent(source, name);
  assertNotPlaceholder(source, name);
  report.requiredPresent.push(name);
}

for (const name of optional) {
  if (source[name]) {
    assertNotPlaceholder(source, name);
    report.optionalPresent.push(name);
  }
}

for (const name of Object.keys(source)) {
  if (/^PORTAL_DEV_/.test(name)) {
    throw new Error(`${name} must not be set in a controlled pilot env.`);
  }
}

const backendEnv = loadBackendEnv({
  ...source,
  NODE_ENV: source.BACKEND_NODE_ENV,
});

if (internalIpStaging) {
  assert(backendEnv.nodeEnv === "development", "Internal IP pilot staging must set BACKEND_NODE_ENV=development explicitly because production rejects HTTP origins.");
  assert(backendEnv.trustedOrigins.every((origin) => origin.startsWith("http://10.")), "Internal IP pilot staging must use explicit http://10.x LAN origins only.");
} else {
  assert(backendEnv.nodeEnv === "production", "BACKEND_NODE_ENV must be production for HTTPS controlled pilot.");
  assert(backendEnv.trustedOrigins.every((origin) => origin.startsWith("https://")), "HTTPS controlled pilot must use only HTTPS trusted origins.");
}
assert(backendEnv.portalRepositoryDriver === "postgres", "PORTAL_REPOSITORY_DRIVER must be postgres.");
assert(backendEnv.uploadsEnabled === false, "UPLOADS_ENABLED must be false for the metadata-only pilot.");
assert(backendEnv.omniaWriteMode === "read_only", "OMNIA_WRITE_MODE must be read_only.");
assert(backendEnv.databaseUrl, "PORTAL_DATABASE_URL must be set.");
assert(backendEnv.redisUrl, "REDIS_URL must be set.");

report.pilotBoundaries = {
  backendNodeEnv: backendEnv.nodeEnv,
  internalIpStaging,
  repository: backendEnv.portalRepositoryDriver,
  uploadsEnabled: backendEnv.uploadsEnabled,
  omniaWriteMode: backendEnv.omniaWriteMode,
  trustedOrigins: backendEnv.trustedOrigins.length,
  hasDatabaseUrl: Boolean(backendEnv.databaseUrl),
  hasRedisUrl: Boolean(backendEnv.redisUrl),
};

console.log("Controlled pilot env check passed");
console.log(JSON.stringify(report, null, 2));

function readEnvFile(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`PILOT_ENV_FILE does not exist: ${path.relative(root, absolutePath)}`);
  const entries = {};
  for (const line of fs.readFileSync(absolutePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const name = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    entries[name] = unquote(rawValue);
  }
  return entries;
}

function assertPresent(sourceEnv, name) {
  if (!sourceEnv[name]) throw new Error(`${name} is required for controlled pilot.`);
}

function assertNotPlaceholder(sourceEnv, name) {
  const value = sourceEnv[name];
  if (value && /replace-with|\.invalid\b|example-sanitaetshaus|placeholder/i.test(value)) {
    throw new Error(`${name} must not contain placeholder values.`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function unquote(value) {
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith("\"") && value.endsWith("\""))) {
    return value.slice(1, -1);
  }
  return value;
}
