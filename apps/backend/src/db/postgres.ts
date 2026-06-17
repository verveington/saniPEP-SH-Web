import { Pool, type PoolClient, type PoolConfig } from "pg";
import type { BackendEnv } from "../config/env.js";
import type { QueryLayer, QueryPrimitive, QueryResult } from "./queryLayer.js";

type PostgresPoolConfig = PoolConfig & {
  statement_timeout?: number;
};

export function createPostgresPool(env: BackendEnv) {
  if (!env.databaseUrl) {
    throw new Error("PORTAL_DATABASE_URL is required to create the PostgreSQL adapter.");
  }

  const config: PostgresPoolConfig = {
    connectionString: env.databaseUrl,
    max: env.databasePoolMax,
    idleTimeoutMillis: env.databaseIdleTimeoutMs,
    connectionTimeoutMillis: env.databaseConnectionTimeoutMs,
    statement_timeout: env.databaseStatementTimeoutMs,
    ssl: env.databaseSsl ? { rejectUnauthorized: true } : false,
    application_name: "sanipep-portal-backend",
  };

  return new Pool(config);
}

export function createPostgresQueryLayer(pool: Pool): QueryLayer {
  return {
    async query<Row extends Record<string, unknown>>(statement: string, params: readonly QueryPrimitive[] = []) {
      const result = await pool.query<Row>(statement, [...params]);
      return mapPgResult(result);
    },

    async transaction<T>(handler: (tx: QueryLayer) => Promise<T>) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const value = await handler(createPostgresClientQueryLayer(client));
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export async function verifyPostgresConnection(pool: Pool) {
  const result = await pool.query<{ ok: number }>("SELECT 1 AS ok");
  return result.rows[0]?.ok === 1;
}

function createPostgresClientQueryLayer(client: PoolClient): QueryLayer {
  return {
    async query<Row extends Record<string, unknown>>(statement: string, params: readonly QueryPrimitive[] = []) {
      const result = await client.query<Row>(statement, [...params]);
      return mapPgResult(result);
    },

    async transaction<T>(handler: (tx: QueryLayer) => Promise<T>) {
      return handler(createPostgresClientQueryLayer(client));
    },
  };
}

function mapPgResult<Row extends Record<string, unknown>>(result: { rows: Row[]; rowCount: number | null }): QueryResult<Row> {
  return {
    rows: result.rows,
    rowCount: result.rowCount ?? result.rows.length,
  };
}
