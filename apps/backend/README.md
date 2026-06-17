# saniPEP Portal Backend

This app is the separate backend runtime scaffold for portal auth, portal requests and uploads.
It is intentionally separate from the Next.js public website and from Strapi.

Strapi remains CMS-only. Do not store prescription files, health data, portal sessions, upload metadata or Omnia operational data in Strapi.

## Scope of this sprint

Implemented as buildable TypeScript scaffold:

- module structure: `auth`, `users`, `portalRequests`, `uploads`, `audit`, `omniaAdapter`, `security`
- domain models for `User`, `CustomerProfile`, `StaffUser`, `Session`, `OneTimePasswordInvite`, `PortalRequest`, `UploadObject`, `AuditEvent`, `RateLimitEvent`
- PostgreSQL migration draft in `migrations/0001_initial_portal_runtime.sql`
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
- minimal runtime health endpoints: `/healthz`, `/readyz`

Not implemented:

- no production auth
- no production database schema runner
- no production Redis hardening or managed Redis provisioning
- no real object storage
- no real AV scanner
- no real Omnia integration
- no patient data or prescription files
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
npm run check:backend:runtime
npm run start:backend
npm run dev:backend:compose
```

The runtime starts only health endpoints. It does not expose production auth or upload APIs yet.

`npm run check:backend` runs both the shared backend contracts and this runtime backend typecheck.

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

Apply the draft migration manually when the local database is available:

```bash
psql "postgres://sanipep:sanipep-local@localhost:5432/sanipep_portal" \
  -f apps/backend/migrations/0001_initial_portal_runtime.sql
```

Health endpoints:

```bash
curl http://localhost:4100/healthz
curl http://localhost:4100/readyz
```

`/readyz` remains `not_ready` while AV scanning is `stub-disabled`, even if PostgreSQL and Redis are configured.

Production secrets must come from a secret store or hosting environment. Do not commit `.env`, `.env.local` or production values.

## ENV groups

See `apps/backend/.env.example`.

Required before production:

- `PORTAL_DATABASE_URL`
- `POSTGRES_POOL_MAX`
- `POSTGRES_STATEMENT_TIMEOUT_MS`
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
- Migrations are SQL files and are not auto-applied by the app.

Redis:

- `src/security/redisClient.ts` creates the Redis client.
- `src/auth/redisSessionStore.ts` persists sessions keyed by hashed session token.
- `src/security/redisRateLimiter.ts` uses atomic `INCR` with TTL windows.
- `src/auth/redisAccountLockoutStore.ts` tracks failed attempts and lockout expiry.

CSRF and cookies:

- Unsafe HTTP methods require a trusted `Origin`.
- Authenticated endpoints can pass a session to `checkCsrf` to verify `x-csrf-token` against the stored CSRF hash.
- Session cookies are serialized as `HttpOnly`, `SameSite=Lax` or `Strict`, `Path=/`, high priority and `Secure` in production or when using `__Host-`.

## Security notes

- Browser state is not trusted.
- Session and CSRF tokens are stored only as hashes in the model.
- Redis session storage persists only hashed tokens and sanitized session metadata.
- OTP codes are returned only for letter/handout delivery and stored only as HMAC hashes.
- Upload file names are hashed before metadata storage.
- Audit metadata is sanitized and must not contain diagnoses, free text, file contents or patient data.
- Staff/admin role checks must be enforced server-side before any real endpoint is added.
- Account lockout is prepared through Redis counters but must be wired into concrete login/OTP handlers.
- `/readyz` stays `not_ready` while DB, Redis or AV are only stubs.

## Known risks before production

- Database repositories and migrations are not wired to a migration runner yet.
- Redis adapters are prepared, but not yet exercised by real login/session endpoints.
- Global backend rate limiting is active in the minimal handler when Redis is configured; route-specific auth/upload limits still need endpoint integration.
- CSRF origin checks are active for unsafe methods; token verification must be connected when authenticated endpoints are added.
- The password hasher is dependency-free `scrypt`; Argon2id should be evaluated before production.
- Redis-backed sessions, CSRF token storage and rate limits are still interfaces/stubs.
- Upload streams are not persisted; object storage and AV scanner are stubs.
- Omnia is not connected and must remain the leading system.
- Backup/restore, retention jobs, SIEM/WORM audit storage and incident runbooks are not implemented.
- Legal basis, consent text, TOMs, AV contracts and deletion policy still require legal review.
