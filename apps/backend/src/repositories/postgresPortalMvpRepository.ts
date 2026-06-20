import type { AuditEvent } from "../audit/models.js";
import type { QueryLayer, QueryPrimitive } from "../db/queryLayer.js";
import {
  normalizeStaffRequestStatus,
  type PortalMvpRepository,
  type PortalSessionRecord,
  type PortalUserRecord,
  type StaffRequestStatus,
  type StoredPortalRequest,
} from "./portalMvpRepository.js";

type JsonRow<T> = {
  data: T;
};

export function createPostgresPortalMvpRepository(queryLayer: QueryLayer): PortalMvpRepository {
  return {
    async findUserByEmail(email) {
      const result = await queryLayer.query<JsonRow<PortalUserRecord>>(
        "SELECT data FROM portal_mvp_users WHERE email_ci = lower($1) LIMIT 1",
        [email],
      );
      return result.rows[0]?.data ?? null;
    },

    async findUserById(userId) {
      const result = await queryLayer.query<JsonRow<PortalUserRecord>>(
        "SELECT data FROM portal_mvp_users WHERE user_id = $1 LIMIT 1",
        [userId],
      );
      return result.rows[0]?.data ?? null;
    },

    async saveSession(record) {
      await queryLayer.query(
        `INSERT INTO portal_mvp_sessions (token_hash, user_id, absolute_expires_at, data, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, now())
         ON CONFLICT (token_hash) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           absolute_expires_at = EXCLUDED.absolute_expires_at,
           data = EXCLUDED.data,
           updated_at = now()`,
        [
          record.session.tokenHash,
          record.session.userId,
          record.session.absoluteExpiresAt,
          encodeJson(record),
        ],
      );
    },

    async findSessionByTokenHash(tokenHash) {
      const result = await queryLayer.query<JsonRow<PortalSessionRecord>>(
        "SELECT data FROM portal_mvp_sessions WHERE token_hash = $1 AND absolute_expires_at > now() LIMIT 1",
        [tokenHash],
      );
      return result.rows[0]?.data ?? null;
    },

    async deleteSession(tokenHash) {
      await queryLayer.query("DELETE FROM portal_mvp_sessions WHERE token_hash = $1", [tokenHash]);
    },

    async listAllRequests() {
      const result = await queryLayer.query<JsonRow<StoredPortalRequest>>(
        "SELECT data FROM portal_mvp_requests ORDER BY created_at_iso DESC",
      );
      return result.rows.map((row) => row.data);
    },

    async listRequestsForCustomer(customerProfileId) {
      const result = await queryLayer.query<JsonRow<StoredPortalRequest>>(
        "SELECT data FROM portal_mvp_requests WHERE customer_profile_id = $1 ORDER BY created_at_iso DESC",
        [customerProfileId],
      );
      return result.rows.map((row) => row.data);
    },

    async listRequestsForStaff(input = {}) {
      const result = await queryLayer.query<JsonRow<StoredPortalRequest>>(
        `SELECT data
         FROM portal_mvp_requests
         ORDER BY created_at_iso DESC
         LIMIT $1`,
        [input.status ? 500 : (input.limit ?? 100)],
      );
      const requests = input.status
        ? result.rows.map((row) => row.data).filter((request) => normalizeStaffRequestStatus(request.employeeStatus) === input.status)
        : result.rows.map((row) => row.data);
      return requests.slice(0, input.limit ?? 100);
    },

    async getRequestById(id) {
      const result = await queryLayer.query<JsonRow<StoredPortalRequest>>(
        "SELECT data FROM portal_mvp_requests WHERE id = $1 LIMIT 1",
        [id],
      );
      return result.rows[0]?.data ?? null;
    },

    async saveRequest(request) {
      await queryLayer.query(
        `INSERT INTO portal_mvp_requests (
           id,
           customer_profile_id,
           created_by_user_id,
           kind,
           status,
           employee_status,
           created_at_iso,
           updated_at_iso,
           data,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now())`,
        requestParams(request),
      );
    },

    async updateRequest(request) {
      await queryLayer.query(
        `UPDATE portal_mvp_requests SET
           customer_profile_id = $2,
           created_by_user_id = $3,
           kind = $4,
           status = $5,
           employee_status = $6,
           created_at_iso = $7,
           updated_at_iso = $8,
           data = $9::jsonb,
           updated_at = now()
         WHERE id = $1`,
        requestParams(request),
      );
    },

    async appendAudit(event) {
      await insertAuditEvent(queryLayer, event);
      return event;
    },

    async appendAuditMany(events) {
      if (events.length === 0) return events;
      await queryLayer.transaction(async (tx) => {
        for (const event of events) {
          await insertAuditEvent(tx, event);
        }
      });
      return events;
    },

    async listAuditEventsFor(input) {
      const params: QueryPrimitive[] = [];
      const predicates: string[] = [];

      if (input.requestIds.length > 0) {
        const placeholders = input.requestIds.map((requestId) => {
          params.push(requestId);
          return `$${params.length}`;
        });
        predicates.push(`request_id IN (${placeholders.join(", ")})`);
      }

      if (input.actorUserId) {
        params.push(input.actorUserId);
        predicates.push(`actor_user_id = $${params.length}`);
      }

      if (predicates.length === 0) return [];

      params.push(Math.max(input.limit, 1));
      const result = await queryLayer.query<JsonRow<AuditEvent>>(
        `SELECT data
         FROM portal_mvp_audit_events
         WHERE ${predicates.join(" OR ")}
         ORDER BY occurred_at_iso DESC
         LIMIT $${params.length}`,
        params,
      );
      return result.rows.map((row) => row.data);
    },
  };
}

export const postgresPortalMvpRepositoryPlan = {
  scope: "transitional-postgres-repository",
  implemented: [
    "Public and portal request metadata persists in portal_mvp_requests JSONB rows.",
    "Audit events persist in portal_mvp_audit_events JSONB rows with actor/request indexes.",
    "The adapter uses the existing PortalMvpRepository port, so the file-backed repository can be disabled by configuration.",
  ],
  nextSteps: [
    "Move from JSONB transitional rows to reviewed relational tables once the staff workflow is stable.",
    "Add a migration runner or fail-fast startup check for missing portal_mvp_* tables.",
    "Provision real production users through an audited IAM/onboarding flow instead of development seed users.",
  ],
} as const;

function requestParams(request: StoredPortalRequest) {
  return [
    request.id,
    request.customerProfileId,
    request.createdByUserId,
    request.kind,
    request.status,
    normalizeStaffRequestStatus(request.employeeStatus),
    request.createdAt,
    request.updatedAt,
    encodeJson(request),
  ];
}

async function insertAuditEvent(queryLayer: QueryLayer, event: AuditEvent) {
  await queryLayer.query(
    `INSERT INTO portal_mvp_audit_events (id, actor_user_id, request_id, occurred_at_iso, data)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [
      event.id,
      event.actorUserId ?? null,
      event.requestId ?? null,
      event.occurredAt,
      encodeJson(event),
    ],
  );
}

function encodeJson(value: unknown) {
  return JSON.stringify(value);
}
