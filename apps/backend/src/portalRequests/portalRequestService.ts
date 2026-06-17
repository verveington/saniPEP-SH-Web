import { randomUUID } from "node:crypto";
import type { AuditSink } from "../audit/auditEvent.js";
import { createAuditEvent } from "../audit/auditEvent.js";
import type { AuthenticatedActor } from "../users/models.js";
import type { PortalRequest, PortalRequestKind, PortalRequestSensitivity, PortalRequestStatus } from "./models.js";

export type CreatePortalRequestInput = {
  actor: AuthenticatedActor;
  customerProfileId: string;
  kind: PortalRequestKind;
  safeSummary: string;
  sensitivity?: PortalRequestSensitivity;
  initialStatus?: Extract<PortalRequestStatus, "draft" | "submitted">;
  auditSink: AuditSink;
  auditHashSecret?: string;
};

export async function createPortalRequest(input: CreatePortalRequestInput) {
  const now = new Date().toISOString();
  const status = input.initialStatus ?? "submitted";
  const request: PortalRequest = {
    id: randomUUID(),
    customerProfileId: input.customerProfileId,
    createdByUserId: input.actor.userId,
    kind: input.kind,
    status,
    sensitivity: input.sensitivity ?? inferSensitivity(input.kind),
    safeSummary: normalizeSafeSummary(input.safeSummary),
    staffReviewRequired: true,
    omniaWriteAllowed: false,
    submittedAt: status === "submitted" ? now : undefined,
    createdAt: now,
    updatedAt: now,
  };

  await input.auditSink.append(createAuditEvent({
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    action: `portal-request-created:${input.kind}`,
    outcome: status === "submitted" ? "queued" : "accepted",
    objectType: "portal_request",
    objectId: request.id,
    requestId: request.id,
    metadata: {
      kind: input.kind,
      status,
      sensitivity: request.sensitivity,
    },
    hashSecret: input.auditHashSecret,
  }));

  return request;
}

export function assertPortalRequestTransition(current: PortalRequestStatus, next: PortalRequestStatus) {
  const allowed: Record<PortalRequestStatus, readonly PortalRequestStatus[]> = {
    draft: ["submitted", "rejected"],
    submitted: ["staff_review", "rejected"],
    staff_review: ["approved", "rejected"],
    approved: ["completed", "rejected"],
    rejected: [],
    completed: [],
  };

  if (!allowed[current].includes(next)) {
    throw new Error(`Portal request cannot transition from ${current} to ${next}.`);
  }
}

function inferSensitivity(kind: PortalRequestKind): PortalRequestSensitivity {
  if (kind === "prescription_upload" || kind === "health_contact_request") return "health";
  if (kind === "reorder_request" || kind === "subscription_change_request") return "omnia_reference";
  return "contact";
}

function normalizeSafeSummary(summary: string) {
  const trimmed = summary.trim();
  if (trimmed.length === 0) return "Portal-Anfrage wartet auf Mitarbeiterpruefung.";
  return trimmed.slice(0, 180);
}
