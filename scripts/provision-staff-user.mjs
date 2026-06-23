import { createHash, randomUUID } from "node:crypto";
import { Client } from "pg";
import { loadBackendEnv } from "../apps/backend/dist/config/env.js";

const env = loadBackendEnv(process.env);

if (env.nodeEnv !== "production") {
  throw new Error("Staff provisioning must run with NODE_ENV=production and a real Postgres-backed pilot env.");
}
if (env.portalRepositoryDriver !== "postgres") {
  throw new Error("Staff provisioning requires PORTAL_REPOSITORY_DRIVER=postgres.");
}
if (!env.databaseUrl) {
  throw new Error("Staff provisioning requires PORTAL_DATABASE_URL.");
}

const email = requiredEnv("PORTAL_STAFF_PROVISION_EMAIL").toLowerCase();
const password = requiredEnv("PORTAL_STAFF_PROVISION_PASSWORD");
const safeDisplayName = requiredEnv("PORTAL_STAFF_PROVISION_DISPLAY_NAME");
const role = process.env.PORTAL_STAFF_PROVISION_ROLE ?? "staff";

if (role !== "staff" && role !== "admin") {
  throw new Error("PORTAL_STAFF_PROVISION_ROLE must be staff or admin.");
}
if (password.length < 16) {
  throw new Error("PORTAL_STAFF_PROVISION_PASSWORD must be at least 16 characters.");
}

const stableId = createHash("sha256").update(email).digest("hex").slice(0, 16);
const userId = `usr_staff_${stableId}`;
const staffUserId = `staff_${stableId}`;
const now = new Date().toISOString();
const user = {
  userId,
  email,
  role,
  status: "active",
  passwordHashSha256: hashPassword(password),
  safeDisplayName,
  staffUserId,
};
const auditEvent = {
  id: randomUUID(),
  occurredAt: now,
  actorRole: "system",
  action: "staff-user-provisioned",
  outcome: "accepted",
  objectType: "portal_mvp_user",
  objectId: userId,
  metadata: {
    role,
    provisionedBy: "scripts/provision-staff-user.mjs",
  },
};

const client = new Client({
  connectionString: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: env.databaseConnectionTimeoutMs,
  statement_timeout: env.databaseStatementTimeoutMs,
});

await client.connect();
try {
  await client.query("BEGIN");
  await client.query(
    `INSERT INTO portal_mvp_users (user_id, email_ci, role, status, data, updated_at)
     VALUES ($1, lower($2), $3, 'active', $4::jsonb, now())
     ON CONFLICT (user_id) DO UPDATE SET
       email_ci = EXCLUDED.email_ci,
       role = EXCLUDED.role,
       status = 'active',
       data = EXCLUDED.data,
       updated_at = now()`,
    [userId, email, role, JSON.stringify(user)],
  );
  await client.query(
    `INSERT INTO portal_mvp_audit_events (id, actor_user_id, request_id, occurred_at_iso, data)
     VALUES ($1, NULL, NULL, $2, $3::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [auditEvent.id, now, JSON.stringify(auditEvent)],
  );
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

console.log(JSON.stringify({
  status: "staff_user_provisioned",
  role,
  userId,
  staffUserId,
}, null, 2));

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  if (/replace-with|\.invalid\b|example-sanitaetshaus|placeholder/i.test(value)) {
    throw new Error(`${name} must not contain placeholder values.`);
  }
  return value;
}

function hashPassword(password) {
  return createHash("sha256").update(`${env.passwordPepper}:${password}`).digest("hex");
}
