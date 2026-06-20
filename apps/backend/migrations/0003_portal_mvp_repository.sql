CREATE TABLE IF NOT EXISTS portal_mvp_users (
  user_id text PRIMARY KEY,
  email_ci text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('customer', 'staff', 'admin')),
  status text NOT NULL CHECK (status IN ('active', 'disabled')),
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_mvp_sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL,
  absolute_expires_at timestamptz NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_mvp_sessions_user_idx
  ON portal_mvp_sessions (user_id, absolute_expires_at);

CREATE TABLE IF NOT EXISTS portal_mvp_requests (
  id text PRIMARY KEY,
  customer_profile_id text NOT NULL,
  created_by_user_id text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL,
  employee_status text NOT NULL,
  created_at_iso text NOT NULL,
  updated_at_iso text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_mvp_requests_customer_idx
  ON portal_mvp_requests (customer_profile_id, created_at_iso DESC);

CREATE INDEX IF NOT EXISTS portal_mvp_requests_staff_idx
  ON portal_mvp_requests (employee_status, created_at_iso DESC);

CREATE TABLE IF NOT EXISTS portal_mvp_audit_events (
  id text PRIMARY KEY,
  actor_user_id text,
  request_id text,
  occurred_at_iso text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_mvp_audit_events_actor_idx
  ON portal_mvp_audit_events (actor_user_id, occurred_at_iso DESC);

CREATE INDEX IF NOT EXISTS portal_mvp_audit_events_request_idx
  ON portal_mvp_audit_events (request_id, occurred_at_iso DESC);

COMMENT ON TABLE portal_mvp_requests IS
  'Transitional PostgreSQL-backed MVP repository for safe Portal/Public Request metadata. No file contents and no Omnia writes.';

COMMENT ON TABLE portal_mvp_audit_events IS
  'Transitional PostgreSQL-backed audit event repository using sanitized audit metadata JSON.';
