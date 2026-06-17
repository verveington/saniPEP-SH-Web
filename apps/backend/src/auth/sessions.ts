import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { BackendEnv } from "../config/env.js";
import type { Session } from "./models.js";
import type { UserRole } from "../users/models.js";

export type NewSessionInput = {
  userId: string;
  role: UserRole;
  ip?: string;
  userAgent?: string;
  env: Pick<BackendEnv, "sessionIdleTtlMinutes" | "sessionAbsoluteTtlHours">;
};

export function createSession(input: NewSessionInput) {
  const token = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(32).toString("base64url");
  const now = new Date();
  const session: Session = {
    id: randomUUID(),
    userId: input.userId,
    tokenHash: hashToken(token),
    csrfTokenHash: hashToken(csrfToken),
    role: input.role,
    ipHash: input.ip ? hashToken(input.ip) : undefined,
    userAgentHash: input.userAgent ? hashToken(input.userAgent) : undefined,
    issuedAt: now.toISOString(),
    idleExpiresAt: new Date(now.getTime() + input.env.sessionIdleTtlMinutes * 60 * 1000).toISOString(),
    absoluteExpiresAt: new Date(now.getTime() + input.env.sessionAbsoluteTtlHours * 60 * 60 * 1000).toISOString(),
  };

  return {
    session,
    rawSessionToken: token,
    rawCsrfToken: csrfToken,
  };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isSessionActive(session: Session, now = new Date()) {
  if (session.revokedAt) return false;
  const current = now.getTime();
  return new Date(session.idleExpiresAt).getTime() > current && new Date(session.absoluteExpiresAt).getTime() > current;
}
