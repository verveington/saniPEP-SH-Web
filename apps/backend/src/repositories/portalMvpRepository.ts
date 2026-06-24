import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AuditEvent } from "../audit/models.js";
import type { Session } from "../auth/models.js";
import type { PortalRequestKind, PortalRequestSensitivity, PortalRequestStatus } from "../portalRequests/models.js";
import type { UserRole } from "../users/models.js";

export type PortalSessionRecord = {
  session: Session;
  rawCsrfToken: string;
};

export type PortalUserRecord = {
  userId: string;
  email: string;
  role: UserRole;
  status: "active" | "disabled";
  passwordHashSha256: string;
  customerProfileId?: string;
  staffUserId?: string;
  safeDisplayName: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  passwordChangedAt?: string;
  disabledAt?: string;
};

export type StoredRequestMessage = {
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

export type StoredUploadObject = {
  id: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  storageMode: "metadata-only-no-file-content";
  productionUpload: false;
};

export type StoredAppointmentWish = {
  preferredDay: string;
  timeWindow: "vormittag" | "mittag" | "nachmittag";
  concern: "kompression" | "rezept" | "versorgungskontrolle";
};

export type StoredReorderWish = {
  supplyAlias: "kompressionsversorgung" | "inkontinenzmaterial" | "bandage";
  cadence: "einmalig" | "regelmaessig-pruefen";
};

export type StoredSubscriptionWish = {
  supplyAlias: "kompressionsversorgung" | "inkontinenzmaterial" | "bandage";
  cadence: "monatlich" | "quartalsweise" | "halbjaehrlich";
};

export type StoredContactWish = {
  topic: "rueckfrage" | "beratung" | "unterlagen";
  preferredChannel: "telefon" | "email";
};

export type StaffRequestStatus = "new" | "in_review" | "waiting_for_customer" | "completed" | "cancelled";

export type StoredPublicRequestDetails = {
  source: "public_website";
  requestType: "appointment" | "contact" | "care" | "document";
  contact: {
    name: string;
    email?: string;
    phone?: string;
    preferredChannel?: "email" | "phone" | "whatsapp";
  };
  appointment?: {
    concern: string;
    preferredDate: string;
    preferredWindow: string;
    hasPrescription: boolean;
    shortQuestionnaire: string;
  };
  contactInquiry?: {
    topic: string;
    serviceContext: string;
    message: string;
    containsHealthData: boolean;
  };
  care?: {
    need: string;
    rhythm: string;
    hasPrescription: boolean;
    note: string;
  };
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

export type StoredPortalRequest = {
  id: string;
  customerProfileId: string;
  createdByUserId: string;
  kind: PortalRequestKind;
  status: PortalRequestStatus;
  sensitivity: PortalRequestSensitivity;
  safeSummary: string;
  staffReviewRequired: true;
  omniaWriteAllowed: false;
  employeeStatus:
    | StaffRequestStatus
    | "queued"
    | "approved"
    | "rejected";
  employeeStatusLabel: string;
  uploadObject?: StoredUploadObject;
  appointmentWish?: StoredAppointmentWish;
  reorderWish?: StoredReorderWish;
  subscriptionWish?: StoredSubscriptionWish;
  contactWish?: StoredContactWish;
  publicRequest?: StoredPublicRequestDetails;
  auditIds: string[];
  communication: StoredRequestMessage[];
  submittedAt?: string;
  reviewedByStaffUserId?: string;
  reviewedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PortalMvpStoreData = {
  schemaVersion: 1;
  users: PortalUserRecord[];
  sessions: PortalSessionRecord[];
  requests: StoredPortalRequest[];
  auditEvents: AuditEvent[];
};

export type PortalMvpRepository = {
  findUserByEmail(email: string): Promise<PortalUserRecord | null>;
  findUserById(userId: string): Promise<PortalUserRecord | null>;
  listStaffUsers(): Promise<PortalUserRecord[]>;
  saveUser(user: PortalUserRecord): Promise<void>;
  saveSession(record: PortalSessionRecord): Promise<void>;
  findSessionByTokenHash(tokenHash: string): Promise<PortalSessionRecord | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteSessionsForUser(userId: string): Promise<void>;
  listAllRequests(): Promise<StoredPortalRequest[]>;
  listRequestsForCustomer(customerProfileId: string): Promise<StoredPortalRequest[]>;
  listRequestsForStaff(input?: { status?: StaffRequestStatus; limit?: number }): Promise<StoredPortalRequest[]>;
  getRequestById(id: string): Promise<StoredPortalRequest | null>;
  saveRequest(request: StoredPortalRequest): Promise<void>;
  updateRequest(request: StoredPortalRequest): Promise<void>;
  appendAudit(event: AuditEvent): Promise<AuditEvent>;
  appendAuditMany(events: AuditEvent[]): Promise<AuditEvent[]>;
  listAuditEventsFor(input: { actorUserId?: string; requestIds: string[]; limit: number }): Promise<AuditEvent[]>;
};

export type FilePortalMvpRepositoryOptions = {
  developmentUsers?: PortalUserRecord[];
};

export function createFilePortalMvpRepository(
  filePath: string,
  options: FilePortalMvpRepositoryOptions = {},
): PortalMvpRepository {
  const developmentUsers = options.developmentUsers ?? [];
  let writeQueue = Promise.resolve();

  const withStore = async <T>(mutator: (data: PortalMvpStoreData) => T | Promise<T>) => {
    const operation = writeQueue.then(async () => {
      const data = await readStore(filePath, developmentUsers);
      const result = await mutator(data);
      await writeStore(filePath, data);
      return result;
    });
    writeQueue = operation.then(() => undefined, () => undefined);
    return operation;
  };

  return {
    async findUserByEmail(email) {
      const data = await readStore(filePath, developmentUsers);
      return data.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
    },

    async findUserById(userId) {
      const data = await readStore(filePath, developmentUsers);
      return data.users.find((user) => user.userId === userId) ?? null;
    },

    async listStaffUsers() {
      const data = await readStore(filePath, developmentUsers);
      return data.users
        .filter((user) => user.role === "staff" || user.role === "admin")
        .sort((a, b) => a.email.localeCompare(b.email));
    },

    async saveUser(user) {
      await withStore((data) => {
        const existingByEmail = data.users.find(
          (item) => item.email.toLowerCase() === user.email.toLowerCase() && item.userId !== user.userId,
        );
        if (existingByEmail) throw new Error(`Portal user email ${user.email} already exists.`);
        const existingIndex = data.users.findIndex((item) => item.userId === user.userId);
        if (existingIndex >= 0) {
          data.users[existingIndex] = user;
          return;
        }
        data.users.push(user);
      });
    },

    async saveSession(record) {
      await withStore((data) => {
        data.sessions = [
          ...data.sessions.filter((item) => item.session.tokenHash !== record.session.tokenHash),
          record,
        ];
      });
    },

    async findSessionByTokenHash(tokenHash) {
      const data = await readStore(filePath, developmentUsers);
      return data.sessions.find((record) => record.session.tokenHash === tokenHash) ?? null;
    },

    async deleteSession(tokenHash) {
      await withStore((data) => {
        data.sessions = data.sessions.filter((record) => record.session.tokenHash !== tokenHash);
      });
    },

    async deleteSessionsForUser(userId) {
      await withStore((data) => {
        data.sessions = data.sessions.filter((record) => record.session.userId !== userId);
      });
    },

    async listAllRequests() {
      const data = await readStore(filePath, developmentUsers);
      return data.requests;
    },

    async listRequestsForCustomer(customerProfileId) {
      const data = await readStore(filePath, developmentUsers);
      return data.requests.filter((request) => request.customerProfileId === customerProfileId);
    },

    async listRequestsForStaff(input = {}) {
      const data = await readStore(filePath, developmentUsers);
      const requests = input.status
        ? data.requests.filter((request) => normalizeStaffRequestStatus(request.employeeStatus) === input.status)
        : data.requests;
      return requests
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, input.limit ?? 100);
    },

    async getRequestById(id) {
      const data = await readStore(filePath, developmentUsers);
      return data.requests.find((request) => request.id === id) ?? null;
    },

    async saveRequest(request) {
      await withStore((data) => {
        if (data.requests.some((item) => item.id === request.id)) {
          throw new Error(`Portal request ${request.id} already exists.`);
        }
        data.requests.push(request);
      });
    },

    async updateRequest(request) {
      await withStore((data) => {
        data.requests = data.requests.map((item) => (item.id === request.id ? request : item));
      });
    },

    async appendAudit(event) {
      await withStore((data) => {
        data.auditEvents.push(event);
      });
      return event;
    },

    async appendAuditMany(events) {
      await withStore((data) => {
        data.auditEvents.push(...events);
      });
      return events;
    },

    async listAuditEventsFor(input) {
      const data = await readStore(filePath, developmentUsers);
      const requestIds = new Set(input.requestIds);
      return data.auditEvents
        .filter((event) => event.actorUserId === input.actorUserId || (event.requestId && requestIds.has(event.requestId)))
        .slice(-input.limit)
        .reverse();
    },
  };
}

export function normalizeStaffRequestStatus(status: StoredPortalRequest["employeeStatus"]): StaffRequestStatus {
  if (status === "queued") return "new";
  if (status === "approved") return "in_review";
  if (status === "rejected") return "cancelled";
  return status;
}

async function readStore(filePath: string, developmentUsers: PortalUserRecord[]): Promise<PortalMvpStoreData> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<PortalMvpStoreData>;
    if (parsed.schemaVersion !== 1) return initialStore(developmentUsers);
    return {
      schemaVersion: 1,
      users: mergeDevelopmentUsers(parsed.users ?? [], developmentUsers),
      sessions: parsed.sessions ?? [],
      requests: parsed.requests ?? [],
      auditEvents: parsed.auditEvents ?? [],
    };
  } catch (error) {
    if (isMissingFile(error)) return initialStore(developmentUsers);
    throw error;
  }
}

async function writeStore(filePath: string, data: PortalMvpStoreData) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

function initialStore(developmentUsers: PortalUserRecord[]): PortalMvpStoreData {
  return {
    schemaVersion: 1,
    users: initialUsers(developmentUsers),
    sessions: [],
    requests: [],
    auditEvents: [],
  };
}

function initialUsers(developmentUsers: PortalUserRecord[]): PortalUserRecord[] {
  return [...developmentUsers];
}

function mergeDevelopmentUsers(storedUsers: PortalUserRecord[], developmentUsers: PortalUserRecord[]) {
  if (developmentUsers.length === 0) return storedUsers;

  const merged = new Map<string, PortalUserRecord>();
  for (const user of storedUsers) {
    merged.set(user.email.toLowerCase(), user);
  }
  for (const user of developmentUsers) {
    merged.set(user.email.toLowerCase(), user);
  }
  return [...merged.values()];
}

function isMissingFile(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
