import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createBackendRequestHandler } from "../apps/backend/dist/app.js";
import { loadBackendEnv } from "../apps/backend/dist/config/env.js";
import { serializeSessionCookie } from "../apps/backend/dist/security/cookies.js";

const storePath = path.join(os.tmpdir(), `sanipep-public-request-check-${process.pid}.json`);
const origin = "http://localhost:3000";
const customerEmail = `customer-${process.pid}@example.test`;
const customerPassword = `customer-check-password-${process.pid}`;
const staffEmail = `staff-${process.pid}@example.test`;
const staffPassword = `staff-check-password-${process.pid}`;

const env = loadBackendEnv({
  NODE_ENV: "development",
  PORT: "4100",
  PORTAL_BACKEND_BASE_URL: "http://localhost:4100",
  TRUSTED_ORIGINS: origin,
  PORTAL_STORE_PATH: storePath,
  PORTAL_SESSION_SECRET: "local-session-secret-for-public-request-check",
  CSRF_SECRET: "local-csrf-secret-for-public-request-check",
  PORTAL_OTP_HASH_SECRET: "local-otp-secret-for-public-request-check",
  PORTAL_PASSWORD_PEPPER: "local-password-pepper-for-public-request-check",
  AUDIT_LOG_HASH_SECRET: "local-audit-secret-for-public-request-check",
  PORTAL_DEV_CUSTOMER_EMAIL: customerEmail,
  PORTAL_DEV_CUSTOMER_PASSWORD: customerPassword,
  PORTAL_DEV_CUSTOMER_DISPLAY_NAME: "Check Customer",
  PORTAL_DEV_STAFF_EMAIL: staffEmail,
  PORTAL_DEV_STAFF_PASSWORD: staffPassword,
  PORTAL_DEV_STAFF_DISPLAY_NAME: "Check Staff",
});

const handler = createBackendRequestHandler(env);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertThrows = (handler, expectedMessage) => {
  try {
    handler();
  } catch (error) {
    assert(error instanceof Error && error.message.includes(expectedMessage), `Expected error containing ${expectedMessage}`);
    return;
  }
  throw new Error(`Expected error containing ${expectedMessage}`);
};

const productionEnvSource = {
  NODE_ENV: "production",
  PORT: "4100",
  PORTAL_BACKEND_BASE_URL: "https://api.example.test",
  TRUSTED_ORIGINS: "https://www.example.test",
  PORTAL_DATABASE_URL: "postgres://user:password@postgres:5432/sanipep",
  PORTAL_DATABASE_SSL: "true",
  PORTAL_REPOSITORY_DRIVER: "postgres",
  REDIS_URL: "redis://redis:6379",
  PORTAL_SESSION_COOKIE_NAME: "__Host-sanipep_portal_session",
  PORTAL_SESSION_SECRET: "production-session-secret-32-plus-chars",
  CSRF_SECRET: "production-csrf-secret-32-plus-chars",
  PORTAL_OTP_HASH_SECRET: "production-otp-secret-32-plus-chars",
  PORTAL_PASSWORD_PEPPER: "production-password-pepper-32-plus-chars",
  AUDIT_LOG_HASH_SECRET: "production-audit-secret-32-plus-chars",
  UPLOAD_QUARANTINE_BUCKET: "quarantine",
  UPLOAD_CLEAN_BUCKET: "clean",
  UPLOAD_KMS_KEY_ID: "kms-key",
  AV_SCANNER_MODE: "managed",
};

assertThrows(
  () => loadBackendEnv({ ...productionEnvSource, PORTAL_PASSWORD_PEPPER: "" }),
  "PORTAL_PASSWORD_PEPPER",
);
assertThrows(
  () => loadBackendEnv({
    ...productionEnvSource,
    PORTAL_DEV_STAFF_EMAIL: "staff.local@example.test",
    PORTAL_DEV_STAFF_PASSWORD: "local-development-password",
  }),
  "PORTAL_DEV_STAFF_* is development-only",
);
const productionEnv = loadBackendEnv(productionEnvSource);
const productionCookie = serializeSessionCookie("production-session-token", productionEnv, true);
assert(productionCookie.includes("HttpOnly"), "Production session cookie must be HttpOnly");
assert(productionCookie.includes("Secure"), "Production session cookie must be Secure");
assert(productionCookie.includes("SameSite=Strict"), "Staff session cookie must use SameSite=Strict");

async function request(method, url, body, headers = {}) {
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

  const response = await new Promise((resolve) => {
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

  return response;
}

try {
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
    assert(typeof response.body.request?.id === "string", "Public request did not return an id");
    assert(response.body.request.fileUploadIncluded === false, "Public request must not include file upload");
    assert(response.body.request.omniaWriteAllowed === false, "Public request must not allow Omnia writes");
  }

  const invalid = await request("POST", "/api/public/requests", {
    type: "contact",
    topic: "Rueckrufwunsch",
    serviceContext: "Kompression",
    message: "Bitte melden.",
    contactName: "M",
    contactEmail: "",
    contactPhone: "",
    preferredContactChannel: "email",
    containsHealthData: false,
  });
  assert(invalid.status === 400, `Invalid public request should fail with 400, got ${invalid.status}`);

  const rejectedLogin = await request("POST", "/api/staff/auth/login", {
    email: staffEmail,
    password: "wrong-password",
  });
  assert(rejectedLogin.status === 401, `Rejected staff login should fail with 401, got ${rejectedLogin.status}`);
  assert(rejectedLogin.headers["x-ratelimit-login-limit"] === "5", "Rejected login must expose the login rate-limit policy");

  const anonymousStaffList = await request("GET", "/api/staff/requests");
  assert(anonymousStaffList.status === 401, `Anonymous staff list should fail with 401, got ${anonymousStaffList.status}`);

  const customerLogin = await request("POST", "/api/auth/login", {
    email: customerEmail,
    password: customerPassword,
  });
  assert(customerLogin.status === 200, `Customer login failed with ${customerLogin.status}`);
  const customerSetCookie = customerLogin.headers["set-cookie"];
  const customerCookieHeader = (Array.isArray(customerSetCookie) ? customerSetCookie[0] : customerSetCookie).split(";")[0];
  const customerStaffList = await request("GET", "/api/staff/requests", undefined, {
    cookie: customerCookieHeader,
  });
  assert(customerStaffList.status === 403, `Customer staff list should fail with 403, got ${customerStaffList.status}`);

  const staffLogin = await request("POST", "/api/staff/auth/login", {
    email: staffEmail,
    password: staffPassword,
  });
  assert(staffLogin.status === 200, `Staff login failed with ${staffLogin.status}`);
  assert(staffLogin.body.session?.role === "staff", "Staff login did not return a staff session");
  const setCookie = staffLogin.headers["set-cookie"];
  assert(String(setCookie).includes("HttpOnly"), "Staff login cookie must be HttpOnly");
  assert(String(setCookie).includes("SameSite=Strict"), "Staff login cookie must use SameSite=Strict");
  const cookieHeader = (Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0];

  const staffList = await request("GET", "/api/staff/requests", undefined, {
    cookie: cookieHeader,
  });
  assert(staffList.status === 200, `Staff list failed with ${staffList.status}`);
  assert(staffList.body.requests.length === 4, `Expected 4 staff requests, got ${staffList.body.requests.length}`);
  assert(staffList.body.statusModel.some((item) => item.value === "waiting_for_customer"), "Staff status model is incomplete");
  assert(staffList.body.mvpBoundary?.productionReady === false, "Staff list must be marked as MVP-only");
  assert(staffList.headers["x-sanipep-staff-boundary"] === "staff-request-mvp", "Staff list boundary header is missing");

  const documentRequest = staffList.body.requests.find((item) => item.requestType === "document");
  assert(documentRequest, "Staff list did not include document metadata request");
  const documentDetail = await request("GET", `/api/staff/requests/${documentRequest.id}`, undefined, {
    cookie: cookieHeader,
  });
  assert(documentDetail.status === 200, `Staff detail failed with ${documentDetail.status}`);
  assert(documentDetail.body.request.publicRequest?.contact, "Staff detail did not include public contact details");
  assert(documentDetail.body.request.publicRequest?.document?.uploadMode === "metadata-only-no-file-transfer", "Document request must remain metadata-only");
  assert(documentDetail.body.mvpBoundary?.productionReady === false, "Staff detail must be marked as MVP-only");

  const missingDetail = await request("GET", "/api/staff/requests/not-a-real-request", undefined, {
    cookie: cookieHeader,
  });
  assert(missingDetail.status === 404, `Missing staff detail should fail with 404, got ${missingDetail.status}`);

  const invalidStatus = await request("PATCH", `/api/staff/requests/${documentRequest.id}/status`, {
    status: "bad_status",
  }, {
    cookie: cookieHeader,
    "x-csrf-token": staffLogin.body.csrfToken,
  });
  assert(invalidStatus.status === 400, `Invalid staff status should fail with 400, got ${invalidStatus.status}`);

  const invalidCsrf = await request("PATCH", `/api/staff/requests/${documentRequest.id}/status`, {
    status: "in_review",
  }, {
    cookie: cookieHeader,
    "x-csrf-token": "invalid-csrf-token",
  });
  assert(invalidCsrf.status === 403, `Invalid CSRF should fail with 403, got ${invalidCsrf.status}`);

  const statusChange = await request("PATCH", `/api/staff/requests/${documentRequest.id}/status`, {
    status: "in_review",
  }, {
    cookie: cookieHeader,
    "x-csrf-token": staffLogin.body.csrfToken,
  });
  assert(statusChange.status === 200, `Staff status change failed with ${statusChange.status}`);
  assert(statusChange.body.request.staffStatus === "in_review", "Staff status change did not persist in_review");

  const logout = await request("POST", "/api/auth/logout", undefined, {
    cookie: cookieHeader,
    "x-csrf-token": staffLogin.body.csrfToken,
  });
  assert(logout.status === 200, `Staff logout failed with ${logout.status}`);
  assert(String(logout.headers["set-cookie"]).includes("Max-Age=0"), "Logout must expire the session cookie");
  const afterLogout = await request("GET", "/api/staff/session", undefined, {
    cookie: cookieHeader,
  });
  assert(afterLogout.status === 401, `Session must be invalid after logout, got ${afterLogout.status}`);

  const store = JSON.parse(await readFile(storePath, "utf8"));
  assert(store.requests.length === 4, `Expected 4 persisted requests, got ${store.requests.length}`);
  assert(store.requests.every((item) => !item.uploadObject), "Public requests must not create upload objects");
  assert(store.auditEvents.filter((item) => item.action === "public-request-submitted").length === 4, "Missing public request audit events");
  assert(
    store.auditEvents.some((item) => item.action === "portal-request-changed" && item.actorUserId === "usr_dev_staff"),
    "Missing staff actor context on status change audit event",
  );

  console.log("Public Request API check passed");
  console.log(JSON.stringify({
    requests: store.requests.length,
    auditEvents: store.auditEvents.length,
    staffListItems: staffList.body.requests.length,
    uploadObjectsCreated: store.requests.filter((item) => item.uploadObject).length,
  }, null, 2));
} finally {
  await rm(storePath, { force: true });
}
