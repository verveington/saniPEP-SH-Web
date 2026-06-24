const webUrl = requiredUrl("PILOT_WEB_URL");
const staffUrl = requiredUrl("PILOT_STAFF_URL");
const apiUrl = requiredUrl("PILOT_API_URL");

const report = {
  web: await checkHead(webUrl),
  staff: await checkStaff(staffUrl),
  apiHealth: await checkJson(new URL("/healthz", apiUrl)),
  apiReady: await checkJson(new URL("/readyz", apiUrl)),
  staffSessionWithoutLogin: await checkStaffSession(apiUrl),
};

assert(report.web.status === 200, `Web must return 200, got ${report.web.status}`);
assert(report.staff.status === 200, `Staff Admin must return 200, got ${report.staff.status}`);
assert(report.staff.noindex === true, "Staff Admin must send X-Robots-Tag noindex,nofollow");
assert(report.apiHealth.status === 200, `API /healthz must return 200, got ${report.apiHealth.status}`);
assert(report.apiHealth.body.status === "ok", "API /healthz must return status ok");
assert(report.apiReady.status === 200, `API /readyz must return 200, got ${report.apiReady.status}`);
assert(report.apiReady.body.status === "ready", "API /readyz must return status ready");
assert(report.staffSessionWithoutLogin.status === 401, `Staff session without login must return 401, got ${report.staffSessionWithoutLogin.status}`);

const readyChecks = report.apiReady.body.checks ?? {};
for (const name of ["database", "redis", "repository"]) {
  assert(readyChecks[name]?.ok === true, `/readyz ${name} check must be ok`);
}
assert(readyChecks.antivirus?.status === "disabled", "/readyz antivirus must be disabled while uploads are off");
assert(readyChecks.objectStorage?.status === "disabled", "/readyz objectStorage must be disabled while uploads are off");

console.log("Controlled pilot live smoke passed");
console.log(JSON.stringify(report, null, 2));

function requiredUrl(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  if (/replace-with|\.invalid\b|example-sanitaetshaus|placeholder/i.test(value)) {
    throw new Error(`${name} must not contain placeholder values.`);
  }
  return new URL(value);
}

async function checkHead(url) {
  const response = await fetch(url, { method: "HEAD", redirect: "manual" });
  return {
    status: response.status,
  };
}

async function checkStaff(url) {
  const response = await fetch(url, { method: "HEAD", redirect: "manual" });
  return {
    status: response.status,
    noindex: (response.headers.get("x-robots-tag") ?? "").toLowerCase().includes("noindex"),
  };
}

async function checkJson(url) {
  const response = await fetch(url, { method: "GET", redirect: "manual" });
  const body = await response.json().catch(() => ({}));
  return {
    status: response.status,
    body,
  };
}

async function checkStaffSession(apiBaseUrl) {
  const response = await fetch(new URL("/api/staff/session", apiBaseUrl), {
    method: "GET",
    redirect: "manual",
  });
  return {
    status: response.status,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
