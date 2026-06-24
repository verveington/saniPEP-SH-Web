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

const backupDir = path.resolve(process.env.PILOT_BACKUP_DIR ?? path.join(os.tmpdir(), "sanipep-pilot-backups"));
fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
const backupFile = path.join(backupDir, `sanipep-pilot-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`);
const maintenanceUrl = databaseUrlWithDatabase(restoreUrl, "postgres");
const pgTools = createPgTools(backupDir, backupFile);

await main();

async function main() {
  let restoreDatabaseCreated = false;
  let runError;
  try {
    await assertPgToolCompatibility(sourceUrl);
    const sourceCounts = await tableCounts(sourceUrl);
    runPgTool("pg_dump", ["--format=custom", "--no-owner", "--file", pgTools.backupFile], sourceUrl);
    runPgTool("pg_restore", ["--list", pgTools.backupFile], sourceUrl);
    await recreateRestoreDatabase(maintenanceUrl, restoreDb);
    restoreDatabaseCreated = true;
    runPgTool("pg_restore", ["--clean", "--if-exists", "--no-owner", "--dbname", restoreDb, pgTools.backupFile], restoreUrl);
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
  } catch (error) {
    runError = error;
    throw error;
  } finally {
    if (restoreDatabaseCreated) {
      try {
        await dropRestoreDatabase(maintenanceUrl, restoreDb);
      } catch (cleanupError) {
        if (!runError) throw cleanupError;
        console.error("Warning: failed to drop scratch restore database after backup/restore failure.");
      }
    }
  }
}

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

async function recreateRestoreDatabase(databaseUrl, databaseName) {
  const client = databaseAdminClient(databaseUrl);
  await client.connect();
  try {
    await dropDatabase(client, databaseName);
    await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
  } finally {
    await client.end();
  }
}

async function dropRestoreDatabase(databaseUrl, databaseName) {
  const client = databaseAdminClient(databaseUrl);
  await client.connect();
  try {
    await dropDatabase(client, databaseName);
  } finally {
    await client.end();
  }
}

async function dropDatabase(client, databaseName) {
  await client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`);
}

function databaseAdminClient(databaseUrl) {
  return new Client({
    connectionString: databaseUrl,
    ssl: process.env.PORTAL_DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
}

async function assertPgToolCompatibility(databaseUrl) {
  const serverMajor = await postgresServerMajor(databaseUrl);
  const dumpMajor = pgToolMajorVersion("pg_dump");
  const restoreMajor = pgToolMajorVersion("pg_restore");
  const mismatches = [];

  if (dumpMajor !== serverMajor) {
    mismatches.push(`pg_dump major ${dumpMajor}`);
  }
  if (restoreMajor !== serverMajor) {
    mismatches.push(`pg_restore major ${restoreMajor}`);
  }
  if (mismatches.length > 0) {
    throw new Error([
      `Postgres tool/server major version mismatch: server major ${serverMajor}; ${mismatches.join(", ")}; tool source: ${pgTools.description}.`,
      `Use matching tools, for example PILOT_POSTGRES_TOOLS_IMAGE=postgres:${serverMajor}, or set PILOT_PG_DUMP_BIN and PILOT_PG_RESTORE_BIN to matching local binaries.`,
    ].join(" "));
  }
}

async function postgresServerMajor(databaseUrl) {
  const client = databaseAdminClient(databaseUrl);
  await client.connect();
  try {
    const result = await client.query("SHOW server_version_num");
    const versionNumber = Number(result.rows[0]?.server_version_num);
    if (!Number.isInteger(versionNumber)) {
      throw new Error("Could not read Postgres server_version_num.");
    }
    return Math.floor(versionNumber / 10000);
  } finally {
    await client.end();
  }
}

function pgToolMajorVersion(toolName) {
  const output = runPgToolVersion(toolName);
  const match = output.match(/\b(\d+)(?:\.\d+)?\b/);
  if (!match) {
    throw new Error(`Could not parse ${toolName} version output from ${pgTools.description}.`);
  }
  return Number(match[1]);
}

function runPgToolVersion(toolName) {
  try {
    if (pgTools.mode === "docker") {
      return execFileSync("docker", dockerPgToolArgs(toolName, ["--version"]), {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    }
    return execFileSync(pgToolBinary(toolName), ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new Error(`Failed to run ${toolName} --version with ${pgTools.description}.`);
  }
}

function runPgTool(toolName, args, databaseUrl) {
  const env = {
    ...process.env,
    ...pgEnv(databaseUrl),
  };
  if (pgTools.mode === "docker") {
    execFileSync("docker", dockerPgToolArgs(toolName, args), {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return;
  }
  execFileSync(pgToolBinary(toolName), args, {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function createPgTools(backupDirectory, hostBackupFile) {
  const image = process.env.PILOT_POSTGRES_TOOLS_IMAGE;
  const hasLocalOverride = process.env.PILOT_PG_DUMP_BIN || process.env.PILOT_PG_RESTORE_BIN;
  if (image && hasLocalOverride) {
    throw new Error("Use either PILOT_POSTGRES_TOOLS_IMAGE or PILOT_PG_DUMP_BIN/PILOT_PG_RESTORE_BIN, not both.");
  }
  if (image) {
    return {
      backupDirectory,
      backupFile: `/backup/${path.basename(hostBackupFile)}`,
      description: `Docker image ${image}`,
      dumpCommand: "pg_dump",
      image,
      mode: "docker",
      restoreCommand: "pg_restore",
    };
  }
  return {
    backupDirectory,
    backupFile: hostBackupFile,
    description: "local PostgreSQL tools",
    dumpCommand: process.env.PILOT_PG_DUMP_BIN ?? "pg_dump",
    mode: "local",
    restoreCommand: process.env.PILOT_PG_RESTORE_BIN ?? "pg_restore",
  };
}

function dockerPgToolArgs(toolName, args) {
  return [
    "run",
    "--rm",
    "--network",
    "host",
    "--mount",
    `type=bind,source=${pgTools.backupDirectory},target=/backup`,
    "-e",
    "PGHOST",
    "-e",
    "PGPORT",
    "-e",
    "PGDATABASE",
    "-e",
    "PGUSER",
    "-e",
    "PGPASSWORD",
    "-e",
    "PGSSLMODE",
    pgTools.image,
    pgToolBinary(toolName),
    ...args,
  ];
}

function pgToolBinary(toolName) {
  if (toolName === "pg_dump") return pgTools.dumpCommand;
  if (toolName === "pg_restore") return pgTools.restoreCommand;
  throw new Error(`Unsupported Postgres tool: ${toolName}`);
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

function databaseUrlWithDatabase(databaseUrl, databaseName) {
  const url = new URL(databaseUrl);
  url.pathname = `/${encodeURIComponent(databaseName)}`;
  return url.toString();
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
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
  url.username = "";
  url.password = "";
  url.port = url.port || "5432";
  return url.toString();
}
