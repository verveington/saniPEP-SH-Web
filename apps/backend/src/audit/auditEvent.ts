import { createHash, randomUUID } from "node:crypto";
import type { AuditEvent, AuditOutcome } from "./models.js";
import type { UserRole } from "../users/models.js";

type AuditMetadataValue = string | number | boolean | undefined;

const blockedMetadataKeyFragments = [
  "diagnosis",
  "diagnose",
  "health",
  "patient",
  "fileName",
  "filename",
  "freeText",
  "content",
  "message",
];

export type CreateAuditEventInput = {
  actorUserId?: string;
  actorRole: UserRole | "system";
  action: string;
  outcome: AuditOutcome;
  objectType?: string;
  objectId?: string;
  requestId?: string;
  uploadObjectId?: string;
  metadata?: Record<string, AuditMetadataValue>;
  hashSecret?: string;
};

export function createAuditEvent(input: CreateAuditEventInput): AuditEvent {
  const event: AuditEvent = {
    id: randomUUID(),
    occurredAt: new Date().toISOString(),
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    action: input.action,
    outcome: input.outcome,
    objectType: input.objectType,
    objectId: input.objectId,
    requestId: input.requestId,
    uploadObjectId: input.uploadObjectId,
    metadata: sanitizeAuditMetadata(input.metadata ?? {}),
  };

  if (input.hashSecret) {
    event.eventHash = createHash("sha256")
      .update(input.hashSecret)
      .update(JSON.stringify(event))
      .digest("hex");
  }

  return event;
}

export function sanitizeAuditMetadata(metadata: Record<string, AuditMetadataValue>) {
  const sanitized: AuditEvent["metadata"] = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) continue;
    if (blockedMetadataKeyFragments.some((fragment) => key.toLowerCase().includes(fragment.toLowerCase()))) {
      sanitized[key] = "[redacted]";
      continue;
    }
    sanitized[key] = value;
  }

  return sanitized;
}

export type AuditSink = {
  append(event: AuditEvent): Promise<void>;
};

export function createNoopAuditSink(): AuditSink {
  return {
    async append() {
      return undefined;
    },
  };
}
