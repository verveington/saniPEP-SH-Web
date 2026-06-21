import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createBackendRequestHandler } from "../apps/backend/dist/app.js";
import { loadBackendEnv } from "../apps/backend/dist/config/env.js";

const runId = `staffmvp_${process.pid}`;
const storePath = path.join(os.tmpdir(), `${runId}.json`);
const origin = "http://localhost:5184";
const customerEmail = `${runId}.customer@example.test`;
const customerPassword = `${runId}-customer-password`;
const staffEmail = `${runId}.staff@example.test`;
const staffPassword = `${runId}-staff-password`;

const env = loadBackendEnv({
  NODE_ENV: "development",
  PORT: "4100",
  PORTAL_BACKEND_BASE_URL: "http://localhost:4100",
  TRUSTED_ORIGINS: origin,
  PORTAL_STORE_PATH: storePath,
  PORTAL_SESSION_SECRET: "staff-mvp-local-session-secret",
  CSRF_SECRET: "staff-mvp-local-csrf-secret",
  PORTAL_OTP_HASH_SECRET: "staff-mvp-local-otp-secret",
  PORTAL_PASSWORD_PEPPER: "staff-mvp-local-password-pepper",
  AUDIT_LOG_HASH_SECRET: "staff-mvp-local-audit-secret",
  PORTAL_DEV_CUSTOMER_EMAIL: customerEmail,
  PORTAL_DEV_CUSTOMER_PASSWORD: customerPassword,
  PORTAL_DEV_CUSTOMER_DISPLAY_NAME: "MVP Test Kunde",
  PORTAL_DEV_STAFF_EMAIL: staffEmail,
  PORTAL_DEV_STAFF_PASSWORD: staffPassword,
  PORTAL_DEV_STAFF_DISPLAY_NAME: "MVP Test Staff",
});

const handler = createBackendRequestHandler(env);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

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
}

const publicRequests = [
  {
    key: "appointment",
    finalStatus: "new",
    body: {
      type: "appointment",
      concern: "Kompressionsberatung",
      preferredDate: "2026-07-02",
      preferredWindow: "09:00 - 10:00",
      hasPrescription: false,
      shortQuestionnaire: "Bitte Terminwunsch fuer eine Beratung telefonisch bestaetigen.",
      contactName: "Ari Termin",
      contactEmail: "ari.termin@example.test",
      contactPhone: "",
    },
  },
  {
    key: "contact",
    finalStatus: "in_review",
    body: {
      type: "contact",
      topic: "Rueckruf zur Versorgung",
      serviceContext: "Brustprothetik",
      message: "Bitte Rueckruf zur internen Zuordnung der Anfrage vorbereiten.",
      contactName: "Kai Kontakt",
      contactEmail: "kai.kontakt@example.test",
      contactPhone: "",
      preferredContactChannel: "email",
      containsHealthData: false,
    },
  },
  {
    key: "care",
    finalStatus: "waiting_for_customer",
    body: {
      type: "care",
      need: "Pflegehilfsmittel Pauschale",
      rhythm: "monatlich",
      hasPrescription: false,
      note: "Bitte Anspruch und bevorzugten Rueckrufweg fuer die Testabnahme pruefen.",
      contactName: "Noa Versorgung",
      contactEmail: "",
      contactPhone: "+49 000 0000000",
    },
  },
  {
    key: "document",
    finalStatus: "completed",
    body: {
      type: "document",
      context: "Kompressionsversorgung",
      fileExtension: "pdf",
      mimeType: "application/pdf",
      sizeBytes: 96000,
      consentAccepted: true,
      contactName: "Mika Rezept",
      contactEmail: "mika.rezept@example.test",
      contactPhone: "",
    },
  },
  {
    key: "cancelled-contact",
    finalStatus: "cancelled",
    body: {
      type: "contact",
      topic: "Allgemeine Rueckfrage",
      serviceContext: "Bandage",
      message: "Bitte fuer den internen Test als abgebrochenen Vorgang behandeln.",
      contactName: "Toni Rueckfrage",
      contactEmail: "toni.rueckfrage@example.test",
      contactPhone: "",
      preferredContactChannel: "email",
      containsHealthData: false,
    },
  },
];

try {
  const unauthenticatedSession = await request("GET", "/api/staff/session");
  assert(unauthenticatedSession.status === 401, `Unauthenticated staff session must return 401, got ${unauthenticatedSession.status}`);

  const createdByKey = new Map();
  for (const scenario of publicRequests) {
    const response = await request("POST", "/api/public/requests", scenario.body);
    assert(response.status === 201, `Expected ${scenario.key} request 201, got ${response.status}`);
    assert(response.body.request.status === "new", `${scenario.key} must start with staff status new`);
    assert(response.body.request.fileUploadIncluded === false, `${scenario.key} must not include file upload`);
    assert(response.body.request.omniaWriteAllowed === false, `${scenario.key} must not allow Omnia writes`);
    assert(response.body.request.staffReviewRequired === true, `${scenario.key} must require staff review`);
    createdByKey.set(scenario.key, response.body.request.id);
  }

  const customerLogin = await request("POST", "/api/auth/login", {
    email: customerEmail,
    password: customerPassword,
  });
  assert(customerLogin.status === 200, `Customer login failed with ${customerLogin.status}`);
  const customerCookie = cookieHeaderFromSetCookie(customerLogin.headers["set-cookie"]);
  const customerStaffList = await request("GET", "/api/staff/requests", undefined, {
    cookie: customerCookie,
  });
  assert(customerStaffList.status === 403, `Customer role must not read staff list, got ${customerStaffList.status}`);

  const rejectedLogin = await request("POST", "/api/staff/auth/login", {
    email: staffEmail,
    password: "wrong-staff-password",
  });
  assert(rejectedLogin.status === 401, `Wrong staff password must return 401, got ${rejectedLogin.status}`);

  const staffLogin = await request("POST", "/api/staff/auth/login", {
    email: staffEmail,
    password: staffPassword,
  });
  assert(staffLogin.status === 200, `Staff login failed with ${staffLogin.status}`);
  assert(staffLogin.body.session?.role === "staff", "Staff login must return staff role");
  assert(staffLogin.body.mvpBoundary?.productionReady === false, "Staff session must be marked MVP-only");
  const staffCookie = cookieHeaderFromSetCookie(staffLogin.headers["set-cookie"]);
  assert(String(staffLogin.headers["set-cookie"]).includes("HttpOnly"), "Staff cookie must be HttpOnly");
  assert(String(staffLogin.headers["set-cookie"]).includes("SameSite=Strict"), "Staff cookie must use SameSite=Strict");

  const invalidCsrfTarget = createdByKey.get("appointment");
  const invalidCsrf = await request("PATCH", `/api/staff/requests/${invalidCsrfTarget}/status`, {
    status: "in_review",
  }, {
    cookie: staffCookie,
    "x-csrf-token": "invalid-csrf-token",
  });
  assert(invalidCsrf.status === 403, `Invalid CSRF must return 403, got ${invalidCsrf.status}`);

  for (const scenario of publicRequests) {
    if (scenario.finalStatus === "new") continue;
    const requestId = createdByKey.get(scenario.key);
    const response = await request("PATCH", `/api/staff/requests/${requestId}/status`, {
      status: scenario.finalStatus,
    }, {
      cookie: staffCookie,
      "x-csrf-token": staffLogin.body.csrfToken,
    });
    assert(response.status === 200, `Status change for ${scenario.key} failed with ${response.status}`);
    assert(response.body.request.staffStatus === scenario.finalStatus, `${scenario.key} status did not persist ${scenario.finalStatus}`);
  }

  const expectedByStatus = new Map(publicRequests.map((scenario) => [scenario.finalStatus, createdByKey.get(scenario.key)]));
  for (const [status, requestId] of expectedByStatus.entries()) {
    const response = await request("GET", `/api/staff/requests?status=${status}`, undefined, {
      cookie: staffCookie,
    });
    assert(response.status === 200, `Staff filter ${status} failed with ${response.status}`);
    assert(response.body.requests.some((item) => item.id === requestId && item.staffStatus === status), `Staff filter ${status} is missing ${requestId}`);
    assert(response.body.requests.every((item) => item.omniaWriteAllowed === false), `Staff filter ${status} must keep Omnia read-only`);
  }

  const documentRequestId = createdByKey.get("document");
  const documentDetail = await request("GET", `/api/staff/requests/${documentRequestId}`, undefined, {
    cookie: staffCookie,
  });
  assert(documentDetail.status === 200, `Document detail failed with ${documentDetail.status}`);
  assert(documentDetail.body.request.publicRequest?.document?.uploadMode === "metadata-only-no-file-transfer", "Document request must remain metadata-only");
  assert(documentDetail.body.request.publicRequest?.boundary?.fileUploadIncluded === false, "Document boundary must block file transfer");
  assert(!JSON.stringify(documentDetail.body.request).includes("fileName"), "Staff detail must not expose file names");
  assert(
    documentDetail.body.request.auditEvents.some((event) =>
      event.action === "portal-request-changed" &&
      event.actorUserId === "usr_dev_staff" &&
      event.metadata?.actorStaffUserId === "staff_dev"),
    "Document audit must show the staff actor",
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

  const store = JSON.parse(await readFile(storePath, "utf8"));
  assert(store.requests.length === publicRequests.length, `Expected ${publicRequests.length} stored requests, got ${store.requests.length}`);
  assert(store.requests.every((item) => item.staffReviewRequired === true), "Every public request must require staff review");
  assert(store.requests.every((item) => item.omniaWriteAllowed === false), "Every public request must block Omnia writes");
  assert(store.requests.every((item) => !item.uploadObject), "Public requests must not create upload objects");
  assert(!JSON.stringify(store.requests).includes("fileName"), "Public requests must not persist file names");

  const finalStatuses = Object.fromEntries(
    publicRequests.map((scenario) => [
      scenario.finalStatus,
      store.requests.filter((item) => item.id === createdByKey.get(scenario.key) && item.employeeStatus === scenario.finalStatus).length,
    ]),
  );

  console.log("Staff Admin MVP check passed");
  console.log(JSON.stringify({
    requests: store.requests.length,
    staffStatuses: finalStatuses,
    auditEvents: store.auditEvents.length,
    uploadObjectsCreated: store.requests.filter((item) => item.uploadObject).length,
  }, null, 2));
} finally {
  await rm(storePath, { force: true });
}

function cookieHeaderFromSetCookie(setCookie) {
  return (Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0];
}
