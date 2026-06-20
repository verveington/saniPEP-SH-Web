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
  developmentPassword: string;
  customerProfileId?: string;
  staffUserId?: string;
  safeDisplayName: string;
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
  requestType: "appointment" | "contact" | "care";
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
  saveSession(record: PortalSessionRecord): Promise<void>;
  findSessionByTokenHash(tokenHash: string): Promise<PortalSessionRecord | null>;
  deleteSession(tokenHash: string): Promise<void>;
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
  seedDevelopmentUsers?: boolean;
};

export function createFilePortalMvpRepository(
  filePath: string,
  options: FilePortalMvpRepositoryOptions = {},
): PortalMvpRepository {
  const seedDevelopmentUsers = options.seedDevelopmentUsers ?? false;
  let writeQueue = Promise.resolve();

  const withStore = async <T>(mutator: (data: PortalMvpStoreData) => T | Promise<T>) => {
    const operation = writeQueue.then(async () => {
      const data = await readStore(filePath, seedDevelopmentUsers);
      const result = await mutator(data);
      await writeStore(filePath, data);
      return result;
    });
    writeQueue = operation.then(() => undefined, () => undefined);
    return operation;
  };

  return {
    async findUserByEmail(email) {
      const data = await readStore(filePath, seedDevelopmentUsers);
      return data.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
    },

    async findUserById(userId) {
      const data = await readStore(filePath, seedDevelopmentUsers);
      return data.users.find((user) => user.userId === userId) ?? null;
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
      const data = await readStore(filePath, seedDevelopmentUsers);
      return data.sessions.find((record) => record.session.tokenHash === tokenHash) ?? null;
    },

    async deleteSession(tokenHash) {
      await withStore((data) => {
        data.sessions = data.sessions.filter((record) => record.session.tokenHash !== tokenHash);
      });
    },

    async listAllRequests() {
      const data = await readStore(filePath, seedDevelopmentUsers);
      return data.requests;
    },

    async listRequestsForCustomer(customerProfileId) {
      const data = await readStore(filePath, seedDevelopmentUsers);
      return data.requests.filter((request) => request.customerProfileId === customerProfileId);
    },

    async listRequestsForStaff(input = {}) {
      const data = await readStore(filePath, seedDevelopmentUsers);
      const requests = input.status
        ? data.requests.filter((request) => normalizeStaffRequestStatus(request.employeeStatus) === input.status)
        : data.requests;
      return requests
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, input.limit ?? 100);
    },

    async getRequestById(id) {
      const data = await readStore(filePath, seedDevelopmentUsers);
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
      const data = await readStore(filePath, seedDevelopmentUsers);
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

async function readStore(filePath: string, seedDevelopmentUsers: boolean): Promise<PortalMvpStoreData> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<PortalMvpStoreData>;
    if (parsed.schemaVersion !== 1) return initialStore(seedDevelopmentUsers);
    return {
      schemaVersion: 1,
      users: parsed.users ?? initialUsers(seedDevelopmentUsers),
      sessions: parsed.sessions ?? [],
      requests: parsed.requests ?? [],
      auditEvents: parsed.auditEvents ?? [],
    };
  } catch (error) {
    if (isMissingFile(error)) return initialStore(seedDevelopmentUsers);
    throw error;
  }
}

async function writeStore(filePath: string, data: PortalMvpStoreData) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

function initialStore(seedDevelopmentUsers: boolean): PortalMvpStoreData {
  return {
    schemaVersion: 1,
    users: initialUsers(seedDevelopmentUsers),
    sessions: [],
    requests: [],
    auditEvents: [],
  };
}

function initialUsers(seedDevelopmentUsers: boolean): PortalUserRecord[] {
  if (!seedDevelopmentUsers) return [];

  return [
    {
      userId: "usr_demo_customer",
      email: "demo@example.test",
      role: "customer",
      status: "active",
      developmentPassword: "demo-passwort",
      customerProfileId: "cst_demo_portal",
      safeDisplayName: "Demo-Kundenkonto",
    },
    {
      userId: "usr_demo_staff",
      email: "staff@example.test",
      role: "staff",
      status: "active",
      developmentPassword: "staff-passwort",
      staffUserId: "staff_demo",
      safeDisplayName: "Demo-Mitarbeiter",
    },
    {
      userId: "usr_demo_admin",
      email: "admin@example.test",
      role: "admin",
      status: "active",
      developmentPassword: "admin-passwort",
      staffUserId: "admin_demo",
      safeDisplayName: "Demo-Admin",
    },
  ];
}

function isMissingFile(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
