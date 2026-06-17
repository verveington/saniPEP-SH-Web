import { randomUUID } from "node:crypto";
import { createAuditEvent } from "./auditLog.js";
import type {
  AuditLogSink,
  PortalActor,
  PortalRequestEnvelope,
  PortalRequestKind,
} from "./types.js";

export type PortalRequestInput = {
  kind: PortalRequestKind;
  customerId: string;
  actor: PortalActor;
  safeSummary: string;
  uploadId?: string;
};

const requestSensitivity: Record<PortalRequestKind, PortalRequestEnvelope["sensitivity"]> = {
  "prescription-upload": "health",
  "reorder-request": "health",
  "subscription-change-request": "health",
  "appointment-request": "contact",
  "health-contact-request": "health",
};

export function assertCustomerCanCreateRequest(actor: PortalActor, customerId: string) {
  if (actor.role !== "customer" && actor.role !== "staff" && actor.role !== "admin") {
    throw new Error("Actor is not allowed to create portal requests.");
  }

  if (actor.role === "customer" && actor.customerId !== customerId) {
    throw new Error("Customer actor cannot create requests for another customer.");
  }
}

export function createPortalRequestEnvelope(input: PortalRequestInput): PortalRequestEnvelope {
  assertCustomerCanCreateRequest(input.actor, input.customerId);

  return {
    requestId: `REQ-${randomUUID()}`,
    kind: input.kind,
    customerId: input.customerId,
    createdBy: input.actor,
    createdAt: new Date().toISOString(),
    status: input.kind === "prescription-upload" ? "quarantined" : "submitted",
    staffReviewRequired: true,
    omniaWriteAllowed: false,
    sensitivity: requestSensitivity[input.kind],
    safeSummary: input.safeSummary,
    uploadId: input.uploadId,
    auditIds: [],
  };
}

export function createPortalRequestService(auditLog: AuditLogSink) {
  return {
    async create(input: PortalRequestInput) {
      const request = createPortalRequestEnvelope(input);
      const audit = createAuditEvent({
        actor: input.actor,
        action: `portal-request-created:${input.kind}`,
        outcome: "queued",
        requestId: request.requestId,
        uploadId: request.uploadId,
        metadata: {
          customerId: input.customerId,
          sensitivity: request.sensitivity,
          staffReviewRequired: true,
          omniaWriteAllowed: false,
        },
      });

      request.auditIds.push(audit.auditId);
      await auditLog.append(audit);
      return request;
    },
  };
}

export const supportedPortalRequestKinds: Array<{
  kind: PortalRequestKind;
  description: string;
  storesHealthData: boolean;
  requiresUpload?: boolean;
}> = [
  {
    kind: "prescription-upload",
    description: "Rezeptupload mit Quarantaene, AV-Scan und Mitarbeiterpruefung.",
    storesHealthData: true,
    requiresUpload: true,
  },
  {
    kind: "reorder-request",
    description: "Bestellanfrage fuer bestehende Versorgung; keine finale Bestellung.",
    storesHealthData: true,
  },
  {
    kind: "subscription-change-request",
    description: "Abo-/Rhythmuswunsch; nur Request, keine direkte Dauerversorgungs-Aenderung.",
    storesHealthData: true,
  },
  {
    kind: "appointment-request",
    description: "Terminwunsch; Bestaetigung durch Mitarbeiter erforderlich.",
    storesHealthData: false,
  },
  {
    kind: "health-contact-request",
    description: "Kontaktanfrage mit moeglichen Gesundheitsdaten; geschuetzte Mitarbeiterqueue.",
    storesHealthData: true,
  },
];
