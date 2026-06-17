import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createAuditEvent } from "./auditLog.js";
import type {
  AuditLogSink,
  OneTimePasswordRecord,
  PortalActor,
  PortalCredentialsRecord,
  PortalRole,
  PortalSession,
} from "./types.js";

export type PortalAuthRepositories = {
  oneTimePasswords: {
    findActiveByCustomer(customerId: string): Promise<OneTimePasswordRecord | null>;
    save(record: OneTimePasswordRecord): Promise<void>;
    consume(id: string, consumedAt: string): Promise<void>;
    incrementFailedAttempts(id: string): Promise<void>;
  };
  credentials: {
    findByEmail(email: string): Promise<PortalCredentialsRecord | null>;
    save(record: PortalCredentialsRecord): Promise<void>;
  };
  sessions: {
    save(session: PortalSession): Promise<void>;
  };
};

export type PasswordHasher = {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, passwordHash: string): Promise<boolean>;
};

export type PortalAuthServiceOptions = {
  repositories: PortalAuthRepositories;
  passwordHasher: PasswordHasher;
  auditLog: AuditLogSink;
  otpTtlMinutes: number;
  sessionTtlMinutes: number;
};

export type ActivatePortalInput = {
  customerId: string;
  email: string;
  oneTimePassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type PasswordLoginInput = {
  email: string;
  password: string;
};

export function hashOneTimePassword(code: string, salt: string) {
  return createHash("sha256").update(`${salt}:${normalizeOtp(code)}`).digest("hex");
}

export function generateOneTimePassword() {
  return randomBytes(8).toString("base64url").toUpperCase();
}

export function normalizeOtp(code: string) {
  return code.trim().replace(/\s+/g, "").toUpperCase();
}

export function verifyOtp(input: { provided: string; storedHash: string; salt: string }) {
  const providedHash = hashOneTimePassword(input.provided, input.salt);
  const left = Buffer.from(providedHash);
  const right = Buffer.from(input.storedHash);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function assertPortalRole(actor: PortalActor, allowed: PortalRole[]) {
  if (!allowed.includes(actor.role)) {
    throw new Error(`Role ${actor.role} is not allowed for this portal backend action.`);
  }
}

export function createPortalAuthService(options: PortalAuthServiceOptions) {
  const createSession = async (actor: PortalActor, authMethod: PortalSession["authMethod"]) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + options.sessionTtlMinutes * 60 * 1000);
    const session: PortalSession = {
      sessionId: `SESS-${randomUUID()}`,
      actor,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      authMethod,
      assuranceLevel: actor.role === "customer" ? "password-session" : "staff-session",
    };
    await options.repositories.sessions.save(session);
    return session;
  };

  return {
    async issueOneTimePassword(customerId: string, delivery: OneTimePasswordRecord["delivery"], otpSalt: string) {
      const now = new Date();
      const code = generateOneTimePassword();
      const expiresAt = new Date(now.getTime() + options.otpTtlMinutes * 60 * 1000);
      const record: OneTimePasswordRecord = {
        id: `OTP-${randomUUID()}`,
        customerId,
        codeHash: hashOneTimePassword(code, otpSalt),
        issuedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        delivery,
        failedAttempts: 0,
      };

      await options.repositories.oneTimePasswords.save(record);
      await options.auditLog.append(createAuditEvent({
        actor: "system",
        action: "portal-one-time-password-issued",
        outcome: "accepted",
        metadata: { customerId, delivery },
      }));

      return { record, oneTimePasswordForLetterOrHandout: code };
    },

    async activateWithOneTimePassword(input: ActivatePortalInput, otpSalt: string) {
      if (input.newPassword.length < 10 || input.newPassword === input.oneTimePassword) {
        throw new Error("New portal password does not satisfy minimum production rules.");
      }
      if (input.newPassword !== input.confirmPassword) {
        throw new Error("Password confirmation does not match.");
      }

      const otp = await options.repositories.oneTimePasswords.findActiveByCustomer(input.customerId);
      if (!otp || otp.consumedAt || new Date(otp.expiresAt).getTime() < Date.now()) {
        throw new Error("One-time password is not active.");
      }
      if (!verifyOtp({ provided: input.oneTimePassword, storedHash: otp.codeHash, salt: otpSalt })) {
        await options.repositories.oneTimePasswords.incrementFailedAttempts(otp.id);
        throw new Error("One-time password verification failed.");
      }

      const passwordHash = await options.passwordHasher.hashPassword(input.newPassword);
      await options.repositories.credentials.save({
        customerId: input.customerId,
        email: input.email.toLowerCase(),
        passwordHash,
        passwordSetAt: new Date().toISOString(),
      });
      await options.repositories.oneTimePasswords.consume(otp.id, new Date().toISOString());

      const session = await createSession({ id: input.customerId, role: "customer", customerId: input.customerId }, "one-time-password");
      await options.auditLog.append(createAuditEvent({
        actor: session.actor,
        action: "portal-activated-with-one-time-password",
        outcome: "accepted",
        metadata: { customerId: input.customerId },
      }));
      return session;
    },

    async loginWithPassword(input: PasswordLoginInput) {
      const credentials = await options.repositories.credentials.findByEmail(input.email.toLowerCase());
      if (!credentials || credentials.disabledAt) {
        throw new Error("Portal credentials not found or disabled.");
      }

      const valid = await options.passwordHasher.verifyPassword(input.password, credentials.passwordHash);
      if (!valid) {
        await options.auditLog.append(createAuditEvent({
          actor: "system",
          action: "portal-password-login-failed",
          outcome: "rejected",
          metadata: { emailHash: createHash("sha256").update(input.email.toLowerCase()).digest("hex") },
        }));
        throw new Error("Invalid portal credentials.");
      }

      const session = await createSession({ id: credentials.customerId, role: "customer", customerId: credentials.customerId }, "password");
      await options.auditLog.append(createAuditEvent({
        actor: session.actor,
        action: "portal-password-login-succeeded",
        outcome: "accepted",
        metadata: { customerId: credentials.customerId },
      }));
      return session;
    },

    async requestMagicLink() {
      throw new Error("Magic link is intentionally planned but not implemented in this scaffold.");
    },
  };
}
