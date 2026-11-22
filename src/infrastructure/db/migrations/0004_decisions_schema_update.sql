-- 0004_decisions_schema_update.sql: Implements decisions D2, D3, and resolves OPEN-2, OPEN-3, OPEN-6, OPEN-7.
-- Canonical snake_case naming for all tables and columns.
-- Idempotency uses committed idempotency_keys table (0002_idempotency.sql).

-- D2: Auth Session & OTP Verification
CREATE TABLE IF NOT EXISTS app_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL REFERENCES studio(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_session_token_hash ON app_session(token_hash);
CREATE INDEX IF NOT EXISTS idx_app_session_user ON app_session(user_id);

CREATE TABLE IF NOT EXISTS otp_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_request_identifier ON otp_request(identifier);

-- D3 & OPEN-7: Canonical Domain Enums
ALTER TABLE project
  ADD CONSTRAINT project_event_type_check
  CHECK (event_type IN ('Wedding', 'Pre-Wedding', 'Engagement', 'Birthday', 'Corporate', 'Anniversary', 'Other'));

ALTER TABLE project
  ADD CONSTRAINT project_financial_status_check
  CHECK (financial_status IN ('Financially Open', 'Partially Settled', 'Financially Closed'));

ALTER TABLE vendor
  ADD CONSTRAINT vendor_category_check
  CHECK (category IN ('second_shooter', 'drone_pilot', 'editor', 'album_designer', 'print_lab', 'software_tool', 'other'));

ALTER TABLE alert
  ADD CONSTRAINT alert_kind_check
  CHECK (kind IN ('overdue_payment', 'cash_deficit', 'unverified_payment', 'deliverable_hold'));

-- D2 / D3 & OPEN-2: Canonical snake_case Project Assignee Join Table
CREATE TABLE IF NOT EXISTS project_assignee (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  assigned_role text NOT NULL CHECK (assigned_role IN ('ASSIGNED_SHOOTER', 'LEAD_EDITOR', 'ASSISTANT')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_assignee_project ON project_assignee(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignee_user ON project_assignee(user_id);
