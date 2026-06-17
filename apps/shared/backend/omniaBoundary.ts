import { createAuditEvent } from "./auditLog.js";
import type {
  AuditLogSink,
  OmniaStatusSnapshot,
  PortalActor,
  PortalRequestEnvelope,
  ReviewedOmniaChange,
} from "./types.js";
import { assertPortalRole } from "./portalAuth.js";

export type OmniaReadAdapter = {
  readSafeStatusSnapshot(customerId: string): Promise<OmniaStatusSnapshot>;
};

export type OmniaPreparationQueue = {
  enqueue(change: ReviewedOmniaChange): Promise<void>;
};

export type OmniaBoundaryOptions = {
  readAdapter: OmniaReadAdapter;
  preparationQueue: OmniaPreparationQueue;
  auditLog: AuditLogSink;
};

export function createOmniaBoundary(options: OmniaBoundaryOptions) {
  return {
    async readStatusForPortal(actor: PortalActor, customerId: string) {
      if (actor.role === "customer" && actor.customerId !== customerId) {
        throw new Error("Customer actor cannot read another customer's Omnia snapshot.");
      }
      assertPortalRole(actor, ["customer", "staff", "admin"]);
      return options.readAdapter.readSafeStatusSnapshot(customerId);
    },

    async prepareReviewedChange(input: {
      request: PortalRequestEnvelope;
      staffActor: PortalActor;
      changeKind: ReviewedOmniaChange["changeKind"];
      payloadReference: string;
    }) {
      assertPortalRole(input.staffActor, ["staff", "admin"]);

      if (input.request.status !== "approved-for-omnia-preparation") {
        throw new Error("Request must be employee-approved before Omnia preparation.");
      }

      const change: ReviewedOmniaChange = {
        requestId: input.request.requestId,
        preparedBy: input.staffActor,
        preparedAt: new Date().toISOString(),
        changeKind: input.changeKind,
        payloadReference: input.payloadReference,
        finalWriteRequiresHumanInOmnia: true,
      };

      await options.preparationQueue.enqueue(change);
      await options.auditLog.append(createAuditEvent({
        actor: input.staffActor,
        action: "reviewed-omnia-change-prepared",
        outcome: "queued",
        requestId: input.request.requestId,
        metadata: {
          changeKind: input.changeKind,
          finalWriteRequiresHumanInOmnia: true,
        },
      }));

      return change;
    },
  };
}

export const omniaProductionBoundary = {
  leadingSystem: "omnia",
  mode: "read-mostly",
  invariants: [
    "customers-never-write-final-omnia-data",
    "all-customer-actions-create-requests",
    "staff-review-required-before-omnia-preparation",
    "final-write-stays-human-controlled-in-omnia",
    "portal-displays-safe-status-summaries-only",
  ],
} as const;
