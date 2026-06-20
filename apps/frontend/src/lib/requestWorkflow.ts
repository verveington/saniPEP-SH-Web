import type {
  ActionPolicyDecision,
  PortalActionIntent,
  PortalRequest,
} from "./types";

export const portalActionPolicies: Record<PortalActionIntent, ActionPolicyDecision> = {
  "upload-prescription": {
    intent: "upload-prescription",
    label: "Rezept vorab einreichen",
    allowed: true,
    executionMode: "request",
    staffReviewRequired: true,
    omniaWriteAllowed: false,
    auditRequired: true,
    dataSensitivity: "health",
    reason: "Dateiübertragung bleibt im MVP blockiert; die Anfrage wird erst nach Mitarbeiterprüfung übernommen.",
  },
  "request-appointment": {
    intent: "request-appointment",
    label: "Wunschtermin anfragen",
    allowed: true,
    executionMode: "request",
    staffReviewRequired: true,
    omniaWriteAllowed: false,
    auditRequired: true,
    dataSensitivity: "contact",
    reason: "Es entsteht nur ein Kalender-Hold; Mitarbeiter bestätigen den Termin.",
  },
  "request-reorder": {
    intent: "request-reorder",
    label: "Bestellanfrage stellen",
    allowed: true,
    executionMode: "request",
    staffReviewRequired: true,
    omniaWriteAllowed: false,
    auditRequired: true,
    dataSensitivity: "health",
    reason: "Kundenwunsch wird geprüft; finale Bestellung wird in Omnia durch Mitarbeiter ausgelöst.",
  },
  "request-contact-check": {
    intent: "request-contact-check",
    label: "Kontaktdaten prüfen lassen",
    allowed: true,
    executionMode: "request",
    staffReviewRequired: true,
    omniaWriteAllowed: false,
    auditRequired: true,
    dataSensitivity: "contact",
    reason: "Stammdaten werden nicht ungeprüft überschrieben.",
  },
  "submit-document": {
    intent: "submit-document",
    label: "Dokument einreichen",
    allowed: true,
    executionMode: "request",
    staffReviewRequired: true,
    omniaWriteAllowed: false,
    auditRequired: true,
    dataSensitivity: "health",
    reason: "Dokumente werden im Mitarbeiterbereich geprüft und datensparsam angezeigt.",
  },
  "send-written-inquiry": {
    intent: "send-written-inquiry",
    label: "Schriftliche Anfrage senden",
    allowed: true,
    executionMode: "request",
    staffReviewRequired: true,
    omniaWriteAllowed: false,
    auditRequired: true,
    dataSensitivity: "contact",
    reason: "Anfragen werden fachlich gesichtet und nicht als Omnia-Schreibzugriff behandelt.",
  },
  "configure-care-supply": {
    intent: "configure-care-supply",
    label: "Pflege-/Inkontinenzbedarf konfigurieren",
    allowed: true,
    executionMode: "request",
    staffReviewRequired: true,
    omniaWriteAllowed: false,
    auditRequired: true,
    dataSensitivity: "health",
    reason: "Konfiguration ist ein Bedarfsvorschlag, keine finale Artikel- oder Mengenänderung.",
  },
  "direct-update-omnia-master-data": {
    intent: "direct-update-omnia-master-data",
    label: "Omnia-Stammdaten direkt ändern",
    allowed: false,
    executionMode: "blocked",
    staffReviewRequired: true,
    omniaWriteAllowed: false,
    auditRequired: true,
    dataSensitivity: "omnia-master",
    reason: "Omnia bleibt führend; Stammdatenänderungen dürfen nur nach Mitarbeiterprüfung erfolgen.",
  },
  "direct-change-supply": {
    intent: "direct-change-supply",
    label: "Dauerversorgung direkt ändern",
    allowed: false,
    executionMode: "blocked",
    staffReviewRequired: true,
    omniaWriteAllowed: false,
    auditRequired: true,
    dataSensitivity: "omnia-master",
    reason: "Dauerversorgungen sind führende Omnia-Daten und dürfen nicht direkt vom Portal geändert werden.",
  },
  "final-order-submit": {
    intent: "final-order-submit",
    label: "Finale Bestellung auslösen",
    allowed: false,
    executionMode: "blocked",
    staffReviewRequired: true,
    omniaWriteAllowed: false,
    auditRequired: true,
    dataSensitivity: "omnia-master",
    reason: "Finale Bestellungen werden in Omnia erst nach Prüfung und Freigabe ausgelöst.",
  },
  "edit-prescription-data": {
    intent: "edit-prescription-data",
    label: "Rezeptdaten final ändern",
    allowed: false,
    executionMode: "blocked",
    staffReviewRequired: true,
    omniaWriteAllowed: false,
    auditRequired: true,
    dataSensitivity: "health",
    reason: "Rezeptdaten sind sensible Gesundheitsdaten und werden nicht ungeprüft überschrieben.",
  },
};

export const requestTypePolicyIntent: Record<PortalRequest["type"], PortalActionIntent> = {
  "prescription-upload": "upload-prescription",
  appointment: "request-appointment",
  reorder: "request-reorder",
  "contact-check": "request-contact-check",
  document: "submit-document",
  "written-inquiry": "send-written-inquiry",
  "care-configuration": "configure-care-supply",
};

export const getActionDecision = (intent: PortalActionIntent): ActionPolicyDecision =>
  portalActionPolicies[intent];

export const getRequestPolicy = (request: PortalRequest): ActionPolicyDecision =>
  getActionDecision(request.policyIntent ?? requestTypePolicyIntent[request.type]);

export const assertRequestActionAllowed = (intent: PortalActionIntent): ActionPolicyDecision => {
  const decision = getActionDecision(intent);
  if (!decision.allowed) {
    throw new Error(`Blocked portal action: ${decision.label}. ${decision.reason}`);
  }
  return decision;
};

export const workflowPolicyMatrix = Object.values(portalActionPolicies);
