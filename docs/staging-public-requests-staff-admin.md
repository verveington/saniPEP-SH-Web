# Staging Deployment: Public Requests + Staff Admin MVP

This staging path deploys only the public website, the backend, PostgreSQL, Redis and the Staff Admin workbench.
Customer portal UI, production uploads, upload quarantine processing and Omnia integration stay disabled.

## Scope

Enabled:

- public Next.js website
- public request API for appointment, contact, care and document metadata requests
- backend Postgres repository
- backend migration one-shot service
- Redis-backed sessions/rate limits when `REDIS_URL` is configured
- Staff Admin workbench from `apps/admin`
- staff login, request list, request details, status changes and audit display

Disabled / out of scope:

- `apps/portal` customer portal deployment
- real file upload transfer
- upload object creation
- upload quarantine/clean processing
- Omnia writes or reads
- CMS runtime, unless the `cms` profile is deliberately enabled separately

## Environment

Create a real, untracked staging env file from the example:

```bash
cp .env.staging.example .env.staging
```

Replace all placeholder secrets in `.env.staging` from the staging secret store. Do not commit `.env.staging`.

Required staging boundaries:

- `PORTAL_REPOSITORY_DRIVER=postgres`
- `PORTAL_DATABASE_URL` points to the staging Postgres database
- `PORTAL_DATABASE_SSL` matches the staging database
- `TRUSTED_ORIGINS` includes the public staging origin and Staff Admin origin
- `NEXT_PUBLIC_PORTAL_BACKEND_URL` points to the backend API origin
- `VITE_PORTAL_BACKEND_URL` points to the backend API origin
- no `PORTAL_DEV_*` variables are set
- `OMNIA_WRITE_MODE=read_only`

The upload bucket and AV variables are present for readiness planning only. The current public document flow remains metadata-only and must continue to produce no upload objects or file names.

## Build And Config Check

Render the staging Compose configuration before starting services:

```bash
npm run compose:staging:config
```

Equivalent explicit command:

```bash
docker compose --env-file .env.staging \
  -f compose.yaml \
  -f compose.staging.yaml \
  --profile staff-admin \
  config
```

## Start Staging

```bash
docker compose --env-file .env.staging \
  -f compose.yaml \
  -f compose.staging.yaml \
  --profile staff-admin \
  up -d --build postgres redis backend-migrate backend web staff-admin
```

`backend-migrate` is a one-shot service. The backend service depends on it completing successfully before startup.
The Staff Admin service depends on the backend healthcheck.

Put the public website, backend API and Staff Admin behind the staging reverse proxy with TLS. The Staff Admin API is protected by backend staff sessions and CSRF checks, but the static Staff Admin app should still be restricted to the staging staff audience by the hosting layer.

## Validation Gate

Run the migration and public-request gates against staging before sharing the environment:

```bash
export PORTAL_REPOSITORY_DRIVER=postgres
export PORTAL_DATABASE_SSL=false
export PORTAL_DATABASE_URL='postgres://sanipep_app:***@<reachable-staging-postgres-host>:5432/sanipep_portal'
export TRUSTED_ORIGINS='https://staging.example-sanitaetshaus.de,https://staff-staging.example-sanitaetshaus.de'
export VITE_PORTAL_BACKEND_URL='https://api-staging.example-sanitaetshaus.de'

npm run db:migrate
npm run db:migrate
npm run check:backend:migrations
npm run check:public-requests:postgres
```

Do not publish real database passwords in logs or reports. The second migrate run must skip already applied migrations.
If the Compose-managed Postgres service is used, it is network-private by default; run the gate from a host/CI job with a permitted database route, SSH tunnel or equivalent staging network access.

Expected gate result:

- four public requests are created: appointment, contact, care and document
- every request receives a server-side ID
- initial staff status is `new`
- audit events are created
- `fileUploadIncluded=false`
- `omniaWriteAllowed=false`
- `staffReviewRequired=true`
- `uploadObjectsCreated=0`
- no file names are persisted
- Staff login/list/detail/status change work
- logout invalidates the server-side session

## Browser QA

Use the deployed public site and Staff Admin origin:

1. Open the public staging URL.
2. Submit appointment, contact, care and document-metadata requests.
3. Confirm every success message references a server-side request ID.
4. Confirm the document flow does not transfer a file and does not ask for or persist a file name.
5. Open the Staff Admin URL.
6. Log in as a real staging staff/admin user.
7. Filter requests, open details and change one request to `in_review`.
8. Confirm audit entries show the staff actor.
9. Log out and confirm the session no longer loads.

## Rollback

```bash
docker compose --env-file .env.staging \
  -f compose.yaml \
  -f compose.staging.yaml \
  --profile staff-admin \
  down
```

Do not run destructive database migrations as part of rollback. Restore data from the staging backup process if needed.
