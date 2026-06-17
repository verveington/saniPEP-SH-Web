import { createHash, randomUUID } from "node:crypto";

export type RateLimitScope =
  | "backend_global"
  | "login"
  | "otp_activation"
  | "password_reset"
  | "upload_session"
  | "public_form";

export type RateLimitDecision = "allow" | "deny";

export type RateLimitEvent = {
  id: string;
  occurredAt: string;
  scope: RateLimitScope;
  subjectHash: string;
  ipHash?: string;
  decision: RateLimitDecision;
  windowSeconds: number;
  limitCount: number;
  observedCount: number;
};

export type RateLimitCheck = {
  scope: RateLimitScope;
  subject: string;
  ip?: string;
  windowSeconds: number;
  limitCount: number;
};

export type RateLimiter = {
  check(input: RateLimitCheck): Promise<RateLimitEvent>;
};

export function hashRateLimitSubject(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function createAllowAllRateLimiter(): RateLimiter {
  return {
    async check(input) {
      return {
        id: randomUUID(),
        occurredAt: new Date().toISOString(),
        scope: input.scope,
        subjectHash: hashRateLimitSubject(input.subject),
        ipHash: input.ip ? hashRateLimitSubject(input.ip) : undefined,
        decision: "allow",
        windowSeconds: input.windowSeconds,
        limitCount: input.limitCount,
        observedCount: 0,
      };
    },
  };
}
