CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'staff', 'admin')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'locked', 'disabled')),
  password_hash text,
  password_set_at timestamptz,
  failed_login_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_users_email_unique ON portal_users (lower(email));
CREATE INDEX IF NOT EXISTS portal_users_role_status_idx ON portal_users (role, status);

CREATE TABLE IF NOT EXISTS customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES portal_users(id) ON DELETE RESTRICT,
  omnia_customer_ref text NOT NULL UNIQUE,
  safe_display_name text NOT NULL,
  portal_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_profiles_omnia_ref_idx ON customer_profiles (omnia_customer_ref);

CREATE TABLE IF NOT EXISTS staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES portal_users(id) ON DELETE RESTRICT,
  display_name text NOT NULL,
  staff_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  csrf_token_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'staff', 'admin')),
  ip_hash text,
  user_agent_hash text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  idle_expires_at timestamptz NOT NULL,
  absolute_expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS portal_sessions_user_active_idx ON portal_sessions (user_id, revoked_at, absolute_expires_at);

CREATE TABLE IF NOT EXISTS one_time_password_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_profile_id uuid NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  issued_by_staff_user_id uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  code_hash text NOT NULL,
  delivery text NOT NULL CHECK (delivery IN ('letter', 'handover')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_invites_customer_active_idx ON one_time_password_invites (customer_profile_id, consumed_at, expires_at);

CREATE TABLE IF NOT EXISTS portal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_profile_id uuid NOT NULL REFERENCES customer_profiles(id) ON DELETE RESTRICT,
  created_by_user_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN (
    'prescription_upload',
    'reorder_request',
    'subscription_change_request',
    'appointment_request',
    'health_contact_request'
  )),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'submitted',
    'staff_review',
    'approved',
    'rejected',
    'completed'
  )),
  sensitivity text NOT NULL CHECK (sensitivity IN ('contact', 'health', 'omnia_reference')),
  safe_summary text NOT NULL,
  staff_review_required boolean NOT NULL DEFAULT true,
  omnia_write_allowed boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  reviewed_by_staff_user_id uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portal_requests_staff_review_required CHECK (staff_review_required IS TRUE),
  CONSTRAINT portal_requests_no_customer_omnia_write CHECK (omnia_write_allowed IS FALSE)
);

CREATE INDEX IF NOT EXISTS portal_requests_customer_status_idx ON portal_requests (customer_profile_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS portal_requests_kind_status_idx ON portal_requests (kind, status);

CREATE TABLE IF NOT EXISTS upload_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_request_id uuid REFERENCES portal_requests(id) ON DELETE SET NULL,
  customer_profile_id uuid NOT NULL REFERENCES customer_profiles(id) ON DELETE RESTRICT,
  created_by_user_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE RESTRICT,
  purpose text NOT NULL CHECK (purpose IN ('prescription', 'care_document', 'staff_requested_document')),
  storage_state text NOT NULL DEFAULT 'created' CHECK (storage_state IN (
    'created',
    'quarantined',
    'scanning',
    'clean',
    'rejected',
    'deleted'
  )),
  scan_status text NOT NULL DEFAULT 'not_started' CHECK (scan_status IN (
    'not_started',
    'pending',
    'clean',
    'infected',
    'suspicious',
    'timeout',
    'scanner_error'
  )),
  quarantine_key text,
  clean_key text,
  declared_mime_type text,
  detected_mime_type text,
  normalized_extension text,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  sha256 text,
  original_file_name_hash text,
  consent_version text NOT NULL,
  scanner_name text,
  scanner_signature_version text,
  scanned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS upload_objects_request_idx ON upload_objects (portal_request_id);
CREATE INDEX IF NOT EXISTS upload_objects_customer_state_idx ON upload_objects (customer_profile_id, storage_state, created_at DESC);
CREATE INDEX IF NOT EXISTS upload_objects_scan_status_idx ON upload_objects (scan_status, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('customer', 'staff', 'admin', 'system')),
  action text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('accepted', 'rejected', 'queued', 'blocked')),
  object_type text,
  object_id uuid,
  request_id uuid REFERENCES portal_requests(id) ON DELETE SET NULL,
  upload_object_id uuid REFERENCES upload_objects(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_hash text
);

CREATE INDEX IF NOT EXISTS audit_events_occurred_idx ON audit_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_actor_idx ON audit_events (actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_request_idx ON audit_events (request_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  scope text NOT NULL CHECK (scope IN (
    'backend_global',
    'login',
    'otp_activation',
    'password_reset',
    'upload_session',
    'public_form'
  )),
  subject_hash text NOT NULL,
  ip_hash text,
  decision text NOT NULL CHECK (decision IN ('allow', 'deny')),
  window_seconds integer NOT NULL,
  limit_count integer NOT NULL,
  observed_count integer NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limit_events_scope_subject_idx ON rate_limit_events (scope, subject_hash, occurred_at DESC);
CREATE INDEX IF NOT EXISTS rate_limit_events_ip_idx ON rate_limit_events (ip_hash, occurred_at DESC);
