import { createClient } from "redis";
import type { BackendEnv } from "../config/env.js";

export function createBackendRedisClient(env: BackendEnv) {
  if (!env.redisUrl) {
    throw new Error("REDIS_URL is required to create the Redis adapter.");
  }

  return createClient(
    env.redisTls
      ? {
          url: env.redisUrl,
          socket: { tls: true },
        }
      : {
          url: env.redisUrl,
        },
  );
}

export type BackendRedisClient = ReturnType<typeof createBackendRedisClient>;

export async function connectBackendRedisClient(client: BackendRedisClient) {
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
}
