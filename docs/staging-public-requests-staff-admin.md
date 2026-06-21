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
The `.invalid` hostnames in `.env.staging.example` are placeholders. Replace them with domains owned by the project before using the reverse proxy or sharing a public staging URL.

Required staging boundaries:

- `PORTAL_REPOSITORY_DRIVER=postgres`
- `PORTAL_DATABASE_URL` points to the staging Postgres database
- `PORTAL_DATABASE_SSL` matches the staging database
- `TRUSTED_ORIGINS` includes the public staging origin and Staff Admin origin
- `NEXT_PUBLIC_PORTAL_BACKEND_URL` points to the backend API origin
- `VITE_PORTAL_BACKEND_URL` points to the backend API origin
- no `PORTAL_DEV_*` variables are set
- `OMNIA_WRITE_MODE=read_only`
- `BACKEND_NODE_ENV=production` for real HTTPS staging

The upload bucket and AV variables are present for readiness planning only. The current public document flow remains metadata-only and must continue to produce no upload objects or file names.

### Internal Server-IP Test

For an internal LAN/VPN-only test on server IP `10.0.60.13`, use the separate template:

```bash
cp .env.staging.internal.example .env.staging.internal
```

Replace placeholder secrets in `.env.staging.internal` from the internal secret store. Do not commit `.env.staging.internal`.

The internal template uses:

- `NEXT_PUBLIC_SITE_URL=http://10.0.60.13:3000`
- `NEXT_PUBLIC_PORTAL_BACKEND_URL=http://10.0.60.13:4100`
- `VITE_PORTAL_BACKEND_URL=http://10.0.60.13:4100`
- `STAFF_ADMIN_PUBLIC_URL=http://10.0.60.13:5184`
- `PORTAL_BACKEND_BASE_URL=http://10.0.60.13:4100`
- `TRUSTED_ORIGINS=http://10.0.60.13:3000,http://10.0.60.13:5184,http://10.0.60.13:5185`
- `PORTAL_REPOSITORY_DRIVER=postgres`
- `OMNIA_WRITE_MODE=read_only`

The backend code intentionally blocks `http://` origins and backend base URLs when `NODE_ENV=production`. Therefore the internal template sets `BACKEND_NODE_ENV=development` explicitly for this server-IP smoke test. This is not a public staging mode and must not be used as a production relaxation. A public staging release requires owned domains and HTTPS.

The internal template also uses a non-`__Host-` session cookie name because browser clients do not persist `Secure` `__Host-*` cookies over plain HTTP.

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
  up -d --build postgres redis backend-migrate backend web staff-admin staging-proxy
```

`backend-migrate` is a one-shot service. The backend service depends on it completing successfully before startup.
The Staff Admin service depends on the backend healthcheck.
The `staging-proxy` service terminates TLS with Caddy and routes the public staging hostnames to the internal Compose services:

- `${STAGING_WEB_HOST}` -> `web:3000`
- `${STAGING_STAFF_HOST}` -> `staff-admin:8080`
- `${STAGING_API_HOST}` -> `backend:4100`

The Staff Admin API is protected by backend staff sessions and CSRF checks, but the static Staff Admin app should still be restricted to the staging staff audience by the hosting layer.
For automatic public TLS, DNS for all three hostnames must point to the staging host and inbound ports 80 and 443 must be reachable by the ACME issuer.

### Start Internal Server-IP Test

Do not start the TLS reverse proxy for the server-IP test. Rebuild Staff Admin so its static bundle points to `http://10.0.60.13:4100`:

```bash
docker compose --env-file .env.staging.internal \
  -f compose.yaml \
  -f compose.staging.yaml \
  --profile staff-admin \
  up -d --build postgres redis backend-migrate backend web staff-admin
```

This starts only the direct-port services:

- public web on `http://10.0.60.13:3000`
- backend API on `http://10.0.60.13:4100`
- Staff Admin on `http://10.0.60.13:5184`
- optional Staff Admin dev server on `http://10.0.60.13:5185`

The internal test remains out of scope for uploads, customer portal, CMS and Omnia writes.

## Validation Gate

Run the migration and public-request gates against staging before sharing the environment:

```bash
export PORTAL_REPOSITORY_DRIVER=postgres
export PORTAL_DATABASE_SSL=false
export PORTAL_DATABASE_URL='postgres://sanipep_app:***@<reachable-staging-postgres-host>:5432/sanipep_portal'
export TRUSTED_ORIGINS='https://<owned-web-staging-host>,https://<owned-staff-staging-host>'
export VITE_PORTAL_BACKEND_URL='https://<owned-api-staging-host>'

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

## Reverse Proxy Smoke Test

Run these checks from the staging host or a network path that resolves the owned staging DNS names to the proxy:

```bash
curl -I https://<owned-web-staging-host>
curl -I https://<owned-staff-staging-host>
curl -i https://<owned-api-staging-host>/api/staff/session
```

Expected result:

- public web returns `200`
- Staff Admin returns `200` and includes `X-Robots-Tag: noindex, nofollow`
- unauthenticated Staff Session returns `401`

## Internal Server-IP Smoke Test

Run these checks from the LAN/VPN path that can reach `10.0.60.13`:

```bash
curl -I http://10.0.60.13:3000/
curl -I http://10.0.60.13:5184/
curl -i http://10.0.60.13:4100/api/staff/session
npm run check:public-requests
npm run check:public-requests:postgres
```

Expected result:

- public web returns `200`
- Staff Admin returns `200` and should not show `Failed to fetch` in the browser
- unauthenticated Staff Session returns `401`
- public request checks stay green with `uploadObjectsCreated=0`

## Rollback

```bash
docker compose --env-file .env.staging \
  -f compose.yaml \
  -f compose.staging.yaml \
  --profile staff-admin \
  down
```

Do not run destructive database migrations as part of rollback. Restore data from the staging backup process if needed.
