import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createBackendRequestHandler } from "../apps/backend/dist/app.js";
import { loadBackendEnv } from "../apps/backend/dist/config/env.js";

const runId = `staffusers_${process.pid}`;
const origin = "http://localhost:5184";
const adminEmail = `${runId}.admin@example.test`;
const adminPassword = `${runId}-Admin-password-123`;
const staffEmail = `${runId}.staff@example.test`;
const staffPassword = `${runId}-Staff-password-123`;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

try {
  const disabledMailReport = await runDisabledMailScenario();
  const fakeMailReport = await runFakeMailScenario();
  console.log("Staff Admin user-management check passed");
  console.log(JSON.stringify({
    usersCreated: disabledMailReport.usersCreated,
    passwordChangeChecked: true,
    passwordResetChecked: true,
    disabledMailStatus: disabledMailReport.disabledMailStatus,
    fakeMailMessages: fakeMailReport.messages,
    uploadObjectsCreated: disabledMailReport.uploadObjectsCreated + fakeMailReport.uploadObjectsCreated,
  }, null, 2));
} finally {
  await rm(path.join(os.tmpdir(), `${runId}.json`), { force: true });
  await rm(path.join(os.tmpdir(), `${runId}-mail.json`), { force: true });
}

async function runDisabledMailScenario() {
  const storePath = path.join(os.tmpdir(), `${runId}.json`);
  const handler = createBackendRequestHandler(loadTestEnv(storePath));

  const anonymousUsers = await request(handler, "GET", "/api/staff/users");
  assert(anonymousUsers.status === 401, `Anonymous staff user list must return 401, got ${anonymousUsers.status}`);

  const staffLogin = await request(handler, "POST", "/api/staff/auth/login", {
    email: staffEmail,
    password: staffPassword,
  });
  assert(staffLogin.status === 200, `Staff login failed with ${staffLogin.status}`);
  const staffCookie = cookieHeaderFromSetCookie(staffLogin.headers["set-cookie"]);

  const staffUsers = await request(handler, "GET", "/api/staff/users", undefined, {
    cookie: staffCookie,
  });
  assert(staffUsers.status === 403, `Staff role must not list users, got ${staffUsers.status}`);

  const wrongOldPassword = await request(handler, "POST", "/api/staff/me/password", {
    oldPassword: "wrong-old-password",
    newPassword: `${runId}-New-password-123`,
  }, {
    cookie: staffCookie,
    "x-csrf-token": staffLogin.body.csrfToken,
  });
  assert(wrongOldPassword.status === 401, `Wrong old password must return 401, got ${wrongOldPassword.status}`);

  const weakPassword = await request(handler, "POST", "/api/staff/me/password", {
    oldPassword: staffPassword,
    newPassword: "weak",
  }, {
    cookie: staffCookie,
    "x-csrf-token": staffLogin.body.csrfToken,
  });
  assert(weakPassword.status === 400, `Weak password must return 400, got ${weakPassword.status}`);

  const changedPassword = `${runId}-Changed-password-123`;
  const passwordChange = await request(handler, "POST", "/api/staff/me/password", {
    oldPassword: staffPassword,
    newPassword: changedPassword,
  }, {
    cookie: staffCookie,
    "x-csrf-token": staffLogin.body.csrfToken,
  });
  assert(passwordChange.status === 200, `Staff password change failed with ${passwordChange.status}`);
  assert(passwordChange.body.sessionsInvalidated === false, "Own password change decision must be explicit");

  const adminLogin = await request(handler, "POST", "/api/staff/auth/login", {
    email: adminEmail,
    password: adminPassword,
  });
  assert(adminLogin.status === 200, `Admin login failed with ${adminLogin.status}`);
  assert(adminLogin.body.session?.role === "admin", "Admin login must return admin role");
  const adminCookie = cookieHeaderFromSetCookie(adminLogin.headers["set-cookie"]);

  const createUser = await request(handler, "POST", "/api/staff/users", {
    email: `${runId}.created@example.test`,
    safeDisplayName: "Check Created Staff",
    role: "staff",
  }, {
    cookie: adminCookie,
    "x-csrf-token": adminLogin.body.csrfToken,
  });
  assert(createUser.status === 201, `Create staff user failed with ${createUser.status}`);
  assert(createUser.body.user?.role === "staff", "Created user must have staff role");
  assert(typeof createUser.body.temporaryPassword === "string", "Create user must return one temporary password");

  const storeAfterCreate = await readStore(storePath);
  assert(!JSON.stringify(storeAfterCreate).includes(createUser.body.temporaryPassword), "Temporary password must not be stored in clear text");

  const createdLogin = await request(handler, "POST", "/api/staff/auth/login", {
    email: createUser.body.user.email,
    password: createUser.body.temporaryPassword,
  });
  assert(createdLogin.status === 200, `Created staff login failed with ${createdLogin.status}`);
  const createdCookie = cookieHeaderFromSetCookie(createdLogin.headers["set-cookie"]);

  const resetPassword = await request(handler, "POST", `/api/staff/users/${createUser.body.user.userId}/password-reset`, undefined, {
    cookie: adminCookie,
    "x-csrf-token": adminLogin.body.csrfToken,
  });
  assert(resetPassword.status === 200, `Password reset failed with ${resetPassword.status}`);
  assert(typeof resetPassword.body.temporaryPassword === "string", "Password reset must return one temporary password");

  const invalidatedSession = await request(handler, "GET", "/api/staff/session", undefined, {
    cookie: createdCookie,
  });
  assert(invalidatedSession.status === 401, `Password reset must invalidate existing user sessions, got ${invalidatedSession.status}`);

  const resetLogin = await request(handler, "POST", "/api/staff/auth/login", {
    email: createUser.body.user.email,
    password: resetPassword.body.temporaryPassword,
  });
  assert(resetLogin.status === 200, `Reset password login failed with ${resetLogin.status}`);

  const deactivate = await request(handler, "POST", `/api/staff/users/${createUser.body.user.userId}/deactivate`, undefined, {
    cookie: adminCookie,
    "x-csrf-token": adminLogin.body.csrfToken,
  });
  assert(deactivate.status === 200, `Deactivate user failed with ${deactivate.status}`);
  assert(deactivate.body.user?.status === "disabled", "Deactivated user must be disabled");

  const disabledLogin = await request(handler, "POST", "/api/staff/auth/login", {
    email: createUser.body.user.email,
    password: resetPassword.body.temporaryPassword,
  });
  assert(disabledLogin.status === 401, `Disabled user login must return 401, got ${disabledLogin.status}`);

  const publicRequest = await request(handler, "POST", "/api/public/requests", publicRequestBody(`${runId}.mail-disabled@example.test`));
  assert(publicRequest.status === 201, `Public request failed with ${publicRequest.status}`);
  const detail = await request(handler, "GET", `/api/staff/requests/${publicRequest.body.request.id}`, undefined, {
    cookie: adminCookie,
  });
  assert(detail.status === 200, `Staff detail failed with ${detail.status}`);
  assert(detail.body.request.mail.enabled === false, "Mail must be disabled by default");
  assert(detail.body.request.mail.disabledReason === "mail_disabled", "Disabled mail reason must be visible");

  const sendDisabledMail = await request(handler, "POST", `/api/staff/requests/${publicRequest.body.request.id}/messages/email`, {
    subject: "Ihre Anfrage beim saniPEP Sanitaetshaus",
    body: "Guten Tag, dies ist eine kontrollierte Testantwort ohne Anhang.",
    confirmSend: true,
  }, {
    cookie: adminCookie,
    "x-csrf-token": adminLogin.body.csrfToken,
  });
  assert(sendDisabledMail.status === 503, `Disabled mail send must return 503, got ${sendDisabledMail.status}`);

  const store = await readStore(storePath);
  assert(store.auditEvents.some((event) => event.action === "staff-user-created"), "User creation must be audited");
  assert(store.auditEvents.some((event) => event.action === "staff-user-password-reset"), "Password reset must be audited");
  assert(store.auditEvents.some((event) => event.action === "staff-user-disabled"), "User disable must be audited");
  assert(store.auditEvents.some((event) => event.action === "staff-password-changed"), "Own password change must be audited");

  return {
    usersCreated: store.users.filter((user) => user.email.includes(".created@")).length,
    disabledMailStatus: sendDisabledMail.status,
    uploadObjectsCreated: store.requests.filter((item) => item.uploadObject).length,
  };
}

async function runFakeMailScenario() {
  const storePath = path.join(os.tmpdir(), `${runId}-mail.json`);
  const sentMessages = [];
  const env = loadTestEnv(storePath, {
    MAIL_ENABLED: "true",
    SMTP_HOST: "smtp.local.test",
    SMTP_PORT: "2525",
    SMTP_USER: "smtp-user",
    SMTP_PASSWORD: "smtp-password-32-characters-long",
    SMTP_SECURE: "false",
  });
  const handler = createBackendRequestHandler(env, {
    mailSender: {
      async send(input) {
        sentMessages.push(input);
      },
    },
  });

  const adminLogin = await request(handler, "POST", "/api/staff/auth/login", {
    email: adminEmail,
    password: adminPassword,
  });
  assert(adminLogin.status === 200, `Mail scenario admin login failed with ${adminLogin.status}`);
  const adminCookie = cookieHeaderFromSetCookie(adminLogin.headers["set-cookie"]);

  const publicRequest = await request(handler, "POST", "/api/public/requests", publicRequestBody(`${runId}.fake-mail@example.test`));
  assert(publicRequest.status === 201, `Mail scenario public request failed with ${publicRequest.status}`);

  const attachmentAttempt = await request(handler, "POST", `/api/staff/requests/${publicRequest.body.request.id}/messages/email`, {
    subject: "Ihre Anfrage beim saniPEP Sanitaetshaus",
    body: "Guten Tag, diese Antwort darf keinen Anhang enthalten.",
    confirmSend: true,
    attachments: [],
  }, {
    cookie: adminCookie,
    "x-csrf-token": adminLogin.body.csrfToken,
  });
  assert(attachmentAttempt.status === 400, `Attachment attempt must return 400, got ${attachmentAttempt.status}`);
  assert(sentMessages.length === 0, "Attachment attempt must not reach mail sender");

  const sendMail = await request(handler, "POST", `/api/staff/requests/${publicRequest.body.request.id}/messages/email`, {
    subject: "Ihre Anfrage beim saniPEP Sanitaetshaus",
    body: "Guten Tag, dies ist eine kontrollierte Testantwort ohne Anhang.",
    confirmSend: true,
  }, {
    cookie: adminCookie,
    "x-csrf-token": adminLogin.body.csrfToken,
  });
  assert(sendMail.status === 200, `Fake mail send failed with ${sendMail.status}`);
  assert(sendMail.body.message?.status === "sent", "Sent mail must be stored as sent");
  assert(sentMessages.length === 1, `Expected one fake SMTP send, got ${sentMessages.length}`);
  assert(sentMessages[0].fromAddress === "sani@sanipep.de", "Mail sender address must be sani@sanipep.de");
  assert(!("attachments" in sentMessages[0]), "Mail sender input must not carry attachments");

  const detail = await request(handler, "GET", `/api/staff/requests/${publicRequest.body.request.id}`, undefined, {
    cookie: adminCookie,
  });
  assert(detail.status === 200, `Mail scenario detail failed with ${detail.status}`);
  assert(detail.body.request.communication.length === 1, "Request detail must expose communication history");

  const store = await readStore(storePath);
  assert(store.auditEvents.some((event) => event.action === "staff-email-reply-sent"), "Sent mail must be audited");
  return {
    messages: store.requests.reduce((count, item) => count + (item.communication?.length ?? 0), 0),
    uploadObjectsCreated: store.requests.filter((item) => item.uploadObject).length,
  };
}

function loadTestEnv(storePath, extra = {}) {
  return loadBackendEnv({
    NODE_ENV: "development",
    PORT: "4100",
    PORTAL_BACKEND_BASE_URL: "http://localhost:4100",
    TRUSTED_ORIGINS: origin,
    PORTAL_STORE_PATH: storePath,
    PORTAL_SESSION_SECRET: "staff-users-local-session-secret",
    CSRF_SECRET: "staff-users-local-csrf-secret",
    PORTAL_OTP_HASH_SECRET: "staff-users-local-otp-secret",
    PORTAL_PASSWORD_PEPPER: "staff-users-local-password-pepper",
    AUDIT_LOG_HASH_SECRET: "staff-users-local-audit-secret",
    PORTAL_DEV_STAFF_EMAIL: staffEmail,
    PORTAL_DEV_STAFF_PASSWORD: staffPassword,
    PORTAL_DEV_STAFF_DISPLAY_NAME: "User Check Staff",
    PORTAL_DEV_ADMIN_EMAIL: adminEmail,
    PORTAL_DEV_ADMIN_PASSWORD: adminPassword,
    PORTAL_DEV_ADMIN_DISPLAY_NAME: "User Check Admin",
    ...extra,
  });
}

async function request(handler, method, url, body, headers = {}) {
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

function publicRequestBody(contactEmail) {
  return {
    type: "contact",
    topic: "Rueckruf zur Versorgung",
    serviceContext: "Bandage",
    message: "Bitte Rueckmeldung fuer den kontrollierten Staff-Admin-Test vorbereiten.",
    contactName: "Check Kontakt",
    contactEmail,
    contactPhone: "",
    preferredContactChannel: "email",
    containsHealthData: false,
  };
}

async function readStore(storePath) {
  return JSON.parse(await readFile(storePath, "utf8"));
}

function cookieHeaderFromSetCookie(setCookie) {
  return (Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0];
}
