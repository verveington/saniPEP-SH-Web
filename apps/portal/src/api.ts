export type PortalSessionResponse = {
  authenticated: true;
  csrfToken: string;
  message?: string;
  session: {
    id: string;
    issuedAt: string;
    idleExpiresAt: string;
    absoluteExpiresAt: string;
    role: "customer" | "staff" | "admin";
  };
  profile: {
    customerProfileId?: string;
    staffUserId?: string;
    safeDisplayName: string;
    email: string;
  };
};

export type UnauthenticatedResponse = {
  authenticated: false;
};

export type PortalRequestKind =
  | "prescription_upload"
  | "appointment_request"
  | "reorder_request"
  | "subscription_change_request"
  | "health_contact_request";

export type PortalRequestDto = {
  id: string;
  kind: PortalRequestKind;
  kindLabel: string;
  status: "draft" | "submitted" | "staff_review" | "approved" | "rejected" | "completed";
  safeSummary: string;
  sensitivity: "contact" | "health" | "omnia_reference";
  staffReviewRequired: true;
  omniaWriteAllowed: false;
  employeeStatus: "queued" | "in_review";
  employeeStatusLabel: string;
  submittedAt: string;
  createdAt: string;
  uploadObject?: {
    id: string;
    extension: string;
    mimeType: string;
    sizeBytes: number;
    storageMode: "metadata-only-no-file-content";
    productionUpload: false;
  };
  appointmentWish?: {
    preferredDay: string;
    timeWindow: "vormittag" | "mittag" | "nachmittag";
    concern: "kompression" | "rezept" | "versorgungskontrolle";
  };
  reorderWish?: {
    supplyAlias: "kompressionsversorgung" | "inkontinenzmaterial" | "bandage";
    cadence: "einmalig" | "regelmaessig-pruefen";
  };
  subscriptionWish?: {
    supplyAlias: "kompressionsversorgung" | "inkontinenzmaterial" | "bandage";
    cadence: "monatlich" | "quartalsweise" | "halbjaehrlich";
  };
  contactWish?: {
    topic: "rueckfrage" | "beratung" | "unterlagen";
    preferredChannel: "telefon" | "email";
  };
  auditIds: string[];
};

export type PortalAuditEventDto = {
  id: string;
  occurredAt: string;
  actorRole: "customer" | "staff" | "admin" | "system";
  action: string;
  outcome: "accepted" | "rejected" | "queued" | "blocked";
  requestId?: string;
  objectType?: string;
  metadata: Record<string, string | number | boolean>;
};

export type PortalDashboardResponse = {
  profile: {
    customerProfileId: string;
    safeDisplayName: string;
    portalMode: "development-mvp";
  };
  summary: {
    openRequests: number;
    completedRequests: number;
    rejectedRequests: number;
    storedRequests: number;
    staffReviewRequired: number;
    omniaWrites: 0;
    auditEvents: number;
  };
  requests: PortalRequestDto[];
  auditEvents: PortalAuditEventDto[];
  latestActivities: PortalAuditEventDto[];
  boundaries: string[];
};

export type CreatePortalRequestInput =
  | {
      kind: "prescription_upload";
      context: "compression" | "aid" | "followup";
      fileExtension: string;
      mimeType: string;
      sizeBytes: number;
      consentAccepted: boolean;
    }
  | {
      kind: "appointment_request";
      preferredDay: string;
      timeWindow: "vormittag" | "mittag" | "nachmittag";
      concern: "kompression" | "rezept" | "versorgungskontrolle";
    }
  | {
      kind: "reorder_request";
      supplyAlias: "kompressionsversorgung" | "inkontinenzmaterial" | "bandage";
      cadence: "einmalig" | "regelmaessig-pruefen";
    }
  | {
      kind: "subscription_change_request";
      supplyAlias: "kompressionsversorgung" | "inkontinenzmaterial" | "bandage";
      cadence: "monatlich" | "quartalsweise" | "halbjaehrlich";
    }
  | {
      kind: "health_contact_request";
      topic: "rueckfrage" | "beratung" | "unterlagen";
      preferredChannel: "telefon" | "email";
    };

export type CreatePortalRequestResponse = {
  request: PortalRequestDto;
  dashboard: PortalDashboardResponse;
};

const portalBackendBaseUrl = import.meta.env.VITE_PORTAL_BACKEND_URL ?? "http://localhost:4100";

export class PortalApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const portalApi = {
  async login(input: { email: string; password: string }) {
    return request<PortalSessionResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async session() {
    const response = await fetch(`${portalBackendBaseUrl}/api/auth/session`, {
      credentials: "include",
    });
    if (response.status === 401) return { authenticated: false } satisfies UnauthenticatedResponse;
    return parseResponse<PortalSessionResponse>(response);
  },

  async logout(csrfToken: string) {
    return request<UnauthenticatedResponse>("/api/auth/logout", {
      method: "POST",
      csrfToken,
    });
  },

  async dashboard() {
    return request<PortalDashboardResponse>("/api/portal/dashboard");
  },

  async createRequest(input: CreatePortalRequestInput, csrfToken: string) {
    return request<CreatePortalRequestResponse>("/api/portal/requests", {
      method: "POST",
      csrfToken,
      body: JSON.stringify(input),
    });
  },

  async updateRequestStatus(input: { requestId: string; status: PortalRequestDto["status"] }, csrfToken: string) {
    return request<{ request: PortalRequestDto }>(`/api/staff/requests/${input.requestId}/status`, {
      method: "PATCH",
      csrfToken,
      body: JSON.stringify({ status: input.status }),
    });
  },
};

async function request<T>(
  path: string,
  init: RequestInit & { csrfToken?: string } = {},
) {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");
  if (init.csrfToken) headers.set("x-csrf-token", init.csrfToken);

  const response = await fetch(`${portalBackendBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload.error === "string" ? payload.error : `portal_api_${response.status}`;
    throw new PortalApiError(message, response.status);
  }
  return payload as T;
}
