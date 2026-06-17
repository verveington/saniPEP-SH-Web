import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { OneTimePasswordInvite } from "./models.js";

export type CreateOneTimePasswordInviteInput = {
  customerProfileId: string;
  issuedByStaffUserId?: string;
  delivery: OneTimePasswordInvite["delivery"];
  ttlDays: number;
  hashSecret: string;
};

export function createOneTimePasswordInvite(input: CreateOneTimePasswordInviteInput) {
  const code = randomBytes(9).toString("base64url").toUpperCase();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.ttlDays * 24 * 60 * 60 * 1000);
  const invite: OneTimePasswordInvite = {
    id: randomUUID(),
    customerProfileId: input.customerProfileId,
    issuedByStaffUserId: input.issuedByStaffUserId,
    codeHash: hashOneTimePassword(code, input.hashSecret),
    delivery: input.delivery,
    expiresAt: expiresAt.toISOString(),
    failedAttempts: 0,
    createdAt: now.toISOString(),
  };

  return {
    invite,
    oneTimePasswordForLetterOrHandout: code,
  };
}

export function verifyOneTimePasswordInvite(invite: OneTimePasswordInvite, providedCode: string, hashSecret: string) {
  if (invite.consumedAt) return false;
  if (invite.lockedUntil && new Date(invite.lockedUntil).getTime() > Date.now()) return false;
  if (new Date(invite.expiresAt).getTime() < Date.now()) return false;

  const providedHash = Buffer.from(hashOneTimePassword(providedCode, hashSecret));
  const storedHash = Buffer.from(invite.codeHash);
  return providedHash.length === storedHash.length && timingSafeEqual(providedHash, storedHash);
}

export function hashOneTimePassword(code: string, hashSecret: string) {
  return createHmac("sha256", hashSecret).update(normalizeOneTimePassword(code)).digest("hex");
}

export function normalizeOneTimePassword(code: string) {
  return code.trim().replace(/\s+/g, "").toUpperCase();
}
