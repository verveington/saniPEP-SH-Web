import { createHash } from "node:crypto";
import { createBackendRequestHandler } from "../apps/backend/dist/app.js";
import { loadBackendEnv } from "../apps/backend/dist/config/env.js";
import { assertBackendSchema, loadBackendMigrations } from "../apps/backend/dist/db/migrations.js";
import { createPostgresPool, createPostgresQueryLayer } from "../apps/backend/dist/db/postgres.js";
import { createPostgresPortalMvpRepository } from "../apps/backend/dist/repositories/postgresPortalMvpRepository.js";

const databaseUrl = process.env.PORTAL_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("PORTAL_DATABASE_URL is required for the Postgres public-request check.");
}
if (process.env.NODE_ENV === "production") {
  throw new Error("Do not run the Postgres MVP check with NODE_ENV=production; it creates temporary test users and requests.");
}

const origin = process.env.POSTGRES_MVP_CHECK_ORIGIN ?? "http://localhost:5184";
const runId = `pgcheck_${process.pid}_${Date.now()}`;
const customerUserId = `usr_${runId}_customer`;
const staffUserId = `usr_${runId}_staff`;
const customerEmail = `${runId}.customer@example.test`;
const staffEmail = `${runId}.staff@example.test`;
const customerPassword = `customer-${runId}-password`;
const staffPassword = `staff-${runId}-password`;
const temporaryUserIds = [customerUserId, staffUserId];
const createdRequestIds = [];

const env = loadBackendEnv({
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: process.env.PORT ?? "4100",
  PORTAL_BACKEND_BASE_URL: process.env.PORTAL_BACKEND_BASE_URL ?? "http://localhost:4100",
  TRUSTED_ORIGINS: process.env.TRUSTED_ORIGINS ?? origin,
  PORTAL_DATABASE_URL: databaseUrl,
  PORTAL_DATABASE_SSL: process.env.PORTAL_DATABASE_SSL ?? "false",
  PORTAL_REPOSITORY_DRIVER: "postgres",
  PORTAL_SESSION_SECRET: process.env.PORTAL_SESSION_SECRET ?? "local-session-secret-for-postgres-check",
  CSRF_SECRET: process.env.CSRF_SECRET ?? "local-csrf-secret-for-postgres-check",
  PORTAL_OTP_HASH_SECRET: process.env.PORTAL_OTP_HASH_SECRET ?? "local-otp-secret-for-postgres-check",
  PORTAL_PASSWORD_PEPPER: process.env.PORTAL_PASSWORD_PEPPER ?? "local-password-pepper-for-postgres-check",
  AUDIT_LOG_HASH_SECRET: process.env.AUDIT_LOG_HASH_SECRET ?? "local-audit-secret-for-postgres-check",
});

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const pool = createPostgresPool(env);

try {
  await assertBackendSchema(pool);
  const migrationStatus = await assertMigrationHistory(pool);
  const initialUploadObjectCount = await countRows("upload_objects");

  await seedTemporaryUser({
    userId: customerUserId,
    email: customerEmail,
    role: "customer",
    password: customerPassword,
    safeDisplayName: "Postgres Check Customer",
    customerProfileId: `cst_${runId}`,
  });
  await seedTemporaryUser({
    userId: staffUserId,
    email: staffEmail,
    role: "staff",
    password: staffPassword,
    safeDisplayName: "Postgres Check Staff",
    staffUserId: `staff_${runId}`,
  });

  const repository = createPostgresPortalMvpRepository(createPostgresQueryLayer(pool));
  const handler = createBackendRequestHandler(env, { repository });
  const request = createRequestHarness(handler);

  const validRequests = [
    {
      type: "appointment",
      concern: "Erstberatung",
      preferredDate: "2026-06-24",
      preferredWindow: "10:00 - 11:00",
      hasPrescription: false,
      shortQuestionnaire: "Bitte Rueckruf zur Vorbereitung der Beratung.",
      contactName: "Max Mustermann",
      contactEmail: "max@example.test",
      contactPhone: "",
    },
    {
      type: "contact",
      topic: "Rueckrufwunsch",
      serviceContext: "Kompression",
      message: "Bitte melden Sie sich zur Abstimmung der naechsten Schritte.",
      contactName: "Erika Musterfrau",
      contactEmail: "erika@example.test",
      contactPhone: "",
      preferredContactChannel: "email",
      containsHealthData: false,
    },
    {
      type: "care",
      need: "Pflegehilfsmittel Pauschale",
      rhythm: "monatlich",
      hasPrescription: false,
      note: "Bitte monatliche Versorgung und Rueckruf pruefen.",
      contactName: "Sam Beispiel",
      contactEmail: "",
      contactPhone: "+49 431 123456",
    },
    {
      type: "document",
      context: "Kompressionsversorgung",
      fileExtension: "pdf",
      mimeType: "application/pdf",
      sizeBytes: 128000,
      consentAccepted: true,
      contactName: "Dana Dokument",
      contactEmail: "dana@example.test",
      contactPhone: "",
    },
  ];

  for (const input of validRequests) {
    const response = await request("POST", "/api/public/requests", input);
    assert(response.status === 201, `Expected public request 201, got ${response.status}`);
    assert(typeof response.body.request?.id === "string", "Public request did not return a server id");
    assert(response.body.request.status === "new", "Public request must start with staff status new");
    assert(response.body.request.fileUploadIncluded === false, "Public request must not include file upload");
    assert(response.body.request.omniaWriteAllowed === false, "Public request must not allow Omnia writes");
    assert(response.body.request.staffReviewRequired === true, "Public request must require staff review");
    createdRequestIds.push(response.body.request.id);
  }

  const persistedRequests = await pool.query(
    "SELECT data FROM portal_mvp_requests WHERE id = ANY($1::text[]) ORDER BY created_at_iso",
    [createdRequestIds],
  );
  assert(persistedRequests.rows.length === 4, `Expected 4 Postgres requests, got ${persistedRequests.rows.length}`);
  for (const row of persistedRequests.rows) {
    const requestData = row.data;
    assert(requestData.employeeStatus === "new", "Persisted request must start with staff status new");
    assert(requestData.staffReviewRequired === true, "Persisted request must require staff review");
    assert(requestData.omniaWriteAllowed === false, "Persisted request must block Omnia writes");
    assert(requestData.publicRequest?.boundary?.fileUploadIncluded === false, "Public request boundary must block file uploads");
    assert(!requestData.uploadObject, "Public request must not create uploadObject data");
    assert(!JSON.stringify(requestData).includes("fileName"), "Public request must not persist file names");
  }

  const auditRows = await pool.query(
    "SELECT data FROM portal_mvp_audit_events WHERE request_id = ANY($1::text[])",
    [createdRequestIds],
  );
  assert(auditRows.rows.filter((row) => row.data.action === "public-request-created").length === 4, "Missing public-request-created audit events");
  assert(auditRows.rows.filter((row) => row.data.action === "public-request-submitted").length === 4, "Missing public-request-submitted audit events");

  const rejectedLogin = await request("POST", "/api/staff/auth/login", {
    email: staffEmail,
    password: "wrong-password",
  });
  assert(rejectedLogin.status === 401, `Rejected staff login should fail with 401, got ${rejectedLogin.status}`);
  assert(rejectedLogin.headers["x-ratelimit-login-limit"] === "5", "Rejected login must expose login rate-limit policy");

  const anonymousStaffList = await request("GET", "/api/staff/requests");
  assert(anonymousStaffList.status === 401, `Anonymous staff list should fail with 401, got ${anonymousStaffList.status}`);

  const customerLogin = await request("POST", "/api/auth/login", {
    email: customerEmail,
    password: customerPassword,
  });
  assert(customerLogin.status === 200, `Customer login failed with ${customerLogin.status}`);
  const customerCookie = cookieHeaderFromSetCookie(customerLogin.headers["set-cookie"]);
  const customerStaffList = await request("GET", "/api/staff/requests", undefined, {
    cookie: customerCookie,
  });
  assert(customerStaffList.status === 403, `Customer staff list should fail with 403, got ${customerStaffList.status}`);

  const staffLogin = await request("POST", "/api/staff/auth/login", {
    email: staffEmail,
    password: staffPassword,
  });
  assert(staffLogin.status === 200, `Staff login failed with ${staffLogin.status}`);
  assert(staffLogin.body.session?.role === "staff", "Staff login did not return staff role");
  const staffSetCookie = staffLogin.headers["set-cookie"];
  assert(String(staffSetCookie).includes("HttpOnly"), "Staff cookie must be HttpOnly");
  assert(String(staffSetCookie).includes("SameSite=Strict"), "Staff cookie must use SameSite=Strict");
  if (env.nodeEnv !== "development") {
    assert(String(staffSetCookie).includes("Secure"), "Non-development staff cookie must be Secure");
  }
  const staffCookie = cookieHeaderFromSetCookie(staffSetCookie);

  const staffList = await request("GET", "/api/staff/requests?status=new", undefined, {
    cookie: staffCookie,
  });
  assert(staffList.status === 200, `Staff list failed with ${staffList.status}`);
  for (const requestId of createdRequestIds) {
    assert(staffList.body.requests.some((item) => item.id === requestId), `Staff list is missing request ${requestId}`);
  }

  const documentRequest = staffList.body.requests.find((item) => item.requestType === "document");
  assert(documentRequest, "Staff list did not include document metadata request");
  const documentDetail = await request("GET", `/api/staff/requests/${documentRequest.id}`, undefined, {
    cookie: staffCookie,
  });
  assert(documentDetail.status === 200, `Staff detail failed with ${documentDetail.status}`);
  assert(documentDetail.body.request.publicRequest?.contact, "Staff detail did not include public contact details");
  assert(
    documentDetail.body.request.publicRequest?.document?.uploadMode === "metadata-only-no-file-transfer",
    "Document request must remain metadata-only",
  );

  const invalidCsrf = await request("PATCH", `/api/staff/requests/${documentRequest.id}/status`, {
    status: "in_review",
  }, {
    cookie: staffCookie,
    "x-csrf-token": "invalid-csrf-token",
  });
  assert(invalidCsrf.status === 403, `Invalid CSRF should fail with 403, got ${invalidCsrf.status}`);

  const statusChange = await request("PATCH", `/api/staff/requests/${documentRequest.id}/status`, {
    status: "in_review",
  }, {
    cookie: staffCookie,
    "x-csrf-token": staffLogin.body.csrfToken,
  });
  assert(statusChange.status === 200, `Staff status change failed with ${statusChange.status}`);
  assert(statusChange.body.request.staffStatus === "in_review", "Staff status change did not persist in_review");

  const changedAuditRows = await pool.query(
    "SELECT data FROM portal_mvp_audit_events WHERE request_id = $1 AND actor_user_id = $2",
    [documentRequest.id, staffUserId],
  );
  assert(
    changedAuditRows.rows.some((row) =>
      row.data.action === "portal-request-changed" &&
      row.data.metadata?.actorStaffUserId === `staff_${runId}` &&
      row.data.metadata?.nextStaffStatus === "in_review"),
    "Missing staff actor context on Postgres status-change audit event",
  );

  const logout = await request("POST", "/api/auth/logout", undefined, {
    cookie: staffCookie,
    "x-csrf-token": staffLogin.body.csrfToken,
  });
  assert(logout.status === 200, `Staff logout failed with ${logout.status}`);
  assert(String(logout.headers["set-cookie"]).includes("Max-Age=0"), "Logout must expire the session cookie");
  const afterLogout = await request("GET", "/api/staff/session", undefined, {
    cookie: staffCookie,
  });
  assert(afterLogout.status === 401, `Session must be invalid after logout, got ${afterLogout.status}`);

  const finalUploadObjectCount = await countRows("upload_objects");
  assert(finalUploadObjectCount === initialUploadObjectCount, "Postgres public-request check must not create upload_objects rows");
  const uploadObjectsCreated = persistedRequests.rows.filter((row) => row.data.uploadObject).length;
  assert(uploadObjectsCreated === 0, "Postgres public-request check must not create uploadObject payloads");

  console.log("Postgres Public Request API check passed");
  console.log(JSON.stringify({
    migrations: migrationStatus,
    requests: createdRequestIds.length,
    auditEvents: auditRows.rows.length + changedAuditRows.rows.length,
    staffListItems: staffList.body.requests.length,
    uploadObjectsCreated,
  }, null, 2));
} finally {
  await cleanupTemporaryData().catch((error) => {
    console.warn(`Postgres MVP check cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
  });
  await pool.end();
}

async function assertMigrationHistory(pool) {
  await assertBackendSchema(pool);
  const migrations = await loadBackendMigrations();
  const history = await pool.query(
    "SELECT version, checksum_sha256 FROM schema_migrations ORDER BY version",
  );
  const historyByVersion = new Map(history.rows.map((row) => [row.version, row.checksum_sha256]));
  for (const migration of migrations) {
    assert(historyByVersion.get(migration.version) === migration.checksumSha256, `Migration checksum mismatch for ${migration.version}`);
  }
  for (const tableName of [
    "schema_migrations",
    "portal_mvp_users",
    "portal_mvp_sessions",
    "portal_mvp_requests",
    "portal_mvp_audit_events",
  ]) {
    const result = await pool.query("SELECT to_regclass($1) IS NOT NULL AS exists", [`public.${tableName}`]);
    assert(result.rows[0]?.exists === true, `Required table ${tableName} is missing`);
  }
  return {
    applied: migrations.length,
    versions: migrations.map((migration) => migration.version),
  };
}

async function seedTemporaryUser(input) {
  const user = {
    userId: input.userId,
    email: input.email,
    role: input.role,
    status: "active",
    passwordHashSha256: hashPassword(input.password),
    customerProfileId: input.customerProfileId,
    staffUserId: input.staffUserId,
    safeDisplayName: input.safeDisplayName,
  };
  await pool.query(
    `INSERT INTO portal_mvp_users (user_id, email_ci, role, status, data, updated_at)
     VALUES ($1, lower($2), $3, $4, $5::jsonb, now())
     ON CONFLICT (user_id) DO UPDATE SET
       email_ci = EXCLUDED.email_ci,
       role = EXCLUDED.role,
       status = EXCLUDED.status,
       data = EXCLUDED.data,
       updated_at = now()`,
    [input.userId, input.email, input.role, "active", JSON.stringify(user)],
  );
}

function createRequestHarness(handler) {
  return async function request(method, url, body, headers = {}) {
    const requestHeaders = {
      origin,
      ...headers,
    };
    if (body !== undefined) requestHeaders["content-type"] = "application/json";

    const rawBody = body === undefined ? undefined : Buffer.from(JSON.stringify(body), "utf8");
    const incoming = {
      method,
      url,
      headers: requestHeaders,
      socket: {
        remoteAddress: "127.0.0.1",
      },
      async *[Symbol.asyncIterator]() {
        if (rawBody) yield rawBody;
      },
    };

    return new Promise((resolve) => {
      const outgoing = {
        statusCode: 200,
        headers: {},
        setHeader(name, value) {
          this.headers[name.toLowerCase()] = value;
        },
        end(payload = "") {
          const text = Buffer.isBuffer(payload) ? payload.toString("utf8") : String(payload);
          resolve({
            status: this.statusCode,
            headers: this.headers,
            body: text ? JSON.parse(text) : {},
          });
        },
      };

      handler(incoming, outgoing);
    });
  };
}

function hashPassword(password) {
  return createHash("sha256").update(`${env.passwordPepper}:${password}`).digest("hex");
}

function cookieHeaderFromSetCookie(setCookie) {
  return (Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0];
}

async function countRows(tableName) {
  const result = await pool.query(`SELECT count(*)::integer AS count FROM ${tableName}`);
  return result.rows[0]?.count ?? 0;
}

async function cleanupTemporaryData() {
  if (createdRequestIds.length > 0) {
    await pool.query("DELETE FROM portal_mvp_audit_events WHERE request_id = ANY($1::text[])", [createdRequestIds]);
    await pool.query("DELETE FROM portal_mvp_requests WHERE id = ANY($1::text[])", [createdRequestIds]);
  }
  await pool.query("DELETE FROM portal_mvp_sessions WHERE user_id = ANY($1::text[])", [temporaryUserIds]);
  await pool.query("DELETE FROM portal_mvp_audit_events WHERE actor_user_id = ANY($1::text[])", [temporaryUserIds]);
  await pool.query("DELETE FROM portal_mvp_users WHERE user_id = ANY($1::text[])", [temporaryUserIds]);
}
