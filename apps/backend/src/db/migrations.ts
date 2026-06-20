import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Pool, PoolClient } from "pg";
import { loadBackendEnv } from "../config/env.js";
import { createPostgresPool } from "./postgres.js";

export type BackendMigration = {
  version: string;
  absolutePath: string;
  sql: string;
  checksumSha256: string;
};

export type MigrationRunResult = {
  migrationsDir: string;
  applied: string[];
  skipped: string[];
};

export type SchemaAssertionResult = {
  migrationsDir: string;
  appliedVersions: string[];
};

type MigrationHistoryRow = {
  version: string;
  checksum_sha256: string;
};

const migrationLockName = "sanipep_backend_migrations";
const migrationHistoryTable = "schema_migrations";
const requiredRuntimeTables = [
  "schema_migrations",
  "portal_users",
  "customer_profiles",
  "staff_users",
  "portal_sessions",
  "one_time_password_invites",
  "portal_requests",
  "upload_objects",
  "audit_events",
  "rate_limit_events",
  "portal_request_details",
  "portal_mvp_users",
  "portal_mvp_sessions",
  "portal_mvp_requests",
  "portal_mvp_audit_events",
] as const;

export async function runBackendMigrations(
  pool: Pool,
  options: { migrationsDir?: string; log?: Pick<Console, "log"> } = {},
): Promise<MigrationRunResult> {
  const migrationsDir = options.migrationsDir ?? defaultMigrationsDir();
  const migrations = await loadBackendMigrations(migrationsDir);
  const client = await pool.connect();
  const applied: string[] = [];
  const skipped: string[] = [];
  let migrationLockAcquired = false;

  try {
    await acquireMigrationLock(client);
    migrationLockAcquired = true;
    await ensureMigrationHistoryTable(client);
    const history = await readMigrationHistory(client);

    for (const migration of migrations) {
      const previous = history.get(migration.version);
      if (previous) {
        if (previous !== migration.checksumSha256) {
          throw new Error(`Migration ${migration.version} checksum changed after it was applied.`);
        }
        skipped.push(migration.version);
        continue;
      }

      const started = Date.now();
      try {
        await client.query("BEGIN");
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO ${migrationHistoryTable} (version, checksum_sha256, execution_ms)
           VALUES ($1, $2, $3)`,
          [migration.version, migration.checksumSha256, Date.now() - started],
        );
        await client.query("COMMIT");
        applied.push(migration.version);
        history.set(migration.version, migration.checksumSha256);
        options.log?.log(`Applied backend migration ${migration.version}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Backend migration ${migration.version} failed: ${errorMessage(error)}`);
      }
    }
  } finally {
    if (migrationLockAcquired) {
      await releaseMigrationLock(client);
    }
    client.release();
  }

  return {
    migrationsDir,
    applied,
    skipped,
  };
}

export async function assertBackendSchema(
  pool: Pool,
  options: { migrationsDir?: string } = {},
): Promise<SchemaAssertionResult> {
  const migrationsDir = options.migrationsDir ?? defaultMigrationsDir();
  const migrations = await loadBackendMigrations(migrationsDir);
  const client = await pool.connect();

  try {
    const historyExists = await tableExists(client, migrationHistoryTable);
    if (!historyExists) {
      throw new Error(`Missing ${migrationHistoryTable}. Run npm run migrate:backend before starting the backend.`);
    }

    const history = await readMigrationHistory(client);
    const missing = migrations.filter((migration) => !history.has(migration.version));
    if (missing.length > 0) {
      throw new Error(`Missing backend migrations: ${missing.map((item) => item.version).join(", ")}. Run npm run migrate:backend.`);
    }

    const checksumMismatch = migrations.find((migration) => history.get(migration.version) !== migration.checksumSha256);
    if (checksumMismatch) {
      throw new Error(`Applied migration checksum mismatch: ${checksumMismatch.version}. Refusing to start with an incompatible schema history.`);
    }

    const missingTables = await missingRequiredTables(client);
    if (missingTables.length > 0) {
      throw new Error(`Backend schema is incomplete. Missing tables: ${missingTables.join(", ")}.`);
    }

    return {
      migrationsDir,
      appliedVersions: migrations.map((migration) => migration.version),
    };
  } finally {
    client.release();
  }
}

export async function loadBackendMigrations(migrationsDir = defaultMigrationsDir()): Promise<BackendMigration[]> {
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    throw new Error(`No backend migrations found in ${migrationsDir}.`);
  }
  assertSequentialMigrationVersions(files);

  return Promise.all(
    files.map(async (file) => {
      const absolutePath = path.join(migrationsDir, file);
      const sql = await readFile(absolutePath, "utf8");
      if (sql.trim().length === 0) {
        throw new Error(`Backend migration ${file} is empty.`);
      }

      return {
        version: file,
        absolutePath,
        sql,
        checksumSha256: createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}

function assertSequentialMigrationVersions(files: string[]) {
  files.forEach((file, index) => {
    const match = file.match(/^(\d{4})_[a-z0-9_]+\.sql$/);
    if (!match) {
      throw new Error(`Backend migration ${file} must use the format 0001_name.sql.`);
    }
    const expected = String(index + 1).padStart(4, "0");
    if (match[1] !== expected) {
      throw new Error(`Backend migration sequence is incomplete. Expected ${expected}_*.sql but found ${file}.`);
    }
  });
}

export function defaultMigrationsDir() {
  return process.env.BACKEND_MIGRATIONS_DIR
    ? path.resolve(process.env.BACKEND_MIGRATIONS_DIR)
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../migrations");
}

async function ensureMigrationHistoryTable(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${migrationHistoryTable} (
      version text PRIMARY KEY,
      checksum_sha256 text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now(),
      execution_ms integer NOT NULL CHECK (execution_ms >= 0)
    )
  `);
}

async function readMigrationHistory(client: PoolClient) {
  const result = await client.query<MigrationHistoryRow>(
    `SELECT version, checksum_sha256 FROM ${migrationHistoryTable}`,
  );
  return new Map(result.rows.map((row) => [row.version, row.checksum_sha256]));
}

async function acquireMigrationLock(client: PoolClient) {
  await client.query("SELECT pg_advisory_lock(hashtext($1))", [migrationLockName]);
}

async function releaseMigrationLock(client: PoolClient) {
  await client.query("SELECT pg_advisory_unlock(hashtext($1))", [migrationLockName]);
}

async function tableExists(client: PoolClient, tableName: string) {
  const result = await client.query<{ exists: boolean }>(
    "SELECT to_regclass($1) IS NOT NULL AS exists",
    [`public.${tableName}`],
  );
  return result.rows[0]?.exists === true;
}

async function missingRequiredTables(client: PoolClient) {
  const missing: string[] = [];
  for (const tableName of requiredRuntimeTables) {
    if (!(await tableExists(client, tableName))) {
      missing.push(tableName);
    }
  }
  return missing;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown migration error";
}

async function main() {
  const env = loadBackendEnv();
  const pool = createPostgresPool(env);
  try {
    const result = await runBackendMigrations(pool, { log: console });
    console.log(JSON.stringify({
      migrationsDir: result.migrationsDir,
      applied: result.applied,
      skipped: result.skipped,
    }, null, 2));
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  });
}
