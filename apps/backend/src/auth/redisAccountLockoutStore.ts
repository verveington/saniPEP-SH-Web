import type { AccountLockoutPolicy, AccountLockoutState, AccountLockoutStore } from "./accountLockout.js";
import { calculateLockoutSeconds, hashAccountLockoutSubject } from "./accountLockout.js";

export type RedisAccountLockoutClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
};

export type RedisAccountLockoutStoreOptions = {
  keyPrefix: string;
};

export function createRedisAccountLockoutStore(
  client: RedisAccountLockoutClient,
  options: RedisAccountLockoutStoreOptions,
): AccountLockoutStore {
  const attemptsKey = (subjectHash: string) => `${options.keyPrefix}:lockout:attempts:${subjectHash}`;
  const lockedUntilKey = (subjectHash: string) => `${options.keyPrefix}:lockout:until:${subjectHash}`;

  return {
    async getState(subject) {
      const subjectHash = hashAccountLockoutSubject(subject);
      const [attempts, lockedUntil] = await Promise.all([
        client.get(attemptsKey(subjectHash)),
        client.get(lockedUntilKey(subjectHash)),
      ]);
      return {
        subjectHash,
        failedAttempts: attempts ? Number.parseInt(attempts, 10) : 0,
        lockedUntil: lockedUntil ?? undefined,
      };
    },

    async recordFailedAttempt(subject, policy) {
      const subjectHash = hashAccountLockoutSubject(subject);
      const failedAttempts = await client.incr(attemptsKey(subjectHash));
      if (failedAttempts === 1) {
        await client.expire(attemptsKey(subjectHash), policy.windowSeconds);
      }

      const lockoutSeconds = calculateLockoutSeconds(failedAttempts, policy);
      if (lockoutSeconds <= 0) {
        return { subjectHash, failedAttempts };
      }

      const lockedUntil = new Date(Date.now() + lockoutSeconds * 1000).toISOString();
      await client.set(lockedUntilKey(subjectHash), lockedUntil, { EX: lockoutSeconds });
      return { subjectHash, failedAttempts, lockedUntil };
    },

    async clear(subject) {
      const subjectHash = hashAccountLockoutSubject(subject);
      await Promise.all([
        client.del(attemptsKey(subjectHash)),
        client.del(lockedUntilKey(subjectHash)),
      ]);
    },
  };
}
