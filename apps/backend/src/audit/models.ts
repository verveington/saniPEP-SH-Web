import type { UserRole } from "../users/models.js";

export type AuditOutcome = "accepted" | "rejected" | "queued" | "blocked";

export type AuditActorRole = UserRole | "system";

export type AuditEvent = {
  id: string;
  occurredAt: string;
  actorUserId?: string;
  actorRole: AuditActorRole;
  action: string;
  outcome: AuditOutcome;
  objectType?: string;
  objectId?: string;
  requestId?: string;
  uploadObjectId?: string;
  metadata: Record<string, string | number | boolean>;
  eventHash?: string;
};
