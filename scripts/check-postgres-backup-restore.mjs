import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "pg";

const sourceUrl = requiredEnv("PORTAL_DATABASE_URL");
const configuredRestoreUrl = requiredEnv("PILOT_RESTORE_DATABASE_URL");
const restoreUrl = restoreUrlWithSourceHost(sourceUrl, configuredRestoreUrl);
const confirm = requiredEnv("PILOT_RESTORE_CONFIRM");
if (confirm !== "restore-to-scratch-db") {
  throw new Error("PILOT_RESTORE_CONFIRM must be restore-to-scratch-db.");
}
if (normalizeUrlForCompare(sourceUrl) === normalizeUrlForCompare(restoreUrl)) {
  throw new Error("PILOT_RESTORE_DATABASE_URL must not point to the source database.");
}

const restoreDb = new URL(restoreUrl).pathname.replace(/^\//, "");
if (!/restore|scratch|tmp|temp/i.test(restoreDb) && process.env.PILOT_RESTORE_ALLOW_ANY_DB !== "true") {
  throw new Error("Restore database name must include restore, scratch, tmp or temp.");
}

const backupDir = process.env.PILOT_BACKUP_DIR ?? path.join(os.tmpdir(), "sanipep-pilot-backups");
fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
const backupFile = path.join(backupDir, `sanipep-pilot-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`);

const sourceCounts = await tableCounts(sourceUrl);
runPgTool("pg_dump", ["--format=custom", "--no-owner", "--file", backupFile], sourceUrl);
runPgTool("pg_restore", ["--list", backupFile], sourceUrl);
runPgTool("pg_restore", ["--clean", "--if-exists", "--no-owner", "--dbname", restoreDb, backupFile], restoreUrl);
const restoredCounts = await tableCounts(restoreUrl);

for (const table of Object.keys(sourceCounts)) {
  if (sourceCounts[table] !== restoredCounts[table]) {
    throw new Error(`Restore count mismatch for ${table}: source=${sourceCounts[table]} restored=${restoredCounts[table]}`);
  }
}

console.log("Postgres backup/restore check passed");
console.log(JSON.stringify({
  backupFile,
  comparedTables: Object.keys(sourceCounts),
  counts: sourceCounts,
}, null, 2));

async function tableCounts(databaseUrl) {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.PORTAL_DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  try {
    const counts = {};
    for (const table of ["portal_mvp_users", "portal_mvp_sessions", "portal_mvp_requests", "portal_mvp_audit_events", "schema_migrations"]) {
      const exists = await client.query("SELECT to_regclass($1) AS table_name", [table]);
      if (!exists.rows[0]?.table_name) {
        throw new Error(`Required table missing: ${table}`);
      }
      const result = await client.query(`SELECT count(*)::int AS count FROM ${table}`);
      counts[table] = result.rows[0].count;
    }
    return counts;
  } finally {
    await client.end();
  }
}

function runPgTool(binary, args, databaseUrl) {
  const env = {
    ...process.env,
    ...pgEnv(databaseUrl),
  };
  execFileSync(binary, args, {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function pgEnv(databaseUrl) {
  const url = new URL(databaseUrl);
  return {
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGDATABASE: url.pathname.replace(/^\//, ""),
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: process.env.PORTAL_DATABASE_SSL === "true" ? "require" : "disable",
  };
}

function restoreUrlWithSourceHost(sourceUrl, restoreUrl) {
  const source = new URL(sourceUrl);
  const restore = new URL(restoreUrl);
  restore.hostname = source.hostname;
  restore.port = source.port;
  return restore.toString();
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  if (/replace-with|\.invalid\b|example-sanitaetshaus|placeholder/i.test(value)) {
    throw new Error(`${name} must not contain placeholder values.`);
  }
  return value;
}

function normalizeUrlForCompare(value) {
  const url = new URL(value);
  url.password = "";
  return url.toString();
}
