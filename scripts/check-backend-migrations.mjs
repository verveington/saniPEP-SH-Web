import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "apps/backend/migrations");
const runnerPath = path.join(root, "apps/backend/src/db/migrations.ts");

const fail = (message) => {
  throw new Error(message);
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

assert(migrationFiles.length > 0, "Backend migrations directory must contain SQL migrations");
assert(migrationFiles.includes("0003_portal_mvp_repository.sql"), "Migration 0003_portal_mvp_repository.sql must be present");

for (const [index, file] of migrationFiles.entries()) {
  assert(/^\d{4}_[a-z0-9_]+\.sql$/.test(file), `Migration ${file} must use a sortable numeric prefix`);
  const expectedPrefix = String(index + 1).padStart(4, "0");
  assert(file.startsWith(`${expectedPrefix}_`), `Migration sequence must be contiguous; expected ${expectedPrefix}_*.sql but found ${file}`);
  const source = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  assert(source.trim().length > 0, `Migration ${file} must not be empty`);
  assert(
    !/CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/i.test(source),
    `Migration ${file} must use CREATE TABLE IF NOT EXISTS for idempotency`,
  );
  assert(
    !/CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF\s+NOT\s+EXISTS)/i.test(source),
    `Migration ${file} must use CREATE INDEX IF NOT EXISTS for idempotency`,
  );
  for (const destructivePattern of [
    /\bDROP\s+TABLE\b/i,
    /\bDROP\s+COLUMN\b/i,
    /\bTRUNCATE\b/i,
    /\bDELETE\s+FROM\b/i,
  ]) {
    assert(!destructivePattern.test(source), `Migration ${file} must not contain destructive SQL`);
  }
}

const runner = fs.readFileSync(runnerPath, "utf8");
assert(runner.includes("schema_migrations"), "Migration runner must manage schema_migrations");
assert(runner.includes("checksum_sha256"), "Migration runner must store checksums");
assert(runner.includes("pg_advisory_lock"), "Migration runner must serialize execution with an advisory lock");
assert(runner.includes("sort((a, b) => a.localeCompare(b))"), "Migration runner must sort migrations before execution");
assert(runner.includes("assertSequentialMigrationVersions"), "Migration runner must reject incomplete migration sequences");
assert(runner.includes("assertBackendSchema"), "Backend schema assertion must exist");

for (const requiredTable of [
  "portal_mvp_users",
  "portal_mvp_sessions",
  "portal_mvp_requests",
  "portal_mvp_audit_events",
]) {
  assert(runner.includes(`"${requiredTable}"`), `Backend schema assertion must require ${requiredTable}`);
}

console.log("Backend migration static check passed");
console.log(`Migrations checked: ${migrationFiles.join(", ")}`);
