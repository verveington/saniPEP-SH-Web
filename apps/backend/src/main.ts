import { createServer } from "node:http";
import { createBackendRequestHandler } from "./app.js";
import { loadBackendEnv } from "./config/env.js";
import { createBackendRedisClient, connectBackendRedisClient } from "./security/redisClient.js";
import { createRedisRateLimiter } from "./security/redisRateLimiter.js";

const env = loadBackendEnv();
const redisClient = env.redisUrl ? await connectBackendRedisClient(createBackendRedisClient(env)) : undefined;
const rateLimiter = redisClient ? createRedisRateLimiter(redisClient, { keyPrefix: env.redisKeyPrefix }) : undefined;
const server = createServer(createBackendRequestHandler(env, { rateLimiter }));

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
      process.exit(0);
    });
  });
}
