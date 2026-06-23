import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import { createAuditEvent } from "./audit/auditEvent.js";
import type { AuditEvent } from "./audit/models.js";
import type { Session } from "./auth/models.js";
import { createSession, hashToken, isSessionActive } from "./auth/sessions.js";
import type { BackendEnv } from "./config/env.js";
import { createPostgresPool, createPostgresQueryLayer, verifyPostgresConnection } from "./db/postgres.js";
import type { PortalRequestKind, PortalRequestSensitivity, PortalRequestStatus } from "./portalRequests/models.js";
import { createPostgresPortalMvpRepository } from "./repositories/postgresPortalMvpRepository.js";
import {
  createFilePortalMvpRepository,
  normalizeStaffRequestStatus,
  type PortalMvpRepository,
  type PortalSessionRecord,
  type PortalUserRecord,
  type StaffRequestStatus,
  type StoredAppointmentWish,
  type StoredContactWish,
  type StoredPortalRequest,
  type StoredPublicRequestDetails,
  type StoredReorderWish,
  type StoredSubscriptionWish,
} from "./repositories/portalMvpRepository.js";
import { checkCsrf } from "./security/csrf.js";
import { serializeExpiredSessionCookie, serializeSessionCookie } from "./security/cookies.js";
import { createAllowAllRateLimiter, type RateLimiter } from "./security/rateLimiter.js";
import type { AuthenticatedActor, UserRole } from "./users/models.js";

export type BackendRequestHandlerDependencies = {
  rateLimiter?: RateLimiter;
  repository?: PortalMvpRepository;
  readinessChecks?: BackendReadinessChecks;
};

export type BackendReadinessChecks = {
  database?: () => Promise<boolean>;
  redis?: () => Promise<boolean>;
  antivirus?: () => Promise<boolean>;
  objectStorage?: () => Promise<boolean>;
};

type AuthenticatedSession = {
  actor: AuthenticatedActor;
  user: PortalUserRecord;
  sessionRecord: PortalSessionRecord;
};

type RequestBase = Omit<StoredPortalRequest, "safeSummary" | "sensitivity">;

const requestKindLabels: Record<PortalRequestKind, string> = {
  prescription_upload: "Rezeptupload-Anfrage",
  reorder_request: "Bestellanfrage",
  subscription_change_request: "Abo-Wunsch",
  appointment_request: "Terminwunsch",
  health_contact_request: "Kontaktanfrage",
};

const safePrescriptionContexts = {
  compression: "Kompressionsversorgung",
  aid: "Hilfsmittelversorgung",
  followup: "Nachreichung",
} as const;

const appointmentConcerns: Record<StoredAppointmentWish["concern"], string> = {
  kompression: "Kompressionsberatung",
  rezept: "Rezeptbesprechung",
  versorgungskontrolle: "Versorgungskontrolle",
};

const timeWindowLabels: Record<StoredAppointmentWish["timeWindow"], string> = {
  vormittag: "Vormittag",
  mittag: "Mittag",
  nachmittag: "Nachmittag",
};

const supplyLabels: Record<StoredReorderWish["supplyAlias"], string> = {
  kompressionsversorgung: "Kompressionsversorgung",
  inkontinenzmaterial: "Inkontinenzmaterial",
  bandage: "Bandage",
};

const reorderCadenceLabels: Record<StoredReorderWish["cadence"], string> = {
  einmalig: "einmalige Bestellanfrage",
  "regelmaessig-pruefen": "regelmaessige Versorgung pruefen",
};

const subscriptionCadenceLabels: Record<StoredSubscriptionWish["cadence"], string> = {
  monatlich: "monatlich pruefen",
  quartalsweise: "quartalsweise pruefen",
  halbjaehrlich: "halbjaehrlich pruefen",
};

const contactTopicLabels: Record<StoredContactWish["topic"], string> = {
  rueckfrage: "Rueckfrage",
  beratung: "Beratung",
  unterlagen: "Unterlagen",
};

const contactChannelLabels: Record<StoredContactWish["preferredChannel"], string> = {
  telefon: "Telefon",
  email: "E-Mail",
};

const employeeStatusLabels: Record<StoredPortalRequest["employeeStatus"], string> = {
  new: "Neu",
  queued: "Wartet auf Mitarbeiterpruefung",
  in_review: "In Mitarbeiterpruefung",
  waiting_for_customer: "Rueckfrage an Kunde",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  completed: "Abgeschlossen",
  cancelled: "Abgebrochen",
};

const staffRequestStatuses = ["new", "in_review", "waiting_for_customer", "completed", "cancelled"] as const;

const staffStatusLabels: Record<StaffRequestStatus, string> = {
  new: "Neu",
  in_review: "In Pruefung",
  waiting_for_customer: "Rueckfrage an Kunde",
  completed: "Abgeschlossen",
  cancelled: "Abgebrochen",
};

const allowedUploadExtensions = new Set(["pdf", "jpg", "jpeg", "png", "heic", "heif"]);

const allowedTransitions: Record<PortalRequestStatus, readonly PortalRequestStatus[]> = {
  draft: ["submitted", "rejected"],
  submitted: ["staff_review", "rejected"],
  staff_review: ["approved", "rejected"],
  approved: ["completed", "rejected"],
  rejected: [],
  completed: [],
};

const allowedStaffStatusTransitions: Record<StaffRequestStatus, readonly StaffRequestStatus[]> = {
  new: ["in_review", "waiting_for_customer", "completed", "cancelled"],
  in_review: ["waiting_for_customer", "completed", "cancelled"],
  waiting_for_customer: ["in_review", "completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const staffMvpBoundary = {
  mode: "staff-request-mvp",
  productionReady: false,
  authBoundary: "development-password-session-only",
  persistenceBoundary: "repository-driver-mvp-postgres-or-file-dev-only",
  roleBoundary: "staff-admin-role-check-prepared-no-production-iam",
} as const;

export function createBackendRequestHandler(env: BackendEnv, dependencies: BackendRequestHandlerDependencies = {}) {
  const rateLimiter = dependencies.rateLimiter ?? createAllowAllRateLimiter();
  const defaultPostgresPool = !dependencies.repository && env.portalRepositoryDriver === "postgres"
    ? createPostgresPool(env)
    : undefined;
  const repository = dependencies.repository ?? createDefaultPortalMvpRepository(env, defaultPostgresPool);
  const readinessChecks: BackendReadinessChecks = {
    ...dependencies.readinessChecks,
    database: dependencies.readinessChecks?.database ?? (defaultPostgresPool ? () => verifyPostgresConnection(defaultPostgresPool) : undefined),
  };

  return async function handleRequest(request: IncomingMessage, response: ServerResponse) {
    setCorsHeaders(request, response, env);

    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }

    const trustedOrigins = trustedOriginsForRequest(env, request);
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
      writeJson(response, 429, { error: "rate_limit_exceeded" });
      return;
    }

    const csrf = checkCsrf({
      method: request.method,
      headers: request.headers,
      trustedOrigins,
    });
    if (!csrf.ok) {
      writeJson(response, 403, {
        error: "csrf_rejected",
        reason: csrf.reason,
      });
      return;
    }

    const url = new URL(request.url ?? "/", env.backendBaseUrl);

    try {
      if (request.method === "GET" && url.pathname === "/healthz") {
        writeJson(response, 200, {
          status: "ok",
          service: "sanipep-portal-backend",
          environment: env.nodeEnv,
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/readyz") {
        const readiness = await buildReadinessResponse(env, readinessChecks);
        const ready = Object.values(readiness.checks).every((check) => check.ok);
        writeJson(response, ready ? 200 : 503, {
          status: ready ? "ready" : "not_ready",
          checks: readiness.checks,
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/auth/login") {
        await handleLogin(request, response, env, repository, rateLimiter);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/staff/auth/login") {
        await handleLogin(request, response, env, repository, rateLimiter, {
          allowedRoles: ["staff", "admin"],
          surface: "staff-admin",
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/auth/logout") {
        await handleLogout(request, response, env, repository, trustedOrigins);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/auth/session") {
        const auth = await authenticate(request, env, repository);
        if (!auth) {
          writeJson(response, 401, { authenticated: false });
          return;
        }
        writeJson(response, 200, buildSessionResponse(auth));
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/staff/session") {
        const auth = await requireRole(request, response, env, repository, ["staff", "admin"]);
        if (!auth) return;
        setStaffMvpBoundaryHeader(response);
        writeJson(response, 200, {
          ...buildSessionResponse(auth),
          mvpBoundary: staffMvpBoundary,
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/portal/dashboard") {
        const auth = await requireRole(request, response, env, repository, ["customer"]);
        if (!auth) return;
        writeJson(response, 200, await buildDashboardResponse(auth, repository));
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/portal/requests") {
        const auth = await requireRole(request, response, env, repository, ["customer"]);
        if (!auth) return;
        if (!checkSessionCsrf(request, response, trustedOrigins, auth)) return;

        const body = await readJsonBody<unknown>(request);
        const portalRequest = await createStoredPortalRequest(body, auth.actor, env, repository);
        writeJson(response, 201, {
          request: toRequestDto(portalRequest),
          dashboard: await buildDashboardResponse(auth, repository),
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/public/requests") {
        const body = await readJsonBody<unknown>(request);
        const publicRequest = await createPublicRequest(body, env, repository);
        writeJson(response, 201, {
          request: toPublicRequestReceiptDto(publicRequest),
          message: "Ihre Anfrage wurde sicher an saniPEP uebermittelt und wartet auf Mitarbeiterpruefung.",
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/staff/requests") {
        const auth = await requireRole(request, response, env, repository, ["staff", "admin"]);
        if (!auth) return;
        const status = readOptionalStaffRequestStatus(url.searchParams.get("status"));
        const requests = await repository.listRequestsForStaff({ status, limit: 100 });
        setStaffMvpBoundaryHeader(response);
        writeJson(response, 200, {
          mvpBoundary: staffMvpBoundary,
          statusModel: staffRequestStatuses.map((value) => ({
            value,
            label: staffStatusLabels[value],
          })),
          requests: requests.map(toStaffRequestListDto),
        });
        return;
      }

      const staffDetailRoute = url.pathname.match(/^\/api\/staff\/requests\/([^/]+)$/);
      if (request.method === "GET" && staffDetailRoute?.[1]) {
        const auth = await requireRole(request, response, env, repository, ["staff", "admin"]);
        if (!auth) return;
        const portalRequest = await repository.getRequestById(staffDetailRoute[1]);
        if (!portalRequest) throw new SafeHttpError(404, "portal_request_not_found");
        const auditEvents = await repository.listAuditEventsFor({
          requestIds: [portalRequest.id],
          limit: 30,
        });
        setStaffMvpBoundaryHeader(response);
        writeJson(response, 200, {
          mvpBoundary: staffMvpBoundary,
          request: toStaffRequestDetailDto(portalRequest, auditEvents),
        });
        return;
      }

      const statusRoute = url.pathname.match(/^\/api\/staff\/requests\/([^/]+)\/status$/);
      if (request.method === "PATCH" && statusRoute?.[1]) {
        const auth = await requireRole(request, response, env, repository, ["staff", "admin"]);
        if (!auth) return;
        if (!checkSessionCsrf(request, response, trustedOrigins, auth)) return;
        const body = assertObject(await readJsonBody<unknown>(request));
        const updated = await updateRequestStatus(statusRoute[1], body, auth, env, repository);
        writeJson(response, 200, {
          request: toRequestDto(updated),
        });
        return;
      }

      writeJson(response, 404, { error: "not_found" });
    } catch (error) {
      const message = error instanceof SafeHttpError ? error.message : "portal_backend_error";
      const statusCode = error instanceof SafeHttpError ? error.statusCode : 500;
      writeJson(response, statusCode, { error: message });
    }
  };
}

function createDefaultPortalMvpRepository(
  env: BackendEnv,
  postgresPool: ReturnType<typeof createPostgresPool> | undefined,
) {
  if (env.portalRepositoryDriver === "postgres") {
    const pool = postgresPool ?? createPostgresPool(env);
    return createPostgresPortalMvpRepository(createPostgresQueryLayer(pool));
  }

  if (env.nodeEnv === "production") {
    throw new Error("File-backed Portal MVP repository is not allowed in production.");
  }

  return createFilePortalMvpRepository(env.portalStorePath, {
    developmentUsers: developmentUsersForRepository(env),
  });
}

function developmentUsersForRepository(env: BackendEnv): PortalUserRecord[] {
  return env.developmentUsers.map((user) => ({
    userId: `usr_dev_${user.role}`,
    email: user.email,
    role: user.role,
    status: "active",
    passwordHashSha256: hashPasswordWithPepper(user.password, env.passwordPepper),
    customerProfileId: user.role === "customer" ? "cst_dev_portal" : undefined,
    staffUserId: user.role === "staff" || user.role === "admin" ? `${user.role}_dev` : undefined,
    safeDisplayName: user.safeDisplayName,
  }));
}

type ReadinessCheckState = {
  configured: boolean;
  ok: boolean;
  status: "ok" | "not_configured" | "disabled" | "failed" | "check_not_implemented";
  required: boolean;
  detail?: string;
};

async function buildReadinessResponse(env: BackendEnv, checks: BackendReadinessChecks) {
  return {
    checks: {
      database: await dependencyCheck({
        configured: Boolean(env.databaseUrl),
        required: true,
        check: checks.database,
        notConfiguredDetail: "PORTAL_DATABASE_URL is not set.",
      }),
      redis: await dependencyCheck({
        configured: Boolean(env.redisUrl),
        required: true,
        check: checks.redis,
        notConfiguredDetail: "REDIS_URL is not set.",
      }),
      antivirus: await dependencyCheck({
        configured: env.uploadsEnabled && env.avScannerMode !== "stub-disabled",
        required: env.uploadsEnabled,
        check: checks.antivirus,
        disabledDetail: env.uploadsEnabled ? "AV_SCANNER_MODE=stub-disabled keeps uploads blocked." : "UPLOADS_ENABLED=false keeps file transfer blocked for the metadata-only pilot.",
        notConfiguredDetail: "AV scanner is not configured.",
      }),
      objectStorage: await dependencyCheck({
        configured: env.uploadsEnabled && Boolean(env.uploadQuarantineBucket && env.uploadCleanBucket && env.uploadKmsKeyId),
        required: env.uploadsEnabled,
        check: checks.objectStorage,
        disabledDetail: env.uploadsEnabled ? undefined : "UPLOADS_ENABLED=false keeps object storage out of the metadata-only pilot.",
        notConfiguredDetail: "UPLOAD_QUARANTINE_BUCKET, UPLOAD_CLEAN_BUCKET and UPLOAD_KMS_KEY_ID must be set.",
      }),
      repository: {
        configured: true,
        ok: env.portalRepositoryDriver !== "file" || env.nodeEnv !== "production",
        status: env.portalRepositoryDriver !== "file" || env.nodeEnv !== "production" ? "ok" : "failed",
        required: true,
        detail: `PORTAL_REPOSITORY_DRIVER=${env.portalRepositoryDriver}`,
      } satisfies ReadinessCheckState,
    },
  };
}

async function dependencyCheck(input: {
  configured: boolean;
  required: boolean;
  check?: () => Promise<boolean>;
  notConfiguredDetail: string;
  disabledDetail?: string;
}): Promise<ReadinessCheckState> {
  if (!input.configured) {
    const disabled = Boolean(input.disabledDetail);
    return {
      configured: false,
      ok: disabled && !input.required,
      status: disabled ? "disabled" : "not_configured",
      required: input.required,
      detail: input.disabledDetail ?? input.notConfiguredDetail,
    };
  }

  if (!input.check) {
    return {
      configured: true,
      ok: false,
      status: "check_not_implemented",
      required: input.required,
      detail: "Dependency is configured, but no runtime check is attached yet.",
    };
  }

  try {
    const ok = await input.check();
    return {
      configured: true,
      ok,
      status: ok ? "ok" : "failed",
      required: input.required,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      status: "failed",
      required: input.required,
      detail: error instanceof Error ? error.message : "Dependency check failed.",
    };
  }
}

type StaffRequestFilters = {
  status?: PortalRequestStatus;
  kind?: PortalRequestKind;
};

type LoginOptions = {
  allowedRoles?: readonly UserRole[];
  surface?: "portal" | "staff-admin";
};

async function handleLogin(
  request: IncomingMessage,
  response: ServerResponse,
  env: BackendEnv,
  repository: PortalMvpRepository,
  rateLimiter: RateLimiter,
  options: LoginOptions = {},
) {
  const body = assertObject(await readJsonBody<unknown>(request));
  const email = readRequiredString(body.email, "email").toLowerCase();
  const password = readRequiredString(body.password, "password");
  const loginRateLimit = await rateLimiter.check({
    scope: "login",
    subject: `${options.surface ?? "portal"}:${email}`,
    ip: readClientIp(request),
    windowSeconds: env.rateLimitLoginWindowSeconds,
    limitCount: env.rateLimitLoginMaxAttempts,
  });
  response.setHeader("x-ratelimit-login-limit", String(loginRateLimit.limitCount));
  response.setHeader("x-ratelimit-login-remaining", String(Math.max(loginRateLimit.limitCount - loginRateLimit.observedCount, 0)));
  if (loginRateLimit.decision === "deny") {
    await appendAudit(repository, env, {
      actorRole: "system",
      action: "portal-login-rate-limited",
      outcome: "blocked",
      objectType: "portal_session",
      metadata: {
        surface: options.surface ?? "portal",
        emailHash: createHash("sha256").update(email).digest("hex"),
      },
    });
    writeJson(response, 429, { error: "login_rate_limit_exceeded" });
    return;
  }

  const user = await repository.findUserByEmail(email);
  const passwordOk = user?.status === "active" && verifyPassword(user, password, env.passwordPepper);

  if (!user || !passwordOk) {
    await appendAudit(repository, env, {
      actorRole: "system",
      action: "portal-login-rejected",
      outcome: "rejected",
      objectType: "portal_session",
      metadata: {
        emailHash: createHash("sha256").update(email).digest("hex"),
      },
    });
    writeJson(response, 401, {
      error: "invalid_credentials",
      message: "E-Mail oder Passwort passen nicht zum Portal-MVP.",
    });
    return;
  }

  if (options.allowedRoles && !options.allowedRoles.includes(user.role)) {
    await appendAudit(repository, env, {
      actorUserId: user.userId,
      actorRole: user.role,
      action: "portal-login-role-rejected",
      outcome: "rejected",
      objectType: "portal_session",
      metadata: {
        surface: options.surface ?? "portal",
        role: user.role,
      },
    });
    writeJson(response, 403, { error: "role_not_allowed" });
    return;
  }

  const { session, rawSessionToken, rawCsrfToken } = createSession({
    userId: user.userId,
    role: user.role,
    ip: readClientIp(request),
    userAgent: readSingleHeader(request.headers["user-agent"]),
    env,
  });
  const sessionRecord = { session, rawCsrfToken };
  await repository.saveSession(sessionRecord);

  await appendAudit(repository, env, {
    actorUserId: user.userId,
    actorRole: user.role,
    action: "portal-login-succeeded",
    outcome: "accepted",
    objectType: "portal_session",
    objectId: session.id,
    metadata: {
      sessionId: session.id,
      role: user.role,
      surface: options.surface ?? "portal",
      assurance: "password-session",
    },
  });

  const staffSurface = options.surface === "staff-admin";
  if (staffSurface) setStaffMvpBoundaryHeader(response);
  response.setHeader("set-cookie", serializeSessionCookie(rawSessionToken, env, user.role !== "customer"));
  writeJson(response, 200, {
    ...buildSessionResponse({
      actor: actorFromUser(user),
      user,
      sessionRecord,
    }),
    ...(staffSurface ? { mvpBoundary: staffMvpBoundary } : {}),
    message: "Login erfolgreich. Session-Cookie wurde vom Backend gesetzt.",
  });
}

async function handleLogout(
  request: IncomingMessage,
  response: ServerResponse,
  env: BackendEnv,
  repository: PortalMvpRepository,
  trustedOrigins: readonly string[],
) {
  const auth = await authenticate(request, env, repository);
  if (auth && !checkSessionCsrf(request, response, trustedOrigins, auth)) return;

  if (auth) {
    await repository.deleteSession(auth.sessionRecord.session.tokenHash);
    await appendAudit(repository, env, {
      actorUserId: auth.actor.userId,
      actorRole: auth.actor.role,
      action: "portal-logout",
      outcome: "accepted",
      objectType: "portal_session",
      objectId: auth.sessionRecord.session.id,
    });
  }

  response.setHeader("set-cookie", serializeExpiredSessionCookie(env, auth?.actor.role !== "customer"));
  writeJson(response, 200, { authenticated: false });
}

async function authenticate(
  request: IncomingMessage,
  env: BackendEnv,
  repository: PortalMvpRepository,
): Promise<AuthenticatedSession | null> {
  const cookie = readCookie(request.headers.cookie, env.sessionCookieName);
  if (!cookie) return null;

  const tokenHash = hashToken(cookie);
  const sessionRecord = await repository.findSessionByTokenHash(tokenHash);
  if (!sessionRecord || !isSessionActive(sessionRecord.session)) return null;

  const user = await repository.findUserById(sessionRecord.session.userId);
  if (!user || user.status !== "active") return null;

  return {
    actor: actorFromUser(user),
    user,
    sessionRecord,
  };
}

async function requireRole(
  request: IncomingMessage,
  response: ServerResponse,
  env: BackendEnv,
  repository: PortalMvpRepository,
  roles: readonly UserRole[],
) {
  const auth = await authenticate(request, env, repository);
  if (!auth) {
    writeJson(response, 401, { error: "authentication_required" });
    return null;
  }
  if (!roles.includes(auth.actor.role)) {
    writeJson(response, 403, { error: "role_not_allowed" });
    return null;
  }
  return auth;
}

function checkSessionCsrf(
  request: IncomingMessage,
  response: ServerResponse,
  trustedOrigins: readonly string[],
  auth: AuthenticatedSession,
) {
  const csrf = checkCsrf({
    method: request.method,
    headers: request.headers,
    trustedOrigins,
    session: auth.sessionRecord.session,
  });
  if (!csrf.ok) {
    writeJson(response, 403, {
      error: "csrf_rejected",
      reason: csrf.reason,
    });
    return false;
  }
  return true;
}

function actorFromUser(user: PortalUserRecord): AuthenticatedActor {
  return {
    userId: user.userId,
    role: user.role,
    customerProfileId: user.customerProfileId,
    staffUserId: user.staffUserId,
  };
}

function buildSessionResponse(auth: AuthenticatedSession) {
  return {
    authenticated: true,
    csrfToken: auth.sessionRecord.rawCsrfToken,
    session: {
      id: auth.sessionRecord.session.id,
      issuedAt: auth.sessionRecord.session.issuedAt,
      idleExpiresAt: auth.sessionRecord.session.idleExpiresAt,
      absoluteExpiresAt: auth.sessionRecord.session.absoluteExpiresAt,
      role: auth.actor.role,
    },
    profile: {
      customerProfileId: auth.user.customerProfileId,
      staffUserId: auth.user.staffUserId,
      safeDisplayName: auth.user.safeDisplayName,
      email: auth.user.email,
    },
  };
}

async function buildDashboardResponse(auth: AuthenticatedSession, repository: PortalMvpRepository) {
  if (!auth.actor.customerProfileId) throw new SafeHttpError(403, "customer_profile_required");

  const requests = (await repository.listRequestsForCustomer(auth.actor.customerProfileId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const requestIds = requests.map((request) => request.id);
  const auditEvents = await repository.listAuditEventsFor({
    actorUserId: auth.actor.userId,
    requestIds,
    limit: 30,
  });

  return {
    profile: {
      customerProfileId: auth.actor.customerProfileId,
      safeDisplayName: auth.user.safeDisplayName,
      portalMode: "development-mvp",
    },
    summary: {
      openRequests: requests.filter((request) => !["completed", "rejected"].includes(request.status)).length,
      completedRequests: requests.filter((request) => request.status === "completed").length,
      rejectedRequests: requests.filter((request) => request.status === "rejected").length,
      storedRequests: requests.length,
      staffReviewRequired: requests.filter((request) => request.staffReviewRequired).length,
      omniaWrites: 0,
      auditEvents: auditEvents.length,
    },
    requests: requests.map(toRequestDto),
    auditEvents: auditEvents.map(toAuditDto),
    latestActivities: auditEvents.slice(0, 5).map(toAuditDto),
    boundaries: [
      "Keine Omnia-Anbindung in diesem MVP.",
      "Keine echten Gesundheitsdaten oder Produktiv-Uploads.",
      "Rezeptupload speichert nur Dateityp, Groesse, Kontext und Request-ID.",
      "Session liegt serverseitig; der Browser bekommt nur ein HTTP-only Cookie und ein CSRF-Token im Arbeitsspeicher.",
    ],
  };
}

async function buildStaffRequestsResponse(
  auth: AuthenticatedSession,
  repository: PortalMvpRepository,
  filters: StaffRequestFilters,
) {
  if (!auth.actor.staffUserId) throw new SafeHttpError(403, "staff_profile_required");

  const allRequests = (await repository.listAllRequests())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const requests = allRequests.filter((request) => {
    if (filters.status && request.status !== filters.status) return false;
    if (filters.kind && request.kind !== filters.kind) return false;
    return true;
  });
  const requestIds = requests.map((request) => request.id);
  const auditEvents = await repository.listAuditEventsFor({
    requestIds,
    limit: 80,
  });

  return {
    profile: {
      staffUserId: auth.actor.staffUserId,
      safeDisplayName: auth.user.safeDisplayName,
      role: auth.actor.role,
      portalMode: "development-mvp",
    },
    filters,
    summary: {
      totalRequests: allRequests.length,
      filteredRequests: requests.length,
      submittedRequests: allRequests.filter((request) => request.status === "submitted").length,
      staffReviewRequests: allRequests.filter((request) => request.status === "staff_review").length,
      approvedRequests: allRequests.filter((request) => request.status === "approved").length,
      rejectedRequests: allRequests.filter((request) => request.status === "rejected").length,
      completedRequests: allRequests.filter((request) => request.status === "completed").length,
      omniaWrites: 0,
      auditEvents: auditEvents.length,
    },
    requests: requests.map(toRequestDto),
    auditEvents: auditEvents.map(toAuditDto),
    latestActivities: auditEvents.slice(0, 8).map(toAuditDto),
    boundaries: [
      "Staff/Admin-Zugriff ist serverseitig rollenbegrenzet.",
      "Diese Arbeitsliste zeigt nur sichere Request-Metadaten und Statusinformationen.",
      "Rezeptupload-Anfragen bleiben Metadaten-only; keine Datei wird gespeichert oder ausgeliefert.",
      "Keine Omnia-Anbindung und keine Omnia-Schreibzugriffe in diesem MVP.",
    ],
  };
}

function readStaffFilters(searchParams: URLSearchParams): StaffRequestFilters {
  const status = readOptionalEnumValue(
    searchParams.get("status"),
    ["draft", "submitted", "staff_review", "approved", "rejected", "completed"] as const,
    "status",
  );
  const kind = readOptionalEnumValue(
    searchParams.get("kind"),
    ["prescription_upload", "appointment_request", "reorder_request", "subscription_change_request", "health_contact_request"] as const,
    "kind",
  );

  return {
    ...(status ? { status } : {}),
    ...(kind ? { kind } : {}),
  };
}

async function createStoredPortalRequest(
  rawBody: unknown,
  actor: AuthenticatedActor,
  env: BackendEnv,
  repository: PortalMvpRepository,
) {
  const body = assertObject(rawBody);
  const kind = readRequiredString(body.kind, "kind") as PortalRequestKind;

  if (!actor.customerProfileId) throw new SafeHttpError(403, "customer_profile_required");
  if (!["prescription_upload", "appointment_request", "reorder_request", "subscription_change_request", "health_contact_request"].includes(kind)) {
    throw new SafeHttpError(400, "unsupported_request_kind");
  }

  const now = new Date().toISOString();
  const initialStatus: PortalRequestStatus = body.saveAsDraft === true ? "draft" : "submitted";
  const base: RequestBase = {
    id: `REQ-${randomUUID()}`,
    customerProfileId: actor.customerProfileId,
    createdByUserId: actor.userId,
    kind,
    status: initialStatus,
    staffReviewRequired: true,
    omniaWriteAllowed: false,
    employeeStatus: initialStatus === "draft" ? "queued" : "queued",
    employeeStatusLabel: initialStatus === "draft" ? "Entwurf gespeichert" : employeeStatusLabels.queued,
    auditIds: [],
    submittedAt: initialStatus === "submitted" ? now : undefined,
    createdAt: now,
    updatedAt: now,
  };

  const request = buildRequestByKind(base, body, env);
  const audits = [
    createPortalAudit(env, {
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: "portal-request-created",
      outcome: "accepted",
      objectType: "portal_request",
      objectId: request.id,
      requestId: request.id,
      uploadObjectId: request.uploadObject?.id,
      metadata: requestAuditMetadata(request),
    }),
  ];

  if (request.status === "submitted") {
    audits.push(createPortalAudit(env, {
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: "portal-request-submitted",
      outcome: "queued",
      objectType: "portal_request",
      objectId: request.id,
      requestId: request.id,
      uploadObjectId: request.uploadObject?.id,
      metadata: requestAuditMetadata(request),
    }));
  }

  if (request.uploadObject) {
    audits.push(createPortalAudit(env, {
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: "prescription-upload-metadata-stored",
      outcome: "queued",
      objectType: "upload_object",
      objectId: request.uploadObject.id,
      requestId: request.id,
      uploadObjectId: request.uploadObject.id,
      metadata: {
        extension: request.uploadObject.extension,
        mimeType: request.uploadObject.mimeType,
        sizeBytes: request.uploadObject.sizeBytes,
        productionUpload: request.uploadObject.productionUpload,
      },
    }));
  }

  request.auditIds.push(...audits.map((audit) => audit.id));
  await repository.appendAuditMany(audits);
  await repository.saveRequest(request);
  return request;
}

type ParsedPublicRequest = {
  kind: PortalRequestKind;
  sensitivity: PortalRequestSensitivity;
  safeSummary: string;
  details: StoredPublicRequestDetails;
  auditMetadata: Record<string, string | number | boolean | undefined>;
};

async function createPublicRequest(
  rawBody: unknown,
  env: BackendEnv,
  repository: PortalMvpRepository,
) {
  const parsed = parsePublicRequest(rawBody, env);
  const now = new Date().toISOString();
  const request: StoredPortalRequest = {
    id: randomUUID(),
    customerProfileId: "public_website",
    createdByUserId: "anonymous_public_website",
    kind: parsed.kind,
    status: "submitted",
    sensitivity: parsed.sensitivity,
    safeSummary: parsed.safeSummary,
    staffReviewRequired: true,
    omniaWriteAllowed: false,
    employeeStatus: "new",
    employeeStatusLabel: employeeStatusLabels.new,
    publicRequest: parsed.details,
    auditIds: [],
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const audits = [
    createPortalAudit(env, {
      actorRole: "system",
      action: "public-request-created",
      outcome: "accepted",
      objectType: "portal_request",
      objectId: request.id,
      requestId: request.id,
      metadata: {
        ...parsed.auditMetadata,
        status: request.status,
        staffStatus: normalizeStaffRequestStatus(request.employeeStatus),
        fileUploadIncluded: false,
        omniaWriteAllowed: false,
      },
    }),
    createPortalAudit(env, {
      actorRole: "system",
      action: "public-request-submitted",
      outcome: "queued",
      objectType: "portal_request",
      objectId: request.id,
      requestId: request.id,
      metadata: {
        requestType: parsed.details.requestType,
        kind: request.kind,
        sensitivity: request.sensitivity,
        staffReviewRequired: request.staffReviewRequired,
      },
    }),
  ];

  request.auditIds.push(...audits.map((audit) => audit.id));
  await repository.appendAuditMany(audits);
  await repository.saveRequest(request);
  return request;
}

function parsePublicRequest(rawBody: unknown, env: BackendEnv): ParsedPublicRequest {
  const body = assertObject(rawBody);
  const type = readEnumValue(body.type, ["appointment", "contact", "care", "document"] as const, "type");

  if (type === "appointment") {
    const contact = readPublicContact(body);
    const concern = readBoundedString(body.concern, "concern", 2, 80);
    const preferredDate = readDateString(body.preferredDate, "preferredDate");
    const preferredWindow = readBoundedString(body.preferredWindow, "preferredWindow", 2, 40);
    const hasPrescription = readRequiredBoolean(body.hasPrescription, "hasPrescription");
    const shortQuestionnaire = readBoundedString(body.shortQuestionnaire, "shortQuestionnaire", 10, 700);
    return {
      kind: "appointment_request",
      sensitivity: "contact",
      safeSummary: `Terminanfrage: ${concern}, ${preferredDate}, ${preferredWindow}.`,
      details: {
        source: "public_website",
        requestType: "appointment",
        contact,
        appointment: {
          concern,
          preferredDate,
          preferredWindow,
          hasPrescription,
          shortQuestionnaire,
        },
        boundary: publicRequestBoundary(),
      },
      auditMetadata: {
        requestType: "appointment",
        kind: "appointment_request",
        sensitivity: "contact",
        hasPrescription,
      },
    };
  }

  if (type === "contact") {
    const preferredChannel = readEnumValue(
      body.preferredContactChannel,
      ["email", "phone", "whatsapp"] as const,
      "preferredContactChannel",
    );
    const containsHealthData = readRequiredBoolean(body.containsHealthData, "containsHealthData");
    if (containsHealthData && preferredChannel === "whatsapp") {
      throw new SafeHttpError(400, "health_data_not_allowed_for_whatsapp");
    }
    const contact = readPublicContact(body, preferredChannel);
    const topic = readBoundedString(body.topic, "topic", 2, 80);
    const serviceContext = readBoundedString(body.serviceContext, "serviceContext", 2, 80);
    const message = readBoundedString(body.message, "message", 10, 1200);
    const sensitivity: PortalRequestSensitivity = containsHealthData ? "health" : "contact";
    return {
      kind: "health_contact_request",
      sensitivity,
      safeSummary: `Kontaktanfrage: ${topic}, ${serviceContext}, Antwortweg ${preferredChannel}.`,
      details: {
        source: "public_website",
        requestType: "contact",
        contact: {
          ...contact,
          preferredChannel,
        },
        contactInquiry: {
          topic,
          serviceContext,
          message,
          containsHealthData,
        },
        boundary: publicRequestBoundary(),
      },
      auditMetadata: {
        requestType: "contact",
        kind: "health_contact_request",
        sensitivity,
        preferredChannel,
        containsHealthData,
      },
    };
  }

  if (type === "document") {
    const contact = readPublicContact(body);
    const context = readBoundedString(body.context, "context", 2, 80);
    const fileExtension = readRequiredString(body.fileExtension, "fileExtension").toLowerCase().replace(/^\./, "");
    const mimeType = readRequiredString(body.mimeType, "mimeType");
    const sizeBytes = readPositiveInteger(body.sizeBytes, "sizeBytes");
    const consentAccepted = readRequiredBoolean(body.consentAccepted, "consentAccepted");

    if (!consentAccepted) throw new SafeHttpError(400, "consent_required");
    if (!allowedUploadExtensions.has(fileExtension) || !env.uploadAllowedMimeTypes.includes(mimeType)) {
      throw new SafeHttpError(400, "unsupported_upload_metadata");
    }
    if (sizeBytes > env.uploadMaxBytes) throw new SafeHttpError(400, "upload_too_large");

    return {
      kind: "prescription_upload",
      sensitivity: "health",
      safeSummary: `Rezept-/Dokumentenanfrage: ${context}, ${fileExtension.toUpperCase()}, ${formatBytes(sizeBytes)}.`,
      details: {
        source: "public_website",
        requestType: "document",
        contact,
        document: {
          context,
          fileExtension,
          mimeType,
          sizeBytes,
          consentAccepted: true,
          uploadMode: "metadata-only-no-file-transfer",
        },
        boundary: publicRequestBoundary(),
      },
      auditMetadata: {
        requestType: "document",
        kind: "prescription_upload",
        sensitivity: "health",
        fileExtension,
        mimeType,
        sizeBytes,
        metadataOnly: true,
        fileUploadIncluded: false,
      },
    };
  }

  const contact = readPublicContact(body);
  const need = readBoundedString(body.need, "need", 2, 80);
  const rhythm = readBoundedString(body.rhythm, "rhythm", 2, 80);
  const hasPrescription = readRequiredBoolean(body.hasPrescription, "hasPrescription");
  const note = hasPrescription
    ? readOptionalBoundedString(body.note, "note", 0, 800) ?? ""
    : readBoundedString(body.note, "note", 10, 800);

  return {
    kind: "reorder_request",
    sensitivity: "health",
    safeSummary: `Pflege-/Versorgungs-Anfrage: ${need}, ${rhythm}.`,
    details: {
      source: "public_website",
      requestType: "care",
      contact,
      care: {
        need,
        rhythm,
        hasPrescription,
        note,
      },
      boundary: publicRequestBoundary(),
    },
    auditMetadata: {
      requestType: "care",
      kind: "reorder_request",
      sensitivity: "health",
      hasPrescription,
    },
  };
}

function publicRequestBoundary(): StoredPublicRequestDetails["boundary"] {
  return {
    fileUploadIncluded: false,
    omniaWriteAllowed: false,
    staffReviewRequired: true,
  };
}

async function updateRequestStatus(
  requestId: string,
  body: Record<string, unknown>,
  auth: AuthenticatedSession,
  env: BackendEnv,
  repository: PortalMvpRepository,
) {
  const requestedStatus = readRequiredString(body.status, "status");
  const existing = await repository.getRequestById(requestId);
  if (!existing) throw new SafeHttpError(404, "portal_request_not_found");

  const requestedStaffStatus = isStaffRequestStatus(requestedStatus) ? requestedStatus : undefined;
  const nextStatus = requestedStaffStatus
    ? portalStatusForStaffStatus(requestedStaffStatus)
    : readEnumValue(requestedStatus, ["draft", "submitted", "staff_review", "approved", "rejected", "completed"] as const, "status");
  const nextEmployeeStatus = requestedStaffStatus ?? employeeStatusForStatus(nextStatus);

  if (requestedStaffStatus) {
    const currentStaffStatus = normalizeStaffRequestStatus(existing.employeeStatus);
    if (!allowedStaffStatusTransitions[currentStaffStatus].includes(requestedStaffStatus)) {
      throw new SafeHttpError(409, "invalid_staff_status_transition");
    }
  } else if (!allowedTransitions[existing.status].includes(nextStatus)) {
    throw new SafeHttpError(409, "invalid_status_transition");
  }

  const now = new Date().toISOString();
  const updated: StoredPortalRequest = {
    ...existing,
    status: nextStatus,
    employeeStatus: nextEmployeeStatus,
    employeeStatusLabel: employeeStatusLabels[nextEmployeeStatus],
    submittedAt: existing.submittedAt ?? (nextStatus === "submitted" ? now : undefined),
    reviewedByStaffUserId: auth.actor.staffUserId ?? existing.reviewedByStaffUserId,
    reviewedAt: ["staff_review", "approved", "rejected"].includes(nextStatus) || requestedStaffStatus === "waiting_for_customer" ? now : existing.reviewedAt,
    completedAt: nextStatus === "completed" ? now : existing.completedAt,
    updatedAt: now,
  };

  const audits = [
    createPortalAudit(env, {
      actorUserId: auth.actor.userId,
      actorRole: auth.actor.role,
      action: "portal-request-changed",
      outcome: "accepted",
      objectType: "portal_request",
      objectId: updated.id,
      requestId: updated.id,
      uploadObjectId: updated.uploadObject?.id,
      metadata: {
        previousStatus: existing.status,
        nextStatus,
        previousStaffStatus: normalizeStaffRequestStatus(existing.employeeStatus),
        nextStaffStatus: normalizeStaffRequestStatus(updated.employeeStatus),
        actorStaffUserId: auth.actor.staffUserId,
        actorRole: auth.actor.role,
        staffReviewRequired: updated.staffReviewRequired,
        omniaWriteAllowed: updated.omniaWriteAllowed,
      },
    }),
  ];

  if (nextStatus === "approved") {
    audits.push(createPortalAudit(env, {
      actorUserId: auth.actor.userId,
      actorRole: auth.actor.role,
      action: "portal-request-approved",
      outcome: "accepted",
      objectType: "portal_request",
      objectId: updated.id,
      requestId: updated.id,
      metadata: requestAuditMetadata(updated),
    }));
  }

  if (nextStatus === "rejected") {
    audits.push(createPortalAudit(env, {
      actorUserId: auth.actor.userId,
      actorRole: auth.actor.role,
      action: "portal-request-rejected",
      outcome: "rejected",
      objectType: "portal_request",
      objectId: updated.id,
      requestId: updated.id,
      metadata: requestAuditMetadata(updated),
    }));
  }

  updated.auditIds = [...updated.auditIds, ...audits.map((audit) => audit.id)];
  await repository.appendAuditMany(audits);
  await repository.updateRequest(updated);
  return updated;
}

function buildRequestByKind(base: RequestBase, body: Record<string, unknown>, env: BackendEnv): StoredPortalRequest {
  if (base.kind === "prescription_upload") {
    const contextKey = readRequiredString(body.context, "context");
    const context = readKnownValue(contextKey, safePrescriptionContexts, "context");
    const fileExtension = readRequiredString(body.fileExtension, "fileExtension").toLowerCase().replace(/^\./, "");
    const mimeType = readRequiredString(body.mimeType, "mimeType");
    const sizeBytes = readPositiveInteger(body.sizeBytes, "sizeBytes");
    const consentAccepted = body.consentAccepted === true;

    if (!consentAccepted) throw new SafeHttpError(400, "consent_required");
    if (!allowedUploadExtensions.has(fileExtension) || !env.uploadAllowedMimeTypes.includes(mimeType)) {
      throw new SafeHttpError(400, "unsupported_upload_metadata");
    }
    if (sizeBytes > env.uploadMaxBytes) throw new SafeHttpError(400, "upload_too_large");

    return {
      ...base,
      sensitivity: "health",
      safeSummary: `${requestKindLabels.prescription_upload}: ${context}, ${fileExtension.toUpperCase()}, ${formatBytes(sizeBytes)}.`,
      uploadObject: {
        id: `UPL-${randomUUID()}`,
        extension: fileExtension,
        mimeType,
        sizeBytes,
        storageMode: "metadata-only-no-file-content",
        productionUpload: false,
      },
    };
  }

  if (base.kind === "appointment_request") {
    const preferredDay = readDateString(body.preferredDay, "preferredDay");
    const timeWindow = readEnumValue(body.timeWindow, ["vormittag", "mittag", "nachmittag"] as const, "timeWindow");
    const concern = readEnumValue(body.concern, ["kompression", "rezept", "versorgungskontrolle"] as const, "concern");

    return {
      ...base,
      sensitivity: "contact",
      safeSummary: `${requestKindLabels.appointment_request}: ${appointmentConcerns[concern]}, ${preferredDay}, ${timeWindowLabels[timeWindow]}.`,
      appointmentWish: {
        preferredDay,
        timeWindow,
        concern,
      },
    };
  }

  if (base.kind === "subscription_change_request") {
    const supplyAlias = readEnumValue(body.supplyAlias, ["kompressionsversorgung", "inkontinenzmaterial", "bandage"] as const, "supplyAlias");
    const cadence = readEnumValue(body.cadence, ["monatlich", "quartalsweise", "halbjaehrlich"] as const, "cadence");

    return {
      ...base,
      sensitivity: "omnia_reference",
      safeSummary: `${requestKindLabels.subscription_change_request}: ${supplyLabels[supplyAlias]}, ${subscriptionCadenceLabels[cadence]}.`,
      subscriptionWish: {
        supplyAlias,
        cadence,
      },
    };
  }

  if (base.kind === "health_contact_request") {
    const topic = readEnumValue(body.topic, ["rueckfrage", "beratung", "unterlagen"] as const, "topic");
    const preferredChannel = readEnumValue(body.preferredChannel, ["telefon", "email"] as const, "preferredChannel");

    return {
      ...base,
      sensitivity: "contact",
      safeSummary: `${requestKindLabels.health_contact_request}: ${contactTopicLabels[topic]}, Rueckmeldung per ${contactChannelLabels[preferredChannel]}.`,
      contactWish: {
        topic,
        preferredChannel,
      },
    };
  }

  const supplyAlias = readEnumValue(body.supplyAlias, ["kompressionsversorgung", "inkontinenzmaterial", "bandage"] as const, "supplyAlias");
  const cadence = readEnumValue(body.cadence, ["einmalig", "regelmaessig-pruefen"] as const, "cadence");

  return {
    ...base,
    sensitivity: "omnia_reference",
    safeSummary: `${requestKindLabels.reorder_request}: ${supplyLabels[supplyAlias]}, ${reorderCadenceLabels[cadence]}.`,
    reorderWish: {
      supplyAlias,
      cadence,
    },
  };
}

function createPortalAudit(env: BackendEnv, input: Parameters<typeof createAuditEvent>[0]) {
  return createAuditEvent({
    ...input,
    hashSecret: env.auditLogHashSecret,
  });
}

function appendAudit(repository: PortalMvpRepository, env: BackendEnv, input: Parameters<typeof createAuditEvent>[0]) {
  return repository.appendAudit(createPortalAudit(env, input));
}

function requestAuditMetadata(request: StoredPortalRequest) {
  return {
    kind: request.kind,
    status: request.status,
    sensitivity: request.sensitivity,
    staffReviewRequired: request.staffReviewRequired,
    omniaWriteAllowed: request.omniaWriteAllowed,
  };
}

function employeeStatusForStatus(status: PortalRequestStatus): StoredPortalRequest["employeeStatus"] {
  if (status === "staff_review") return "in_review";
  if (status === "approved") return "in_review";
  if (status === "rejected") return "cancelled";
  if (status === "completed") return "completed";
  return "new";
}

function isStaffRequestStatus(value: string): value is StaffRequestStatus {
  return (staffRequestStatuses as readonly string[]).includes(value);
}

function readOptionalStaffRequestStatus(value: string | null): StaffRequestStatus | undefined {
  if (!value) return undefined;
  if (!isStaffRequestStatus(value)) throw new SafeHttpError(400, "invalid_status");
  return value;
}

function portalStatusForStaffStatus(status: StaffRequestStatus): PortalRequestStatus {
  if (status === "new") return "submitted";
  if (status === "completed") return "completed";
  if (status === "cancelled") return "rejected";
  return "staff_review";
}

function toRequestDto(request: StoredPortalRequest) {
  return {
    id: request.id,
    customerProfileId: request.customerProfileId,
    kind: request.kind,
    kindLabel: requestKindLabels[request.kind],
    status: request.status,
    safeSummary: request.safeSummary,
    sensitivity: request.sensitivity,
    staffReviewRequired: request.staffReviewRequired,
    omniaWriteAllowed: request.omniaWriteAllowed,
    employeeStatus: request.employeeStatus,
    employeeStatusLabel: request.employeeStatusLabel,
    staffStatus: normalizeStaffRequestStatus(request.employeeStatus),
    staffStatusLabel: staffStatusLabels[normalizeStaffRequestStatus(request.employeeStatus)],
    submittedAt: request.submittedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    uploadObject: request.uploadObject,
    appointmentWish: request.appointmentWish,
    reorderWish: request.reorderWish,
    subscriptionWish: request.subscriptionWish,
    contactWish: request.contactWish,
    auditIds: request.auditIds,
  };
}

function toPublicRequestReceiptDto(request: StoredPortalRequest) {
  return {
    id: request.id,
    status: normalizeStaffRequestStatus(request.employeeStatus),
    statusLabel: staffStatusLabels[normalizeStaffRequestStatus(request.employeeStatus)],
    safeSummary: request.safeSummary,
    createdAt: request.createdAt,
    fileUploadIncluded: false,
    omniaWriteAllowed: false,
    staffReviewRequired: request.staffReviewRequired,
  };
}

function toStaffRequestListDto(request: StoredPortalRequest) {
  const staffStatus = normalizeStaffRequestStatus(request.employeeStatus);
  return {
    id: request.id,
    source: request.publicRequest?.source ?? "portal",
    requestType: request.publicRequest?.requestType ?? request.kind,
    kind: request.kind,
    kindLabel: requestKindLabels[request.kind],
    status: request.status,
    staffStatus,
    staffStatusLabel: staffStatusLabels[staffStatus],
    safeSummary: request.safeSummary,
    sensitivity: request.sensitivity,
    contactAvailable: Boolean(request.publicRequest?.contact.email || request.publicRequest?.contact.phone),
    preferredContactChannel: request.publicRequest?.contact.preferredChannel,
    staffReviewRequired: request.staffReviewRequired,
    omniaWriteAllowed: request.omniaWriteAllowed,
    submittedAt: request.submittedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function toStaffRequestDetailDto(request: StoredPortalRequest, auditEvents: AuditEvent[]) {
  return {
    ...toStaffRequestListDto(request),
    publicRequest: request.publicRequest,
    request: toRequestDto(request),
    auditEvents: auditEvents.map(toAuditDto),
  };
}

function toAuditDto(event: AuditEvent) {
  return {
    id: event.id,
    occurredAt: event.occurredAt,
    actorUserId: event.actorUserId,
    actorRole: event.actorRole,
    action: event.action,
    outcome: event.outcome,
    requestId: event.requestId,
    objectType: event.objectType,
    uploadObjectId: event.uploadObjectId,
    metadata: event.metadata,
  };
}

function verifyPassword(user: PortalUserRecord, password: string, pepper: string) {
  if (!user.passwordHashSha256) return false;
  const actual = hashPasswordWithPepper(password, pepper);
  return safeHashEqual(user.passwordHashSha256, actual);
}

function hashPasswordWithPepper(password: string, pepper: string) {
  return createHash("sha256").update(`${pepper}:${password}`).digest("hex");
}

function safeHashEqual(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function setCorsHeaders(request: IncomingMessage, response: ServerResponse, env: BackendEnv) {
  const origin = readSingleHeader(request.headers.origin);
  if (origin && isTrustedOrigin(env, origin)) {
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("access-control-allow-credentials", "true");
    response.setHeader("vary", "Origin");
  }
  response.setHeader("access-control-allow-methods", "GET,POST,PATCH,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type,x-csrf-token");
  response.setHeader("access-control-max-age", "600");
}

function trustedOriginsForRequest(env: BackendEnv, request: IncomingMessage) {
  const origin = readSingleHeader(request.headers.origin);
  const configured = env.trustedOrigins.length > 0 ? env.trustedOrigins : defaultDevelopmentOrigins();
  if (origin && isDevelopmentLocalOrigin(env, origin) && !configured.includes(origin)) {
    return [...configured, origin];
  }
  return configured;
}

function isTrustedOrigin(env: BackendEnv, origin: string) {
  return trustedOriginsForRequest(env, { headers: { origin } } as IncomingMessage).includes(origin);
}

function defaultDevelopmentOrigins() {
  return [
    "http://localhost:3000",
    "http://localhost:4100",
    "http://localhost:5175",
    "http://localhost:5183",
    "http://localhost:5184",
    "http://localhost:5185",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4100",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5183",
    "http://127.0.0.1:5184",
    "http://127.0.0.1:5185",
  ];
}

function isDevelopmentLocalOrigin(env: BackendEnv, origin: string) {
  if (env.nodeEnv !== "development") return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 64 * 1024) throw new SafeHttpError(413, "payload_too_large");
    chunks.push(buffer);
  }

  if (chunks.length === 0) throw new SafeHttpError(400, "missing_json_body");

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
  } catch {
    throw new SafeHttpError(400, "invalid_json_body");
  }
}

function assertObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SafeHttpError(400, "invalid_json_object");
  return value as Record<string, unknown>;
}

function readPublicContact(
  body: Record<string, unknown>,
  preferredChannel?: StoredPublicRequestDetails["contact"]["preferredChannel"],
): StoredPublicRequestDetails["contact"] {
  const name = readBoundedString(body.contactName, "contactName", 2, 120);
  const email = readOptionalBoundedString(body.contactEmail, "contactEmail", 0, 254);
  const phone = readOptionalBoundedString(body.contactPhone, "contactPhone", 0, 80);

  if (!email && !phone) throw new SafeHttpError(400, "contact_channel_required");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new SafeHttpError(400, "invalid_contactEmail");
  if (phone && !/^[+0-9][0-9\s/()-]{5,}$/.test(phone)) throw new SafeHttpError(400, "invalid_contactPhone");
  if (preferredChannel === "email" && !email) throw new SafeHttpError(400, "contact_email_required");
  if ((preferredChannel === "phone" || preferredChannel === "whatsapp") && !phone) {
    throw new SafeHttpError(400, "contact_phone_required");
  }

  return {
    name,
    email,
    phone,
    preferredChannel,
  };
}

function readRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) throw new SafeHttpError(400, `invalid_${field}`);
  return value.trim();
}

function readBoundedString(value: unknown, field: string, minLength: number, maxLength: number) {
  const normalized = normalizeWhitespace(readRequiredString(value, field));
  if (normalized.length < minLength || normalized.length > maxLength) throw new SafeHttpError(400, `invalid_${field}`);
  return normalized;
}

function readOptionalBoundedString(value: unknown, field: string, minLength: number, maxLength: number) {
  if (value === undefined || value === null || value === "") return undefined;
  return readBoundedString(value, field, minLength, maxLength);
}

function readRequiredBoolean(value: unknown, field: string) {
  if (typeof value !== "boolean") throw new SafeHttpError(400, `invalid_${field}`);
  return value;
}

function readPositiveInteger(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) throw new SafeHttpError(400, `invalid_${field}`);
  return value;
}

function readKnownValue<const Values extends Record<string, string>>(value: string, values: Values, field: string): Values[keyof Values] {
  if (!Object.prototype.hasOwnProperty.call(values, value)) throw new SafeHttpError(400, `invalid_${field}`);
  return values[value as keyof Values];
}

function readEnumValue<const Values extends readonly string[]>(value: unknown, values: Values, field: string): Values[number] {
  if (typeof value !== "string" || !(values as readonly string[]).includes(value)) throw new SafeHttpError(400, `invalid_${field}`);
  return value as Values[number];
}

function readOptionalEnumValue<const Values extends readonly string[]>(
  value: string | null,
  values: Values,
  field: string,
): Values[number] | undefined {
  if (value === null || value.length === 0 || value === "all") return undefined;
  return readEnumValue(value, values, field);
}

function readDateString(value: unknown, field: string) {
  const parsed = readRequiredString(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed)) throw new SafeHttpError(400, `invalid_${field}`);
  const [year, month, day] = parsed.split("-").map((part) => Number.parseInt(part, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new SafeHttpError(400, `invalid_${field}`);
  }
  return parsed;
}

function readCookie(header: string | undefined, name: string) {
  if (!header) return undefined;
  const encodedName = encodeURIComponent(name);
  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === encodedName) return decodeURIComponent(rawValue.join("="));
  }
  return undefined;
}

function readClientIp(request: IncomingMessage) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) return forwarded.split(",")[0]?.trim();
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0].split(",")[0]?.trim();
  return request.socket.remoteAddress;
}

function readSingleHeader(value: IncomingHttpHeaders[string]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  return `${Math.round(sizeBytes / 1024)} KB`;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(body));
}

function setStaffMvpBoundaryHeader(response: ServerResponse) {
  response.setHeader("x-sanipep-staff-boundary", staffMvpBoundary.mode);
}

class SafeHttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
