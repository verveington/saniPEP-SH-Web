import { createServer } from "node:http";
import { createBackendRequestHandler } from "./app.js";
import { loadBackendEnv } from "./config/env.js";
import { assertBackendSchema } from "./db/migrations.js";
import { createPostgresPool, createPostgresQueryLayer, verifyPostgresConnection } from "./db/postgres.js";
import { createPostgresPortalMvpRepository } from "./repositories/postgresPortalMvpRepository.js";
import { createBackendRedisClient, connectBackendRedisClient } from "./security/redisClient.js";
import { createRedisRateLimiter } from "./security/redisRateLimiter.js";

const env = loadBackendEnv();
const postgresPool = env.portalRepositoryDriver === "postgres" ? createPostgresPool(env) : undefined;
if (postgresPool) {
  try {
    await assertBackendSchema(postgresPool);
  } catch (error) {
    await postgresPool.end();
    throw error;
  }
}
const repository = postgresPool ? createPostgresPortalMvpRepository(createPostgresQueryLayer(postgresPool)) : undefined;
const redisClient = env.redisUrl ? await connectBackendRedisClient(createBackendRedisClient(env)) : undefined;
const rateLimiter = redisClient ? createRedisRateLimiter(redisClient, { keyPrefix: env.redisKeyPrefix }) : undefined;
const server = createServer(createBackendRequestHandler(env, {
  rateLimiter,
  repository,
  readinessChecks: {
    database: postgresPool ? () => verifyPostgresConnection(postgresPool) : undefined,
    redis: redisClient ? async () => (await redisClient.ping()) === "PONG" : undefined,
  },
}));

server.listen(env.port, () => {
  console.log(`saniPEP portal backend scaffold listening on port ${env.port}`);
  for (const warning of env.developmentWarnings) {
    console.warn(warning);
  }
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(async () => {
      if (redisClient?.isOpen) {
        await redisClient.quit();
      }
      if (postgresPool) {
        await postgresPool.end();
      }
      process.exit(0);
    });
  });
}
