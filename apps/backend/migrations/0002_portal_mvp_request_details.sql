CREATE TABLE IF NOT EXISTS portal_request_details (
  portal_request_id uuid PRIMARY KEY REFERENCES portal_requests(id) ON DELETE CASCADE,
  detail_kind text NOT NULL CHECK (detail_kind IN (
    'prescription_upload_metadata',
    'appointment_wish',
    'reorder_wish',
    'subscription_wish',
    'contact_wish'
  )),
  safe_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_boundary text NOT NULL DEFAULT 'safe-metadata-only' CHECK (data_boundary = 'safe-metadata-only'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_request_details_kind_idx
  ON portal_request_details (detail_kind);

COMMENT ON TABLE portal_request_details IS
  'Safe Portal-MVP request metadata only. No diagnoses, no free text, no file contents, no Omnia writes.';

COMMENT ON COLUMN portal_request_details.safe_payload IS
  'Structured allow-listed metadata for appointment, reorder, subscription, contact, or upload metadata requests.';
