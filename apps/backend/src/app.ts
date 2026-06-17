import type { IncomingMessage, ServerResponse } from "node:http";
import type { BackendEnv } from "./config/env.js";
import { checkCsrf } from "./security/csrf.js";
import { createAllowAllRateLimiter, type RateLimiter } from "./security/rateLimiter.js";

export type BackendRequestHandlerDependencies = {
  rateLimiter?: RateLimiter;
};

export function createBackendRequestHandler(env: BackendEnv, dependencies: BackendRequestHandlerDependencies = {}) {
  const rateLimiter = dependencies.rateLimiter ?? createAllowAllRateLimiter();

  return async function handleRequest(request: IncomingMessage, response: ServerResponse) {
    const rateLimit = await rateLimiter.check({
      scope: "backend_global",
      subject: `${request.method ?? "GET"}:${request.url ?? "/"}`,
      ip: readClientIp(request),
      windowSeconds: env.rateLimitGlobalWindowSeconds,
      limitCount: env.rateLimitGlobalMaxRequests,
    });
    response.setHeader("x-ratelimit-limit", String(rateLimit.limitCount));
    response.setHeader("x-ratelimit-remaining", String(Math.max(rateLimit.limitCount - rateLimit.observedCount, 0)));
    if (rateLimit.decision === "deny") {
      writeJson(response, 429, {
        error: "rate_limit_exceeded",
      });
      return;
    }

    const csrf = checkCsrf({
      method: request.method,
      headers: request.headers,
      trustedOrigins: env.trustedOrigins,
    });
    if (!csrf.ok) {
      writeJson(response, 403, {
        error: "csrf_rejected",
        reason: csrf.reason,
      });
      return;
    }

    if (request.method === "GET" && request.url === "/healthz") {
      writeJson(response, 200, {
        status: "ok",
        service: "sanipep-portal-backend",
        environment: env.nodeEnv,
      });
      return;
    }

    if (request.method === "GET" && request.url === "/readyz") {
      const ready = Boolean(env.databaseUrl && env.redisUrl && env.avScannerMode !== "stub-disabled");
      writeJson(response, ready ? 200 : 503, {
        status: ready ? "ready" : "not_ready",
        checks: {
          databaseConfigured: Boolean(env.databaseUrl),
          redisConfigured: Boolean(env.redisUrl),
          avScannerConfigured: env.avScannerMode !== "stub-disabled",
          quarantineBucketConfigured: Boolean(env.uploadQuarantineBucket),
          cleanBucketConfigured: Boolean(env.uploadCleanBucket),
        },
      });
      return;
    }

    writeJson(response, 404, {
      error: "not_found",
    });
  };
}

function readClientIp(request: IncomingMessage) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) return forwarded.split(",")[0]?.trim();
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0].split(",")[0]?.trim();
  return request.socket.remoteAddress;
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(body));
}
