import { timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { hashToken } from "../auth/sessions.js";
import type { Session } from "../auth/models.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export type CsrfCheckInput = {
  method?: string;
  headers: IncomingHttpHeaders;
  trustedOrigins: readonly string[];
  session?: Pick<Session, "csrfTokenHash">;
};

export type CsrfCheckResult = {
  ok: boolean;
  reason?: "safe-method" | "missing-origin" | "untrusted-origin" | "missing-token" | "invalid-token";
};

export function checkCsrf(input: CsrfCheckInput): CsrfCheckResult {
  const method = input.method?.toUpperCase() ?? "GET";
  if (safeMethods.has(method)) return { ok: true, reason: "safe-method" };

  const origin = readSingleHeader(input.headers.origin);
  if (!origin) return { ok: false, reason: "missing-origin" };
  if (!input.trustedOrigins.includes(origin)) return { ok: false, reason: "untrusted-origin" };

  if (!input.session) return { ok: true };

  const token = readSingleHeader(input.headers["x-csrf-token"]);
  if (!token) return { ok: false, reason: "missing-token" };

  return verifyCsrfToken(token, input.session.csrfTokenHash)
    ? { ok: true }
    : { ok: false, reason: "invalid-token" };
}

export function verifyCsrfToken(providedToken: string, expectedHash: string) {
  const providedHash = Buffer.from(hashToken(providedToken));
  const expected = Buffer.from(expectedHash);
  return providedHash.length === expected.length && timingSafeEqual(providedHash, expected);
}

function readSingleHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
