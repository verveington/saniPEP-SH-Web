import { randomUUID } from "node:crypto";
import type { AuditEvent, AuditLogSink, PortalActor } from "./types.js";

export function createAuditEvent(input: {
  actor: PortalActor | "system";
  action: string;
  outcome: AuditEvent["outcome"];
  requestId?: string;
  uploadId?: string;
  metadata?: AuditEvent["metadata"];
}): AuditEvent {
  const actor = input.actor === "system"
    ? { id: "system", role: "system" as const }
    : { id: input.actor.id, role: input.actor.role };

  return {
    auditId: `AUD-${randomUUID()}`,
    at: new Date().toISOString(),
    actorId: actor.id,
    actorRole: actor.role,
    action: input.action,
    requestId: input.requestId,
    uploadId: input.uploadId,
    outcome: input.outcome,
    metadata: input.metadata ?? {},
  };
}

export class MemoryAuditLogSink implements AuditLogSink {
  readonly events: AuditEvent[] = [];

  async append(event: AuditEvent) {
    this.events.push(event);
  }
}
