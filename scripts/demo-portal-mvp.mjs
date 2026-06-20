const backendBaseUrl = process.env.PORTAL_BACKEND_URL ?? "http://127.0.0.1:4100";
const origin = process.env.PORTAL_ORIGIN ?? "http://localhost:5183";

const fail = (message) => {
  throw new Error(message);
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) fail(`${name} must be set for the local Portal MVP demo.`);
  return value;
}

const customerEmail = requiredEnv("PORTAL_DEV_CUSTOMER_EMAIL");
const customerPassword = requiredEnv("PORTAL_DEV_CUSTOMER_PASSWORD");
const staffEmail = requiredEnv("PORTAL_DEV_STAFF_EMAIL");
const staffPassword = requiredEnv("PORTAL_DEV_STAFF_PASSWORD");

const createClient = () => {
  let cookieHeader = "";

  return {
    get cookieHeader() {
      return cookieHeader;
    },

    async request(path, options = {}) {
      const headers = new Headers(options.headers);
      headers.set("origin", origin);
      if (options.body && !headers.has("content-type")) headers.set("content-type", "application/json");
      if (cookieHeader) headers.set("cookie", cookieHeader);
      if (options.csrfToken) headers.set("x-csrf-token", options.csrfToken);

      const response = await fetch(`${backendBaseUrl}${path}`, {
        ...options,
        headers,
      });

      const setCookie = typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [response.headers.get("set-cookie")].filter(Boolean);
      if (setCookie.length > 0) {
        cookieHeader = setCookie.map((cookie) => cookie.split(";")[0]).join("; ");
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        fail(`${options.method ?? "GET"} ${path} failed with ${response.status}: ${JSON.stringify(payload)}`);
      }
      return payload;
    },
  };
};

const customer = createClient();
const staff = createClient();

const customerLogin = await customer.request("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: customerEmail,
    password: customerPassword,
  }),
});

assert(customerLogin.authenticated === true, "Customer login did not return an authenticated session");
assert(typeof customerLogin.csrfToken === "string" && customerLogin.csrfToken.length > 20, "Customer login did not return a CSRF token");
assert(customer.cookieHeader.includes("sanipep_portal_session="), "Customer login did not set the portal session cookie");

const requestInputs = [
  {
    kind: "prescription_upload",
    context: "compression",
    fileExtension: "pdf",
    mimeType: "application/pdf",
    sizeBytes: 245760,
    consentAccepted: true,
  },
  {
    kind: "appointment_request",
    preferredDay: "2026-06-24",
    timeWindow: "vormittag",
    concern: "kompression",
  },
  {
    kind: "reorder_request",
    supplyAlias: "kompressionsversorgung",
    cadence: "einmalig",
  },
  {
    kind: "subscription_change_request",
    supplyAlias: "inkontinenzmaterial",
    cadence: "quartalsweise",
  },
  {
    kind: "health_contact_request",
    topic: "rueckfrage",
    preferredChannel: "telefon",
  },
];

const created = [];
for (const input of requestInputs) {
  created.push(await customer.request("/api/portal/requests", {
    method: "POST",
    csrfToken: customerLogin.csrfToken,
    body: JSON.stringify(input),
  }));
}

const staffLogin = await staff.request("/api/staff/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: staffEmail,
    password: staffPassword,
  }),
});

assert(staffLogin.session.role === "staff", "Staff login did not return staff role");

const approvedRequestId = created[0].request.id;
const staffSubmittedList = await staff.request("/api/staff/requests?status=new");
assert(staffSubmittedList.mvpBoundary.mode === "staff-request-mvp", "Staff request list did not return the MVP boundary");
assert(staffSubmittedList.requests.some((item) => item.id === approvedRequestId && item.kind === "prescription_upload"), "Staff list did not include the customer prescription request");

await staff.request(`/api/staff/requests/${approvedRequestId}/status`, {
  method: "PATCH",
  csrfToken: staffLogin.csrfToken,
  body: JSON.stringify({ status: "staff_review" }),
});
await staff.request(`/api/staff/requests/${approvedRequestId}/status`, {
  method: "PATCH",
  csrfToken: staffLogin.csrfToken,
  body: JSON.stringify({ status: "approved" }),
});
await staff.request(`/api/staff/requests/${approvedRequestId}/status`, {
  method: "PATCH",
  csrfToken: staffLogin.csrfToken,
  body: JSON.stringify({ status: "completed" }),
});

const rejectedRequestId = created[1].request.id;
await staff.request(`/api/staff/requests/${rejectedRequestId}/status`, {
  method: "PATCH",
  csrfToken: staffLogin.csrfToken,
  body: JSON.stringify({ status: "rejected" }),
});

const staffCompletedList = await staff.request("/api/staff/requests?status=completed");
assert(staffCompletedList.requests.some((item) => item.id === approvedRequestId), "Staff completed filter did not include the completed request");
const staffCompletedDetail = await staff.request(`/api/staff/requests/${approvedRequestId}`);
assert(staffCompletedDetail.request.auditEvents.some((event) => event.requestId === approvedRequestId && event.action === "portal-request-approved"), "Staff audit trail did not include approval event");

const dashboard = await customer.request("/api/portal/dashboard");
const kinds = new Set(dashboard.requests.map((item) => item.kind));
const actions = new Set(dashboard.auditEvents.map((event) => event.action));
const customerCompletedRequest = dashboard.requests.find((item) => item.id === approvedRequestId);

assert(created.every((item) => item.request?.id), "Not every create response returned a request id");
for (const input of requestInputs) {
  assert(kinds.has(input.kind), `${input.kind} is missing from dashboard`);
}
assert(customerCompletedRequest?.status === "completed", "Customer dashboard did not show the staff-updated completed status");
assert(dashboard.summary.storedRequests >= 5, "Dashboard did not store at least five request types");
assert(dashboard.summary.openRequests >= 3, "Dashboard should show remaining open requests");
assert(dashboard.summary.completedRequests >= 1, "Dashboard should show completed requests");
assert(dashboard.summary.rejectedRequests >= 1, "Dashboard should show rejected requests");
assert(dashboard.summary.staffReviewRequired >= 5, "Stored requests are not queued for staff review");
assert(dashboard.summary.omniaWrites === 0, "Portal MVP must not create Omnia writes");
assert(dashboard.auditEvents.length >= 12, "Audit trail did not record login, request and status events");

for (const action of [
  "portal-request-created",
  "portal-request-submitted",
  "portal-request-changed",
  "portal-request-approved",
  "portal-request-rejected",
]) {
  assert(actions.has(action), `Audit action ${action} is missing`);
}

const uploadRequest = dashboard.requests.find((item) => item.kind === "prescription_upload");
assert(uploadRequest.uploadObject?.storageMode === "metadata-only-no-file-content", "Prescription request stored more than upload metadata");
assert(uploadRequest.uploadObject?.productionUpload === false, "Prescription upload must remain non-production");

console.log("Portal MVP E2E demo passed");
console.log(JSON.stringify({
  customerSession: customerLogin.session.id,
  staffSession: staffLogin.session.id,
  createdRequestIds: created.map((item) => item.request.id),
  staffFilteredRequests: staffSubmittedList.requests.length,
  storedRequests: dashboard.summary.storedRequests,
  openRequests: dashboard.summary.openRequests,
  completedRequests: dashboard.summary.completedRequests,
  rejectedRequests: dashboard.summary.rejectedRequests,
  staffReviewRequired: dashboard.summary.staffReviewRequired,
  auditEvents: dashboard.auditEvents.length,
  omniaWrites: dashboard.summary.omniaWrites,
}, null, 2));
