import { portalDashboard } from "./mockData";
import { calendarAdapter } from "./calendarAdapter";
import { assertRequestActionAllowed } from "./requestWorkflow";
import { createUploadEnvelope, getMissingConsentScopes } from "./privacySecurity";
import type {
  AppointmentRequestInput,
  AuditEvent,
  CalendarRequestEnvelope,
  CareConfigurationInput,
  ContactInquiryInput,
  PortalDashboard,
  PortalRequest,
  ReorderRequestInput,
  UploadEnvelope,
  UploadInput,
} from "./types";

const cloneDashboard = (): PortalDashboard => structuredClone(portalDashboard);

const requestStatusCopy = {
  submitted: "Anfrage eingegangen",
  "employee-review": "Prüfung durch Mitarbeiter",
  "omnia-prepared": "In Omnia vorbereitet",
  confirmed: "Bestätigt",
  delivery: "Lieferung vorbereitet",
  closed: "Abgeschlossen",
} as const;

const createAuditEvent = (requestId: string, action: string): AuditEvent => ({
  id: `AUD-${Math.floor(Math.random() * 90000) + 10000}`,
  at: new Date().toISOString(),
  actor: "system",
  action,
  requestId,
});

export const omniaAdapter = {
  getPortalDashboard(): PortalDashboard {
    return cloneDashboard();
  },

  getRequestStatusLabel(status: keyof typeof requestStatusCopy): string {
    return requestStatusCopy[status];
  },

  createAppointmentRequest(input: AppointmentRequestInput): {
    request: PortalRequest;
    audit: AuditEvent;
    calendar: CalendarRequestEnvelope;
  } {
    const policy = assertRequestActionAllowed("request-appointment");
    const requestId = `REQ-${Math.floor(Math.random() * 9000) + 1000}`;
    return {
      request: {
        id: requestId,
        type: "appointment",
        title: input.concern,
        createdAt: new Date().toISOString().slice(0, 10),
        status: "submitted",
        employeeReview: "neu",
        publicSummary:
          "Wunschtermin eingegangen. Ein Mitarbeiter bestätigt oder schlägt ein alternatives Zeitfenster vor.",
        safeCategory: "Termin",
        requestedChannel: "email",
        policyIntent: policy.intent,
      },
      audit: createAuditEvent(requestId, "Terminanfrage als Request angelegt"),
      calendar: calendarAdapter.createHoldRequest(input),
    };
  },

  createUploadRequest(input: UploadInput): {
    request: PortalRequest;
    audit: AuditEvent;
    upload: UploadEnvelope;
    storagePolicy: string;
  } {
    const policy = assertRequestActionAllowed("upload-prescription");
    const missingConsent = getMissingConsentScopes(input.consentScopes);
    if (missingConsent.length > 0) {
      throw new Error(`Missing upload consent scopes: ${missingConsent.join(", ")}`);
    }
    const upload = createUploadEnvelope(input);
    const requestId = `RX-${Math.floor(Math.random() * 90000) + 10000}`;
    return {
      request: {
        id: requestId,
        type: "prescription-upload",
        title: `Rezeptupload: ${input.context}`,
        createdAt: new Date().toISOString().slice(0, 10),
        status: "submitted",
        employeeReview: "neu",
        publicSummary:
          "Dokument empfangen. Inhalte werden erst nach Mitarbeiterprüfung in Omnia übernommen.",
        safeCategory: input.context,
        requestedChannel: "portal",
        policyIntent: policy.intent,
      },
      audit: createAuditEvent(requestId, `Upload "${input.fileName}" als sensible Anfrage registriert`),
      upload,
      storagePolicy:
        `${upload.policy.publicCopy} Ziel: ${upload.policy.storageTarget}, Scan: ${upload.policy.antivirusScanRequired ? "pflicht" : "optional"}.`,
    };
  },

  createWrittenInquiryRequest(input: ContactInquiryInput): {
    request: PortalRequest;
    audit: AuditEvent;
    disclosurePolicy: string;
  } {
    const policy = assertRequestActionAllowed("send-written-inquiry");
    const requestId = `MSG-${Math.floor(Math.random() * 90000) + 10000}`;
    return {
      request: {
        id: requestId,
        type: "written-inquiry",
        title: `${input.topic}: ${input.serviceContext}`,
        createdAt: new Date().toISOString().slice(0, 10),
        status: "submitted",
        employeeReview: "neu",
        publicSummary:
          "Schriftliche Anfrage eingegangen. Die Antwort erfolgt nach fachlicher Sichtung über den gewünschten Kontaktkanal.",
        safeCategory: input.serviceContext,
        requestedChannel: input.preferredContactChannel,
        policyIntent: policy.intent,
      },
      audit: createAuditEvent(requestId, "Schriftliche Kundenanfrage als Request angelegt"),
      disclosurePolicy: input.containsHealthData
        ? "Anfrage kann Gesundheitsdaten enthalten und muss im Mitarbeiterbereich mit Rollenpruefung bearbeitet werden."
        : "Anfrage ist als allgemeiner Kontaktrequest markiert.",
    };
  },

  createReorderRequest(input: ReorderRequestInput): {
    request: PortalRequest;
    audit: AuditEvent;
  } {
    const policy = assertRequestActionAllowed("request-reorder");
    const requestId = `REQ-${Math.floor(Math.random() * 90000) + 10000}`;
    return {
      request: {
        id: requestId,
        type: "reorder",
        title: `Bestellanfrage: ${input.supplyName}`,
        createdAt: new Date().toISOString().slice(0, 10),
        status: "submitted",
        employeeReview: "neu",
        publicSummary:
          "Bestellwunsch eingegangen. Finale Artikel, Mengen und Auslösung erfolgen erst nach Mitarbeiterprüfung in Omnia.",
        safeCategory: input.supplyName,
        requestedChannel: "portal",
        policyIntent: policy.intent,
      },
      audit: createAuditEvent(requestId, `Bestellanfrage fuer ${input.supplyId} angelegt`),
    };
  },

  createCareConfigurationRequest(input: CareConfigurationInput): {
    request: PortalRequest;
    audit: AuditEvent;
  } {
    const policy = assertRequestActionAllowed("configure-care-supply");
    const requestId = `CARE-${Math.floor(Math.random() * 90000) + 10000}`;
    return {
      request: {
        id: requestId,
        type: "care-configuration",
        title: `${input.need} konfigurieren`,
        createdAt: new Date().toISOString().slice(0, 10),
        status: "submitted",
        employeeReview: "neu",
        publicSummary:
          "Konfiguration eingegangen. Mitarbeiter pruefen Rezeptlage, Bedarf und Lieferprozess vor Omnia-Uebernahme.",
        safeCategory: input.need,
        requestedChannel: "portal",
        policyIntent: policy.intent,
      },
      audit: createAuditEvent(requestId, `Pflege-/Inkontinenz-Konfiguration fuer ${input.need} angelegt`),
    };
  },
};
