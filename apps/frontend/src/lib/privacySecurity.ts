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

export const consentCopy: Record<ConsentScope, string> = {
  "contact-processing": "saniPEP darf meine Kontaktdaten zur Bearbeitung meiner Anfrage verwenden.",
  "health-data-processing": "saniPEP darf übermittelte Gesundheitsdaten zur Versorgungsvorbereitung verarbeiten.",
  "prescription-upload": "Ich übermittle ein Rezept oder Gesundheitsdokument zur Mitarbeiterprüfung.",
  "portal-request": "Meine Eingabe wird als prüfbare Anfrage angelegt und nicht automatisch in Omnia geschrieben.",
  "calendar-hold": "Mein Wunschtermin ist unverbindlich und muss durch Mitarbeiter bestätigt werden.",
};

export const createUploadEnvelope = (input: UploadInput): UploadEnvelope => ({
  uploadId: `UP-${Math.floor(Math.random() * 90000) + 10000}`,
  fileName: input.fileName,
  context: input.context,
  sensitivity: "health",
  policy: prescriptionUploadPolicy,
  staffReviewRequired: true,
  localPersistence: "none",
  createdAt: new Date().toISOString(),
});

export const getMissingConsentScopes = (
  provided: ConsentScope[] | undefined,
  required: ConsentScope[] = prescriptionUploadPolicy.consentScopes,
) => {
  const providedSet = new Set(provided ?? []);
  return required.filter((scope) => !providedSet.has(scope));
};
