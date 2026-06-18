import type { SharedIconName } from "../../../shared/icons/iconRegistry";

export type Route =
  | "/"
  | "/hilfe-finden"
  | "/lymphoedem-lipoedem-narbenkompression"
  | "/brustprothetik"
  | "/bandagen-orthesen-reha-stoma"
  | "/inkontinenz-pflegehilfsmittel"
  | "/rezept-upload"
  | "/termin-anfragen"
  | "/kontakt"
  | "/impressum"
  | "/datenschutz"
  | "/einwilligung"
  | "/portal/login"
  | "/portal"
  | "/admin/requests"
  | "/admin/integrations"
  | "/admin/design-lab";

export type ServicePriority = "primary" | "secondary" | "automated";

export type ContentIconName = SharedIconName;

export type SearchCategory = "symptom" | "product" | "situation";

export type SearchIntentResult = {
  id: string;
  category: SearchCategory;
  term: string;
  title: string;
  summary: string;
  recommendedRoute: Route;
  primaryAction: "appointment" | "upload" | "configure" | "portal" | "inquiry";
  relatedTerms: string[];
  priority: number;
  score: number;
};

export type ServiceArea = {
  id: string;
  title: string;
  summary: string;
  route: Route;
  priority: ServicePriority;
  intent: string;
  icon: ContentIconName;
  searchSignals: string[];
};

export type RouteAudience = "public" | "portal" | "admin";

export type ConversionGoal =
  | "appointment"
  | "upload"
  | "contact"
  | "portal_login";

export type RouteMetadata = {
  title: string;
  description: string;
  canonicalPath: Route;
  audience: RouteAudience;
  primaryConversion: ConversionGoal;
  robots: "index,follow" | "noindex,nofollow";
  strapiUid?: string;
};

export type ConversionStage = "route-view" | "cta-click" | "form-start" | "request-submitted";

export type ConversionEvent = {
  id: string;
  stage: ConversionStage;
  goal: ConversionGoal;
  at: string;
  source: "public-website";
};

export type ConversionSummary = {
  total: number;
  byGoal: Array<{
    goal: ConversionGoal;
    count: number;
  }>;
  byStage: Array<{
    stage: ConversionStage;
    count: number;
  }>;
  requestSubmissions: number;
  privacyBoundary: string;
};

export type RequestStatus =
  | "draft"
  | "submitted"
  | "employee-review"
  | "omnia-prepared"
  | "confirmed"
  | "delivery"
  | "closed";

export type ReviewStatus = "neu" | "in_pruefung" | "rueckfrage" | "freigegeben";

export type EmployeeReviewAction =
  | "start-review"
  | "request-info"
  | "prepare-omnia"
  | "approve"
  | "close";

export type DataSensitivity = "public" | "contact" | "health" | "omnia-master";

export type UserRole = "anonymous" | "portal-customer" | "employee" | "admin" | "system";

export type ConsentScope =
  | "contact-processing"
  | "health-data-processing"
  | "prescription-upload"
  | "portal-request"
  | "calendar-hold";

export type UploadStorageTarget = "secure-upload-api" | "quarantine-bucket" | "employee-review-inbox";

export type RoleCapability = {
  role: UserRole;
  canReadPublicContent: boolean;
  canReadPortalStatus: boolean;
  canCreateRequest: boolean;
  canReviewRequest: boolean;
  canPrepareOmniaChange: boolean;
  canWriteOmniaDirectly: boolean;
  note: string;
};

export type UploadPolicy = {
  id: string;
  label: string;
  acceptedFileTypes: string[];
  maxFileSizeMb: number;
  storageTarget: UploadStorageTarget;
  consentScopes: ConsentScope[];
  encryptionRequired: boolean;
  antivirusScanRequired: boolean;
  localPersistence: "none" | "metadata-only";
  retentionHint: string;
  publicCopy: string;
};

export type UploadEnvelope = {
  uploadId: string;
  fileName: string;
  context: string;
  sensitivity: DataSensitivity;
  policy: UploadPolicy;
  staffReviewRequired: true;
  localPersistence: "none";
  createdAt: string;
};

export type PortalActionIntent =
  | "upload-prescription"
  | "request-appointment"
  | "request-reorder"
  | "request-contact-check"
  | "submit-document"
  | "send-written-inquiry"
  | "configure-care-supply"
  | "direct-update-omnia-master-data"
  | "direct-change-supply"
  | "final-order-submit"
  | "edit-prescription-data";

export type ActionPolicyDecision = {
  intent: PortalActionIntent;
  label: string;
  allowed: boolean;
  executionMode: "request" | "read-only" | "blocked";
  staffReviewRequired: boolean;
  omniaWriteAllowed: boolean;
  auditRequired: boolean;
  dataSensitivity: DataSensitivity;
  reason: string;
};

export type Prescription = {
  id: string;
  title: string;
  receivedAt: string;
  expiresAt: string;
  status: RequestStatus;
  employeeReview: ReviewStatus;
  hiddenDetails: string;
};

export type Supply = {
  id: string;
  name: string;
  category: string;
  nextAction: string;
  nextDate: string;
  status: RequestStatus;
  canRequestChange: boolean;
};

export type PortalRequest = {
  id: string;
  type:
    | "prescription-upload"
    | "appointment"
    | "reorder"
    | "contact-check"
    | "document"
    | "written-inquiry"
    | "care-configuration";
  title: string;
  createdAt: string;
  status: RequestStatus;
  employeeReview: ReviewStatus;
  publicSummary: string;
  safeCategory?: string;
  requestedChannel?: "email" | "phone" | "whatsapp" | "portal";
  policyIntent?: PortalActionIntent;
};

export type AuditEvent = {
  id: string;
  at: string;
  actor: "customer" | "employee" | "system";
  action: string;
  requestId?: string;
};

export type PortalCustomer = {
  id: string;
  displayName: string;
  email: string;
  verification: "one-time-password-set" | "password-created";
};

export type PortalAuthMethod = "one-time-password" | "email-password" | "magic-link" | "two-factor";

export type PortalActivationInput = {
  email: string;
  oneTimePassword: string;
  newPassword: string;
  confirmPassword: string;
  supportingLastName?: string;
  supportingBirthDate?: string;
};

export type PortalLoginInput = {
  email: string;
  password: string;
};

export type PortalAuthResult = {
  ok: boolean;
  method: PortalAuthMethod;
  customerId?: string;
  message: string;
  nextStep: "set-password" | "enter-portal" | "retry" | "future-method";
  auditLabel: string;
};

export type PortalDashboard = {
  customer: PortalCustomer;
  prescriptions: Prescription[];
  supplies: Supply[];
  requests: PortalRequest[];
  audit: AuditEvent[];
};

export type AppointmentRequestInput = {
  concern: string;
  preferredDate: string;
  preferredWindow: string;
  hasPrescription: boolean;
  shortQuestionnaire: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

export type UploadInput = {
  fileName: string;
  fileType?: string;
  fileSizeBytes?: number;
  context: string;
  patientNote?: string;
  consentScopes?: ConsentScope[];
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  fieldErrors: Record<string, string>;
};

export type ContactInquiryInput = {
  topic: string;
  serviceContext: string;
  message: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  preferredContactChannel: "email" | "phone" | "whatsapp";
  containsHealthData: boolean;
};

export type ReorderRequestInput = {
  supplyId: string;
  supplyName: string;
  rhythm: string;
  deliveryPreference: string;
  note?: string;
};

export type CareConfigurationInput = {
  need: string;
  rhythm: string;
  hasPrescription: boolean;
  note: string;
};

export type CalendarIntegrationTarget = "nextcloud-calendar" | "notion-calendar";

export type CalendarRequestEnvelope = {
  id: string;
  target: CalendarIntegrationTarget;
  mode: "hold-request";
  preferredDate: string;
  preferredWindow: string;
  staffConfirmationRequired: true;
  summary: string;
};

export type IntegrationStatus = "planned" | "mocked" | "ready-for-backend" | "blocked-by-contract";

export type IntegrationOperation = {
  id: string;
  label: string;
  direction: "read" | "write-request" | "status-mirror" | "hold-request";
  owner: "frontend" | "backend" | "employee" | "external-system";
  sensitive: boolean;
  notes: string;
};

export type IntegrationContract = {
  id: "strapi" | "omnia" | "nextcloud-calendar" | "notion-calendar";
  label: string;
  status: IntegrationStatus;
  leadingSystem: boolean;
  boundary: string;
  dataClasses: DataSensitivity[];
  operations: IntegrationOperation[];
  failureMode: string;
  nextStep: string;
};

export type StrapiContentType = {
  uid: string;
  purpose: string;
  owner: "marketing" | "medical-editorial" | "operations" | "legal";
  fields: string[];
  privacy: "public" | "internal" | "portal-help";
};
