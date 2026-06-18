import { createHash, randomUUID } from "node:crypto";
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import { createAuditEvent } from "./audit/auditEvent.js";
import type { AuditEvent } from "./audit/models.js";
import type { Session } from "./auth/models.js";
import { createSession, hashToken, isSessionActive } from "./auth/sessions.js";
import type { BackendEnv } from "./config/env.js";
import type { PortalRequestKind, PortalRequestSensitivity, PortalRequestStatus } from "./portalRequests/models.js";
import {
  createFilePortalMvpRepository,
  type PortalMvpRepository,
  type PortalSessionRecord,
  type PortalUserRecord,
  type StoredAppointmentWish,
  type StoredContactWish,
  type StoredPortalRequest,
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
  queued: "Wartet auf Mitarbeiterpruefung",
  in_review: "In Mitarbeiterpruefung",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  completed: "Abgeschlossen",
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

export function createBackendRequestHandler(env: BackendEnv, dependencies: BackendRequestHandlerDependencies = {}) {
  const rateLimiter = dependencies.rateLimiter ?? createAllowAllRateLimiter();
  const repository = dependencies.repository ?? createFilePortalMvpRepository(env.portalDevStorePath);

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
        const ready = Boolean(env.databaseUrl && env.redisUrl && env.avScannerMode !== "stub-disabled");
        writeJson(response, ready ? 200 : 503, {
          status: ready ? "ready" : "not_ready",
          checks: {
            databaseConfigured: Boolean(env.databaseUrl),
            redisConfigured: Boolean(env.redisUrl),
            avScannerConfigured: env.avScannerMode !== "stub-disabled",
            quarantineBucketConfigured: Boolean(env.uploadQuarantineBucket),
            cleanBucketConfigured: Boolean(env.uploadCleanBucket),
            developmentRepository: "file",
          },
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/auth/login") {
        await handleLogin(request, response, env, repository);
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

      if (request.method === "GET" && url.pathname === "/api/staff/requests") {
        const auth = await requireRole(request, response, env, repository, ["staff", "admin"]);
        if (!auth) return;
        writeJson(response, 200, await buildStaffRequestsResponse(auth, repository, readStaffFilters(url.searchParams)));
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

type StaffRequestFilters = {
  status?: PortalRequestStatus;
  kind?: PortalRequestKind;
};

async function handleLogin(
  request: IncomingMessage,
  response: ServerResponse,
  env: BackendEnv,
  repository: PortalMvpRepository,
) {
  const body = assertObject(await readJsonBody<unknown>(request));
  const email = readRequiredString(body.email, "email").toLowerCase();
  const password = readRequiredString(body.password, "password");
  const user = await repository.findUserByEmail(email);
  const passwordOk = user?.status === "active" && verifyDevelopmentPassword(user, password, env.passwordPepper);

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
      assurance: "password-session",
    },
  });

  response.setHeader("set-cookie", serializeSessionCookie(rawSessionToken, env, user.role !== "customer"));
  writeJson(response, 200, {
    ...buildSessionResponse({
      actor: actorFromUser(user),
      user,
      sessionRecord,
    }),
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

async function updateRequestStatus(
  requestId: string,
  body: Record<string, unknown>,
  auth: AuthenticatedSession,
  env: BackendEnv,
  repository: PortalMvpRepository,
) {
  const nextStatus = readEnumValue(
    body.status,
    ["draft", "submitted", "staff_review", "approved", "rejected", "completed"] as const,
    "status",
  );
  const existing = await repository.getRequestById(requestId);
  if (!existing) throw new SafeHttpError(404, "portal_request_not_found");
  if (!allowedTransitions[existing.status].includes(nextStatus)) {
    throw new SafeHttpError(409, "invalid_status_transition");
  }

  const now = new Date().toISOString();
  const updated: StoredPortalRequest = {
    ...existing,
    status: nextStatus,
    employeeStatus: employeeStatusForStatus(nextStatus),
    employeeStatusLabel: employeeStatusLabels[employeeStatusForStatus(nextStatus)],
    submittedAt: existing.submittedAt ?? (nextStatus === "submitted" ? now : undefined),
    reviewedByStaffUserId: auth.actor.staffUserId ?? existing.reviewedByStaffUserId,
    reviewedAt: ["staff_review", "approved", "rejected"].includes(nextStatus) ? now : existing.reviewedAt,
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
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "completed") return "completed";
  return "queued";
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

function toAuditDto(event: AuditEvent) {
  return {
    id: event.id,
    occurredAt: event.occurredAt,
    actorRole: event.actorRole,
    action: event.action,
    outcome: event.outcome,
    requestId: event.requestId,
    objectType: event.objectType,
    metadata: event.metadata,
  };
}

function verifyDevelopmentPassword(user: PortalUserRecord, password: string, pepper: string) {
  const expected = createHash("sha256").update(`${pepper}:${user.developmentPassword}`).digest("hex");
  const actual = createHash("sha256").update(`${pepper}:${password}`).digest("hex");
  return expected === actual;
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

function readRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) throw new SafeHttpError(400, `invalid_${field}`);
  return value.trim();
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

function writeJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(body));
}

class SafeHttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
