export type StaffStatus = "new" | "in_review" | "waiting_for_customer" | "completed" | "cancelled";
export type StaffRole = "staff" | "admin";

export type StaffSessionResponse = {
  authenticated: true;
  csrfToken: string;
  message?: string;
  mvpBoundary?: StaffMvpBoundary;
  session: {
    id: string;
    issuedAt: string;
    idleExpiresAt: string;
    absoluteExpiresAt: string;
    role: StaffRole;
  };
  profile: {
    staffUserId?: string;
    safeDisplayName: string;
    email: string;
  };
};

export type StaffUser = {
  userId: string;
  staffUserId?: string;
  email: string;
  role: StaffRole;
  status: "active" | "disabled";
  safeDisplayName: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  passwordChangedAt?: string;
  disabledAt?: string;
};

export type StaffMvpBoundary = {
  mode: "staff-request-mvp";
  productionReady: false;
  authBoundary: string;
  persistenceBoundary: string;
  roleBoundary: string;
};

export type PortalRequestDto = {
  id: string;
  kind: string;
  kindLabel: string;
  status: string;
  safeSummary: string;
  sensitivity: "contact" | "health" | "omnia_reference";
  staffReviewRequired: true;
  omniaWriteAllowed: false;
  staffStatus: StaffStatus;
  staffStatusLabel: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
};

export type StaffRequestListItem = {
  id: string;
  source: "public_website" | "portal";
  requestType: string;
  kind: string;
  kindLabel: string;
  status: string;
  staffStatus: StaffStatus;
  staffStatusLabel: string;
  safeSummary: string;
  sensitivity: "contact" | "health" | "omnia_reference";
  contactAvailable: boolean;
  preferredContactChannel?: string;
  staffReviewRequired: true;
  omniaWriteAllowed: false;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffAuditEvent = {
  id: string;
  occurredAt: string;
  actorUserId?: string;
  actorRole: "customer" | "staff" | "admin" | "system";
  action: string;
  outcome: "accepted" | "rejected" | "queued" | "blocked";
  requestId?: string;
  objectType?: string;
  uploadObjectId?: string;
  metadata: Record<string, string | number | boolean>;
};

export type StaffRequestMessage = {
  id: string;
  requestId: string;
  channel: "email";
  direction: "outbound";
  status: "sent" | "failed";
  to: string;
  fromAddress: string;
  fromName: string;
  subject: string;
  body: string;
  errorCode?: string;
  createdAt: string;
  sentAt?: string;
  failedAt?: string;
  actorUserId: string;
  actorStaffUserId?: string;
};

export type StaffMailConfig = {
  enabled: boolean;
  configured: boolean;
  fromAddress: string;
  fromName: string;
  recipientAvailable: boolean;
  disabledReason?: "mail_disabled" | "smtp_not_configured" | "recipient_email_missing";
  defaultSubject: string;
};

export type StaffRequestDetail = StaffRequestListItem & {
  publicRequest?: {
    requestType: "appointment" | "contact" | "care" | "document";
    contact?: {
      name: string;
      email?: string;
      phone?: string;
      preferredChannel?: string;
    };
    appointment?: Record<string, string | boolean>;
    contactInquiry?: Record<string, string | boolean>;
    care?: Record<string, string | boolean>;
    document?: {
      context: string;
      fileExtension: string;
      mimeType: string;
      sizeBytes: number;
      consentAccepted: true;
      uploadMode: "metadata-only-no-file-transfer";
    };
    boundary: {
      fileUploadIncluded: false;
      omniaWriteAllowed: false;
      staffReviewRequired: true;
    };
  };
  request: PortalRequestDto;
  communication: StaffRequestMessage[];
  mail: StaffMailConfig;
  auditEvents: StaffAuditEvent[];
};

export type StaffRequestsResponse = {
  mvpBoundary: StaffMvpBoundary;
  statusModel: Array<{
    value: StaffStatus;
    label: string;
  }>;
  requests: StaffRequestListItem[];
};

const backendBaseUrl = import.meta.env.VITE_PORTAL_BACKEND_URL ?? "";

export class StaffAdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const staffAdminApi = {
  async login(input: { email: string; password: string }) {
    return request<StaffSessionResponse>("/api/staff/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async session() {
    const response = await fetch(`${backendBaseUrl}/api/staff/session`, {
      credentials: "include",
    });
    if (response.status === 401 || response.status === 403) return null;
    return parseResponse<StaffSessionResponse>(response);
  },

  async logout(csrfToken: string) {
    return request<{ authenticated: false }>("/api/auth/logout", {
      method: "POST",
      csrfToken,
    });
  },

  async listRequests(status?: StaffStatus) {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<StaffRequestsResponse>(`/api/staff/requests${query}`);
  },

  async requestDetail(id: string) {
    return request<{ mvpBoundary: StaffMvpBoundary; request: StaffRequestDetail }>(`/api/staff/requests/${encodeURIComponent(id)}`);
  },

  async updateStatus(input: { requestId: string; status: StaffStatus }, csrfToken: string) {
    return request<{ request: PortalRequestDto }>(`/api/staff/requests/${encodeURIComponent(input.requestId)}/status`, {
      method: "PATCH",
      csrfToken,
      body: JSON.stringify({ status: input.status }),
    });
  },

  async listUsers() {
    return request<{ users: StaffUser[] }>("/api/staff/users");
  },

  async createUser(input: { email: string; safeDisplayName: string; role: StaffRole }, csrfToken: string) {
    return request<{ user: StaffUser; temporaryPassword: string }>("/api/staff/users", {
      method: "POST",
      csrfToken,
      body: JSON.stringify(input),
    });
  },

  async updateUser(input: { userId: string; email: string; safeDisplayName: string; role: StaffRole; status: StaffUser["status"] }, csrfToken: string) {
    return request<{ user: StaffUser }>(`/api/staff/users/${encodeURIComponent(input.userId)}`, {
      method: "PATCH",
      csrfToken,
      body: JSON.stringify({
        email: input.email,
        safeDisplayName: input.safeDisplayName,
        role: input.role,
        status: input.status,
      }),
    });
  },

  async resetUserPassword(userId: string, csrfToken: string) {
    return request<{ user: StaffUser; temporaryPassword: string }>(`/api/staff/users/${encodeURIComponent(userId)}/password-reset`, {
      method: "POST",
      csrfToken,
    });
  },

  async deactivateUser(userId: string, csrfToken: string) {
    return request<{ user: StaffUser }>(`/api/staff/users/${encodeURIComponent(userId)}/deactivate`, {
      method: "POST",
      csrfToken,
    });
  },

  async changeOwnPassword(input: { oldPassword: string; newPassword: string }, csrfToken: string) {
    return request<{ passwordChangedAt: string; sessionsInvalidated: boolean }>("/api/staff/me/password", {
      method: "POST",
      csrfToken,
      body: JSON.stringify(input),
    });
  },

  async sendEmailReply(input: { requestId: string; subject: string; body: string }, csrfToken: string) {
    return request<{ message: StaffRequestMessage; request: StaffRequestDetail }>(`/api/staff/requests/${encodeURIComponent(input.requestId)}/messages/email`, {
      method: "POST",
      csrfToken,
      body: JSON.stringify({
        subject: input.subject,
        body: input.body,
        confirmSend: true,
      }),
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

  const response = await fetch(`${backendBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload.error === "string" ? payload.error : `staff_admin_api_${response.status}`;
    throw new StaffAdminApiError(message, response.status);
  }
  return payload as T;
}
