import { randomUUID } from "node:crypto";
import type { RateLimitCheck, RateLimitEvent, RateLimiter } from "./rateLimiter.js";
import { hashRateLimitSubject } from "./rateLimiter.js";

export type RedisRateLimitClient = {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
};

export type RedisRateLimiterOptions = {
  keyPrefix: string;
};

export function createRedisRateLimiter(client: RedisRateLimitClient, options: RedisRateLimiterOptions): RateLimiter {
  return {
    async check(input) {
      const subjectHash = hashRateLimitSubject(input.subject);
      const ipHash = input.ip ? hashRateLimitSubject(input.ip) : undefined;
      const bucket = buildWindowBucket(input);
      const key = `${options.keyPrefix}:rate:${input.scope}:${subjectHash}:${bucket}`;
      const observedCount = await client.incr(key);
      if (observedCount === 1) {
        await client.expire(key, input.windowSeconds);
      }

      return {
        id: randomUUID(),
        occurredAt: new Date().toISOString(),
        scope: input.scope,
        subjectHash,
        ipHash,
        decision: observedCount > input.limitCount ? "deny" : "allow",
        windowSeconds: input.windowSeconds,
        limitCount: input.limitCount,
        observedCount,
      } satisfies RateLimitEvent;
    },
  };
}

function buildWindowBucket(input: RateLimitCheck) {
  return Math.floor(Date.now() / (input.windowSeconds * 1000));
}
