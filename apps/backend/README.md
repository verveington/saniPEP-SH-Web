# saniPEP Portal Backend

This app is the separate backend runtime scaffold for portal auth, portal requests and uploads.
It is intentionally separate from the Next.js public website and from Strapi.

Strapi remains CMS-only. Do not store prescription files, health data, portal sessions, upload metadata or Omnia operational data in Strapi.

## Scope of this sprint

Implemented as buildable TypeScript scaffold:

- module structure: `auth`, `users`, `portalRequests`, `uploads`, `audit`, `omniaAdapter`, `security`
- domain models for `User`, `CustomerProfile`, `StaffUser`, `Session`, `OneTimePasswordInvite`, `PortalRequest`, `UploadObject`, `AuditEvent`, `RateLimitEvent`
- PostgreSQL migrations in `migrations/*.sql` plus an explicit migration runner
- central ENV validation with production safety checks
- PostgreSQL adapter using `pg` behind the `QueryLayer` port
- Redis client plus Redis-backed session, rate-limit and account-lockout adapters
- password hashing adapter using Node `scrypt`
- OTP invite helper that stores only hashes and returns the one-time code for letter/handout delivery
- server-side session model with hashed session and CSRF tokens
- role guards
- upload MIME/size policy, quarantine/clean states, AV interface and object-storage interface
- portal request creation and status transition rules
- Omnia read-only/prepared-change boundary stub
- runtime health endpoints: `/healthz`, `/readyz`
- development Portal-MVP HTTP API for:
  - `POST /api/public/requests`
  - `POST /api/auth/login`
  - `GET /api/auth/session`
  - `POST /api/auth/logout`
  - `GET /api/portal/dashboard`
  - `POST /api/portal/requests`
- `GET /api/staff/requests`
- `GET /api/staff/requests/:id`
- `PATCH /api/staff/requests/:id/status`
- repository-backed persistence with development file store and transitional Postgres JSONB adapter
- request storage for prescription-upload metadata, appointment wishes, reorder wishes,
  subscription wishes and contact wishes
- public request storage for appointment, contact, care/supply and document-metadata requests without file content

The staff request endpoints are explicitly marked as `staff-request-mvp` in the response header
and body. They are not production-ready staff tooling because production IAM, durable audit
storage and operational staff workflows are not wired yet.

Not implemented:

- no production auth
- no automatic destructive schema migrations
- no production Redis hardening or managed Redis provisioning
- no real object storage
- no real AV scanner
- no real Omnia integration
- no patient data or prescription files
- no persisted production upload files or upload file names
- no final legal text

## Query layer decision

Selected for sprint 1: **PostgreSQL SQL migrations plus repository-oriented query ports**.

Reasoning:

- Sensitive auth/upload tables must be reviewable as explicit SQL.
- The first backend sprint needs stable data boundaries before binding to an ORM lifecycle.
- Repository/query ports keep auth, upload and Omnia modules independent from the concrete database client.
- A later sprint can attach `pg` directly or introduce Kysely for typed SQL without changing domain modules.

## Local commands

From the repository root:

```bash
npm run build:backend
npm run check:backend:migrations
npm run db:migrate
npm run check:backend:runtime
npm run start:backend
npm run dev:backend:compose
npm run demo:portal-mvp
```

The runtime exposes a development-only Portal-MVP API. It is functional enough for end-to-end
login, session, request and audit demos, and stores data through the repository layer in a local
JSON file. It is not production auth or a production upload API.

`npm run check:backend` runs the backend migration check, the shared backend contracts and this runtime backend typecheck.

## Local development configuration

Create a local env file from the example:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Optional local services for the next sprint:

```bash
npm run dev:backend:compose
```

This starts:

- backend on `http://localhost:4100`
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

Run migrations when the local database is available:

```bash
PORTAL_REPOSITORY_DRIVER=postgres \
PORTAL_DATABASE_SSL=false \
PORTAL_DATABASE_URL="postgres://sanipep:replace-with-local-postgres-password@localhost:5432/sanipep_portal" \
npm run db:migrate
```

Health endpoints:

```bash
curl http://localhost:4100/healthz
curl http://localhost:4100/readyz
```

`/readyz` remains `not_ready` while AV/object-storage checks are missing or disabled, even if PostgreSQL and Redis are reachable.

End-to-end MVP demo:

```bash
npm run start:backend
npm run demo:portal-mvp
```

The demo logs in with the development seed user, creates one prescription-upload request, one
appointment request, one reorder request, one subscription-change request and one contact request.
It also logs in as staff, changes status to review/approved/completed and rejected, then checks
that the dashboard stores the data, shows staff review state, creates audit events and keeps Omnia
writes at `0`.

Set local demo users explicitly before starting the file-backed development backend:

```bash
PORTAL_DEV_CUSTOMER_EMAIL="customer.local@example.test"
PORTAL_DEV_CUSTOMER_PASSWORD="use-a-local-throwaway-password"
PORTAL_DEV_STAFF_EMAIL="staff.local@example.test"
PORTAL_DEV_STAFF_PASSWORD="use-a-different-local-throwaway-password"
```

The backend hashes these passwords with `PORTAL_PASSWORD_PEPPER` before storing file-repository
seed users. No demo passwords are hardcoded in the runtime, and `PORTAL_DEV_*` variables are
rejected when `NODE_ENV=production`.

Local development persistence:

```bash
PORTAL_STORE_PATH=/tmp/sanipep-portal-mvp-store.json npm run start:backend
```

The file repository is now a local development-only alternative. Production must set
`PORTAL_REPOSITORY_DRIVER=postgres`; `PORTAL_REPOSITORY_DRIVER=file` is rejected when
`NODE_ENV=production`.

`PORTAL_STORE_PATH` analysis:

- The file store serializes users, sessions, public/portal requests and audit events into one JSON file.
- It is useful for local MVP checks because it seeds demo users outside production and needs no services.
- It is not production-safe: concurrent writers are only serialized within one process, there is no cross-instance locking, no backup/retention policy, no queryable audit trail and no durability boundary beyond local disk.
- Public requests currently store safe metadata only and keep `fileUploadIncluded=false`, including the document-metadata request path, so moving them to Postgres is low risk.

Repository migration plan:

1. Use `PORTAL_REPOSITORY_DRIVER=file` only for local development scripts and demos.
2. Use `PORTAL_REPOSITORY_DRIVER=postgres` in production-like deployments.
3. Apply SQL migrations with `npm run db:migrate`, including `0003_portal_mvp_repository.sql`, before starting the backend.
4. Keep request/audit payloads in transitional JSONB tables until the staff workflow stabilizes.
5. Split JSONB into reviewed relational request-detail tables before production go-live for final staff workflows.

Production secrets must come from a secret store or hosting environment. Do not commit `.env`, `.env.local` or production values.

## Database migrations

The backend migration runner lives in `src/db/migrations.ts` and is exposed from the repository root:

```bash
npm run migrate:backend
npm run db:migrate
```

Both commands build the backend first and then run `apps/backend/dist/db/migrations.js`.

Migration behavior:

- SQL files are read from `apps/backend/migrations/*.sql`.
- Files must be named with contiguous sortable prefixes such as `0001_*.sql`, `0002_*.sql`, `0003_*.sql`.
- Files are executed in sorted order.
- `schema_migrations` stores `version`, `checksum_sha256`, `applied_at` and `execution_ms`.
- Already applied migrations are skipped when their checksum still matches.
- A changed checksum for an applied migration aborts the process.
- A migration failure rolls back that migration and aborts the process.
- A PostgreSQL advisory lock serializes concurrent migration attempts.
- Current migration checks reject destructive SQL keywords such as `DROP TABLE`, `DROP COLUMN`, `TRUNCATE` and `DELETE FROM`.

The backend does not auto-apply migrations during normal startup. When `PORTAL_REPOSITORY_DRIVER=postgres`,
startup asserts that `schema_migrations` exists, all migration files are recorded with matching checksums
and the required runtime tables exist. If any required table or migration is missing, startup fails with
a message telling the operator to run `npm run migrate:backend`.

Fresh local database example:

```bash
npm run dev:backend:compose

PORTAL_REPOSITORY_DRIVER=postgres \
PORTAL_DATABASE_SSL=false \
PORTAL_DATABASE_URL="postgres://sanipep:replace-with-local-postgres-password@localhost:5432/sanipep_portal" \
npm run db:migrate
```

Local/staging Postgres validation for the Public-Request/Staff-Admin MVP:

```bash
docker compose -f apps/backend/docker-compose.yml up -d postgres redis

export PORTAL_REPOSITORY_DRIVER=postgres
export PORTAL_DATABASE_SSL=false
export PORTAL_DATABASE_URL="postgres://sanipep:replace-with-local-postgres-password@localhost:5432/sanipep_portal"
export TRUSTED_ORIGINS="http://localhost:5184"

npm run db:migrate
npm run check:backend:migrations
npm run check:public-requests:postgres
```

`check:public-requests:postgres` requires an already reachable PostgreSQL database. It first
asserts `schema_migrations`, migration checksums and required runtime tables, then creates unique
temporary `portal_mvp_users` rows for one customer and one staff actor, exercises public request
creation, staff login, staff list/detail, CSRF rejection, status change audit and logout, and removes
its temporary users, sessions, requests and audit rows at the end. It must not be run with
`NODE_ENV=production`.

Deployment requirement:

- Run `npm run db:migrate` or the equivalent container command before starting or rolling the backend.
- In `compose.yaml`, `backend-migrate` is a one-shot service using the backend image and `node apps/backend/dist/db/migrations.js`.
- The `backend` service depends on `backend-migrate` completing successfully in single-host Compose.
- Set `PORTAL_DATABASE_SSL=true` explicitly when the deployment database requires TLS; the bundled Compose Postgres service uses `false`.
- In other orchestrators, model this as an explicit pre-start job/init step; do not rely on the HTTP process to mutate the schema.

The MVP Postgres repository uses transitional JSONB tables for public/portal requests and audit event payloads.
This is acceptable for the current request-review MVP, but it is not the final relational production schema.
Stable request shapes should be split into reviewed relational tables before production go-live.
The migration runner does not seed demo data in production. Development users are seeded only by the local
file-backed repository path, which is rejected when `NODE_ENV=production`.

## Public request MVP API

`POST /api/public/requests` accepts these public request types:

- `appointment`: appointment wishes with contact data, preferred date/window and a short questionnaire.
- `contact`: written contact inquiries with contact channel validation and WhatsApp blocked for health-data inquiries.
- `care`: care/supply requests with prescription availability and a required note when no prescription exists.
- `document`: prescription/document metadata requests with context, file extension, MIME type, size and consent, but no file name, file content or upload object.

All public request types are validated server-side, persisted through the repository, receive a server-generated ID,
start with staff status `new`, set `fileUploadIncluded=false`, set `omniaWriteAllowed=false` and create audit events
for creation/submission. The document path is intentionally metadata-only until quarantine storage, MIME sniffing,
AV scanning and retention are implemented.

Prepared staff endpoints:

- `POST /api/staff/auth/login`
- `GET /api/staff/session`
- `GET /api/staff/requests`
- `GET /api/staff/requests/:id`
- `PATCH /api/staff/requests/:id/status`

The staff status model is `new`, `in_review`, `waiting_for_customer`, `completed`, `cancelled`.
Status changes are audited. Current staff access is still MVP password-session based and marked with
`x-sanipep-staff-boundary: staff-request-mvp`; production IAM/RBAC remains a later step.

Staff auth MVP:

- Staff login uses `POST /api/staff/auth/login` and only accepts users with `staff` or `admin` role.
- Sessions are server-side records addressed by an HTTP-only cookie; the raw session token is never returned in JSON.
- Unsafe authenticated requests must include the CSRF token returned by login/session.
- Login attempts pass through the route-specific `login` rate-limit hook when a concrete limiter is configured.
- Staff list/detail/status endpoints return 401 without a valid session and 403 for non-staff roles.
- Status changes write `portal-request-changed` audit events with staff actor context.
- Production users must be provisioned outside the file-backed development seed path; the MVP does not seed demo data in Postgres.

## ENV groups

See `apps/backend/.env.example`.

Required before production:

- `PORTAL_DATABASE_URL`
- `POSTGRES_POOL_MAX`
- `POSTGRES_STATEMENT_TIMEOUT_MS`
- `PORTAL_REPOSITORY_DRIVER=postgres`
- `REDIS_URL`
- `REDIS_KEY_PREFIX`
- `PORTAL_SESSION_SECRET`
- `CSRF_SECRET`
- `PORTAL_OTP_HASH_SECRET`
- `PORTAL_PASSWORD_PEPPER`
- `UPLOAD_QUARANTINE_BUCKET`
- `UPLOAD_CLEAN_BUCKET`
- `UPLOAD_KMS_KEY_ID`
- `AV_SCANNER_MODE` not equal to `stub-disabled`
- `AUDIT_LOG_HASH_SECRET`
- Omnia variables only when the adapter leaves `read_only`

## Backend modules

- `src/users`: user, customer profile and staff user models
- `src/auth`: password hashing, OTP invite helpers, sessions and role guards
- `src/portalRequests`: request kinds, statuses and transition rules
- `src/uploads`: upload policy, metadata preparation, storage and AV ports
- `src/audit`: audit event helper and sink interface
- `src/omniaAdapter`: read-only/prepared-change boundary
- `src/security`: cookies and rate-limit interface
- `src/db`: query-layer decision, PostgreSQL adapter and database port

## Runtime adapter status

PostgreSQL:

- `src/db/postgres.ts` creates a `pg` pool with connection timeout, idle timeout, pool size and statement timeout from ENV.
- `createPostgresQueryLayer` implements the shared query port and supports transactions.
- `src/repositories/postgresPortalMvpRepository.ts` persists the MVP repository into transitional JSONB tables.
- `src/db/migrations.ts` runs explicit migrations and `assertBackendSchema` guards startup from missing/incompatible schemas.

Redis:

- `src/security/redisClient.ts` creates the Redis client.
- `src/auth/redisSessionStore.ts` persists sessions keyed by hashed session token.
- `src/security/redisRateLimiter.ts` uses atomic `INCR` with TTL windows.
- `src/auth/redisAccountLockoutStore.ts` tracks failed attempts and lockout expiry.

CSRF and cookies:

- Unsafe HTTP methods require a trusted `Origin`.
- Authenticated endpoints can pass a session to `checkCsrf` to verify `x-csrf-token` against the stored CSRF hash.
- Session cookies are serialized as `HttpOnly`, `SameSite=Lax` or `Strict`, `Path=/`, high priority and `Secure` in production or when using `__Host-`.
- In development, the default cookie name intentionally avoids `__Host-` so local HTTP sessions
  can be exercised in browser-based MVP tests.

## Security notes

- Browser state is not trusted.
- Session and CSRF tokens are stored only as hashes in the model.
- Redis session storage persists only hashed tokens and sanitized session metadata.
- OTP codes are returned only for letter/handout delivery and stored only as HMAC hashes.
- Upload file names must never be stored in clear text. The current Portal-MVP API goes further
  and does not accept upload file names at all; it stores only extension,
  MIME type, byte size, safe context, request ID and audit IDs.
- Audit metadata is sanitized and must not contain diagnoses, free text, file contents or patient data.
- Staff/admin role checks must be enforced server-side before any real endpoint is added.
- Account lockout is prepared through Redis counters but must be wired into concrete login/OTP handlers.
- `/readyz` is dependency-oriented: DB and Redis use runtime pings when wired; AV and object storage are reported as not ready until concrete runtime checks are attached.

## Known risks before production

- Migration rollback/down files, online backfill procedures and operational runbooks are not implemented yet.
- The Postgres MVP repository is transitional JSONB storage; production should split stable request shapes into reviewed relational tables before go-live.
- Global backend rate limiting is active in the minimal handler when Redis is configured; route-specific auth/upload limits still need endpoint integration.
- CSRF origin checks are active for unsafe methods; authenticated request creation and status changes
  verify the CSRF token returned by login/session.
- The password hasher is dependency-free `scrypt`; Argon2id should be evaluated before production.
- Redis-backed sessions, CSRF token storage and rate limits are still interfaces/stubs.
- Upload streams are not persisted; object storage and AV scanner are stubs.
- Omnia is not connected and must remain the leading system.
- Backup/restore, retention jobs, SIEM/WORM audit storage and incident runbooks are not implemented.
- Legal basis, consent text, TOMs, AV contracts and deletion policy still require legal review.
