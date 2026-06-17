import { createHash } from "node:crypto";
import type { BackendEnv } from "../config/env.js";

export type AccountLockoutPolicy = {
  maxAttempts: number;
  windowSeconds: number;
  baseLockoutSeconds: number;
  maxLockoutSeconds: number;
};

export type AccountLockoutState = {
  subjectHash: string;
  failedAttempts: number;
  lockedUntil?: string;
};

export type AccountLockoutStore = {
  getState(subject: string): Promise<AccountLockoutState>;
  recordFailedAttempt(subject: string, policy: AccountLockoutPolicy): Promise<AccountLockoutState>;
  clear(subject: string): Promise<void>;
};

export function createAccountLockoutPolicy(env: BackendEnv): AccountLockoutPolicy {
  return {
    maxAttempts: env.accountLockoutMaxAttempts,
    windowSeconds: env.accountLockoutWindowSeconds,
    baseLockoutSeconds: env.accountLockoutBaseSeconds,
    maxLockoutSeconds: env.accountLockoutMaxSeconds,
  };
}

export function hashAccountLockoutSubject(subject: string) {
  return createHash("sha256").update(subject.trim().toLowerCase()).digest("hex");
}

export function isAccountLocked(state: AccountLockoutState, now = new Date()) {
  return Boolean(state.lockedUntil && new Date(state.lockedUntil).getTime() > now.getTime());
}

export function calculateLockoutSeconds(failedAttempts: number, policy: AccountLockoutPolicy) {
  if (failedAttempts < policy.maxAttempts) return 0;
  const escalation = failedAttempts - policy.maxAttempts;
  return Math.min(policy.baseLockoutSeconds * 2 ** escalation, policy.maxLockoutSeconds);
}
