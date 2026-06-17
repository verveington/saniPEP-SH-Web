export type PortalRole = "customer" | "staff" | "admin";

export type PortalAuthMethod =
  | "one-time-password"
  | "password"
  | "magic-link";

export type PortalActor = {
  id: string;
  role: PortalRole;
  customerId?: string;
  staffId?: string;
};

export type PortalSession = {
  sessionId: string;
  actor: PortalActor;
  issuedAt: string;
  expiresAt: string;
  authMethod: PortalAuthMethod;
  assuranceLevel: "activation" | "password-session" | "staff-session";
};

export type OneTimePasswordRecord = {
  id: string;
  customerId: string;
  codeHash: string;
  issuedAt: string;
  expiresAt: string;
  delivery: "letter" | "handover";
  consumedAt?: string;
  failedAttempts: number;
};

export type PortalCredentialsRecord = {
  customerId: string;
  email: string;
  passwordHash: string;
  passwordSetAt: string;
  disabledAt?: string;
};

export type PortalRequestKind =
  | "prescription-upload"
  | "reorder-request"
  | "subscription-change-request"
  | "appointment-request"
  | "health-contact-request";

export type PortalRequestStatus =
  | "submitted"
  | "quarantined"
  | "employee-review"
  | "needs-customer-input"
  | "approved-for-omnia-preparation"
  | "rejected"
  | "closed";

export type PortalRequestEnvelope = {
  requestId: string;
  kind: PortalRequestKind;
  customerId: string;
  createdBy: PortalActor;
  createdAt: string;
  status: PortalRequestStatus;
  staffReviewRequired: true;
  omniaWriteAllowed: false;
  sensitivity: "contact" | "health" | "omnia-master";
  safeSummary: string;
  uploadId?: string;
  auditIds: string[];
};

export type AuditEvent = {
  auditId: string;
  at: string;
  actorId: string;
  actorRole: PortalRole | "system";
  action: string;
  requestId?: string;
  uploadId?: string;
  outcome: "accepted" | "rejected" | "queued" | "blocked";
  metadata: Record<string, string | number | boolean>;
};

export type AuditLogSink = {
  append(event: AuditEvent): Promise<void>;
};

export type UploadPurpose =
  | "prescription"
  | "care-document"
  | "staff-requested-document";

export type UploadIntakeCandidate = {
  originalFileName: string;
  declaredMimeType?: string;
  sizeBytes: number;
  firstBytes: Uint8Array;
  body: AsyncIterable<Uint8Array>;
  purpose: UploadPurpose;
  customerId?: string;
  submittedBy: PortalActor;
  consentVersion: string;
  consentScopes: string[];
};

export type UploadValidationResult = {
  valid: boolean;
  detectedMimeType?: string;
  normalizedExtension?: string;
  errors: string[];
};

export type QuarantineObject = {
  uploadId: string;
  storageKey: string;
  sha256: string;
  sizeBytes: number;
};

export type AntivirusScanResult = {
  status: "clean" | "infected" | "error" | "pending";
  scanner: string;
  scannedAt?: string;
  signatureVersion?: string;
};

export type UploadIntakeResult = {
  uploadId: string;
  requestId: string;
  quarantine: QuarantineObject;
  validation: UploadValidationResult;
  antivirus: AntivirusScanResult;
  acceptedForStaffReview: boolean;
};

export type OmniaStatusSnapshot = {
  customerId: string;
  safeDisplayName: string;
  prescriptions: Array<{
    id: string;
    title: string;
    status: string;
    expiresAt?: string;
  }>;
  supplies: Array<{
    id: string;
    name: string;
    status: string;
    nextAction: string;
  }>;
  mirroredAt: string;
};

export type ReviewedOmniaChange = {
  requestId: string;
  preparedBy: PortalActor;
  preparedAt: string;
  changeKind: "status-note" | "order-preparation" | "appointment-note" | "master-data-review";
  payloadReference: string;
  finalWriteRequiresHumanInOmnia: true;
};
