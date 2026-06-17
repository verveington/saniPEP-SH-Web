import type { UserRole } from "../users/models.js";

export type Session = {
  id: string;
  userId: string;
  tokenHash: string;
  csrfTokenHash: string;
  role: UserRole;
  ipHash?: string;
  userAgentHash?: string;
  issuedAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  revokedAt?: string;
};

export type OneTimePasswordInvite = {
  id: string;
  customerProfileId: string;
  issuedByStaffUserId?: string;
  codeHash: string;
  delivery: "letter" | "handover";
  expiresAt: string;
  consumedAt?: string;
  failedAttempts: number;
  lockedUntil?: string;
  createdAt: string;
};

export type PasswordResetTicket = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  consumedAt?: string;
  createdAt: string;
};
