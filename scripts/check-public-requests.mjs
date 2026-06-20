import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createBackendRequestHandler } from "../apps/backend/dist/app.js";
import { loadBackendEnv } from "../apps/backend/dist/config/env.js";

const storePath = path.join(os.tmpdir(), `sanipep-public-request-check-${process.pid}.json`);
const origin = "http://localhost:3000";

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

  const staffLogin = await request("POST", "/api/auth/login", {
    email: "staff@example.test",
    password: "staff-passwort",
  });
  assert(staffLogin.status === 200, `Staff login failed with ${staffLogin.status}`);
  const setCookie = staffLogin.headers["set-cookie"];
  const cookieHeader = (Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0];

  const staffList = await request("GET", "/api/staff/requests", undefined, {
    cookie: cookieHeader,
  });
  assert(staffList.status === 200, `Staff list failed with ${staffList.status}`);
  assert(staffList.body.requests.length === 3, `Expected 3 staff requests, got ${staffList.body.requests.length}`);
  assert(staffList.body.statusModel.some((item) => item.value === "waiting_for_customer"), "Staff status model is incomplete");
  assert(staffList.body.mvpBoundary?.productionReady === false, "Staff list must be marked as MVP-only");
  assert(staffList.headers["x-sanipep-staff-boundary"] === "staff-request-mvp", "Staff list boundary header is missing");

  const detail = await request("GET", `/api/staff/requests/${staffList.body.requests[0].id}`, undefined, {
    cookie: cookieHeader,
  });
  assert(detail.status === 200, `Staff detail failed with ${detail.status}`);
  assert(detail.body.request.publicRequest?.contact, "Staff detail did not include public contact details");
  assert(detail.body.mvpBoundary?.productionReady === false, "Staff detail must be marked as MVP-only");

  const store = JSON.parse(await readFile(storePath, "utf8"));
  assert(store.requests.length === 3, `Expected 3 persisted requests, got ${store.requests.length}`);
  assert(store.requests.every((item) => !item.uploadObject), "Public requests must not create upload objects");
  assert(store.auditEvents.filter((item) => item.action === "public-request-submitted").length === 3, "Missing public request audit events");

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
