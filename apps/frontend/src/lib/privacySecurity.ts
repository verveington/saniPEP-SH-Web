import type {
  ConsentScope,
  RoleCapability,
  UploadEnvelope,
  UploadInput,
  UploadPolicy,
} from "./types";

export const roleCapabilities: RoleCapability[] = [
  {
    role: "anonymous",
    canReadPublicContent: true,
    canReadPortalStatus: false,
    canCreateRequest: true,
    canReviewRequest: false,
    canPrepareOmniaChange: false,
    canWriteOmniaDirectly: false,
    note: "Darf öffentliche Inhalte sehen und Kontakt-, Termin- oder Upload-Requests starten.",
  },
  {
    role: "portal-customer",
    canReadPublicContent: true,
    canReadPortalStatus: true,
    canCreateRequest: true,
    canReviewRequest: false,
    canPrepareOmniaChange: false,
    canWriteOmniaDirectly: false,
    note: "Darf Status sehen und Requests auslösen, aber keine finalen Omnia-Daten ändern.",
  },
  {
    role: "employee",
    canReadPublicContent: true,
    canReadPortalStatus: true,
    canCreateRequest: true,
    canReviewRequest: true,
    canPrepareOmniaChange: true,
    canWriteOmniaDirectly: false,
    note: "Darf prüfen und Omnia-Änderungen vorbereiten; finale Systemlogik bleibt kontrolliert.",
  },
  {
    role: "admin",
    canReadPublicContent: true,
    canReadPortalStatus: true,
    canCreateRequest: true,
    canReviewRequest: true,
    canPrepareOmniaChange: true,
    canWriteOmniaDirectly: false,
    note: "Darf Konfiguration und Review-Flows verwalten, aber Portal bleibt kein direkter Omnia-Schreibclient.",
  },
  {
    role: "system",
    canReadPublicContent: false,
    canReadPortalStatus: false,
    canCreateRequest: false,
    canReviewRequest: false,
    canPrepareOmniaChange: false,
    canWriteOmniaDirectly: false,
    note: "Automatisierung darf nur auditierte Statusspiegelungen und technische Jobs ausführen.",
  },
];

export const prescriptionUploadPolicy: UploadPolicy = {
  id: "upload-prescription-v1",
  label: "Rezept- und Gesundheitsdokumente",
  acceptedFileTypes: ["PDF", "JPG", "PNG", "HEIC"],
  maxFileSizeMb: 20,
  storageTarget: "secure-upload-api",
  consentScopes: ["health-data-processing", "prescription-upload", "portal-request"],
  encryptionRequired: true,
  antivirusScanRequired: true,
  localPersistence: "none",
  retentionHint: "Aufbewahrung und Löschung nach gesetzlicher Pflicht und internem Löschkonzept.",
  publicCopy:
    "Der Browser speichert keine Gesundheitsdaten dauerhaft. Der Upload wird verschlüsselt übertragen und durch Mitarbeiter geprüft.",
};

const acceptedUploadMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

const acceptedUploadExtensions = new Set(["pdf", "jpg", "jpeg", "png", "heic", "heif"]);

export const uploadAcceptAttribute = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".heif",
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
].join(",");

export const maxUploadFileSizeBytes = prescriptionUploadPolicy.maxFileSizeMb * 1024 * 1024;

export const consentCopy: Record<ConsentScope, string> = {
  "contact-processing": "saniPEP darf meine Kontaktdaten zur Bearbeitung meiner Anfrage verwenden.",
  "health-data-processing": "saniPEP darf übermittelte Gesundheitsdaten zur Versorgungsvorbereitung verarbeiten.",
  "prescription-upload": "Ich übermittle ein Rezept oder Gesundheitsdokument zur Mitarbeiterprüfung.",
  "portal-request": "Meine Eingabe wird als prüfbare Anfrage angelegt und nicht automatisch in Omnia geschrieben.",
  "calendar-hold": "Mein Wunschtermin ist unverbindlich und muss durch Mitarbeiter bestätigt werden.",
};

export const createUploadEnvelope = (input: UploadInput): UploadEnvelope => ({
  uploadId: createSecureUploadId(),
  fileName: input.fileName,
  context: input.context,
  sensitivity: "health",
  policy: prescriptionUploadPolicy,
  staffReviewRequired: true,
  localPersistence: "none",
  createdAt: new Date().toISOString(),
});

export const createSecureUploadId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `UP-${crypto.randomUUID()}`;
  }

  return `UP-${Math.floor(Math.random() * 90000) + 10000}`;
};

export const getUploadFileSecurityError = (file: Pick<File, "name" | "size" | "type"> | null | undefined) => {
  if (!file) return "Bitte eine Rezeptdatei auswählen.";

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeTypeAllowed = file.type ? acceptedUploadMimeTypes.has(file.type) : false;
  const extensionAllowed = acceptedUploadExtensions.has(extension);

  if (!mimeTypeAllowed && !extensionAllowed) {
    return "Bitte PDF, JPG, PNG oder HEIC hochladen.";
  }

  if (file.size > maxUploadFileSizeBytes) {
    return `Die Datei darf maximal ${prescriptionUploadPolicy.maxFileSizeMb} MB groß sein.`;
  }

  return "";
};

export const getMissingConsentScopes = (
  provided: ConsentScope[] | undefined,
  required: ConsentScope[] = prescriptionUploadPolicy.consentScopes,
) => {
  const providedSet = new Set(provided ?? []);
  return required.filter((scope) => !providedSet.has(scope));
};

export const uploadServerSecurityBoundary = {
  target: "secure-upload-api",
  requiredServerChecks: [
    "authenticate-or-issue-public-upload-session",
    "validate-consent-version-and-scope",
    "verify-size-before-streaming",
    "mime-sniff-file-signature",
    "store-in-quarantine-bucket",
    "assign-unguessable-upload-id",
    "run-antivirus-scan-before-staff-review",
    "write-retention-and-audit-metadata",
  ],
  productionInvariant:
    "Client checks are only UX. Production uploads must be rejected server-side until MIME sniffing, quarantine storage and AV scan succeed.",
} as const;
