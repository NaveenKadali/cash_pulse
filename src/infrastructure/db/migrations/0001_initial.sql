-- 0001_initial.sql: CashPulse core schema (PRD/HLD/LLD v0.1).
--
-- Open LLD items (not decided; stored as text without a CHECK constraint):
--   * project.event_type values
--   * project.financial_status values (only "Financially Closed" is named in the LLD)
--   * vendor.category values
--   * alert.kind values
--   * Join table linking team members to projects (LLD leaves it undefined)
--   * project owner column (intentionally not added)
--
-- Project stage uses the seven stage names from LLD decision 11c. Stage 7 follows financial status.
--
-- Money is BIGINT integer paise. Dates are DATE. Timestamps are timestamptz.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE studio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  plan text NOT NULL CHECK (plan IN ('Free', 'Starter'))
);

CREATE TABLE app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio(id),
  role_type text CHECK (role_type IN ('Owner', 'Team Member')),
  invitation_status text CHECK (invitation_status IN ('Invited', 'Active', 'Revoked')),
  login_identifier text,
  UNIQUE (studio_id, login_identifier)
);

-- owner_user_id is added after app_user exists so the FK can point at it.
ALTER TABLE studio
  ADD COLUMN owner_user_id uuid UNIQUE REFERENCES app_user(id);

CREATE TABLE workspace_membership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio(id),
  user_id uuid REFERENCES app_user(id),
  role_type text CHECK (role_type IN ('Owner', 'Team Member')),
  source text CHECK (source IN ('Invitation', 'Owner')),
  phone text,
  email text
);

CREATE UNIQUE INDEX workspace_membership_studio_user_uniq
  ON workspace_membership (studio_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE client (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio(id),
  whatsapp_phone text NOT NULL,
  secondary_phone text,
  city text
);

CREATE TABLE project (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio(id),
  client_id uuid NOT NULL REFERENCES client(id),
  event_type text,
  venue_location text,
  primary_contact_person text NOT NULL,
  target_album_delivery_date date,
  stage text NOT NULL CHECK (stage IN (
    'Booking',
    'Vendor Setup',
    'Shoot Completed',
    'Digital Proofs Ready',
    'Album Layout Approved',
    'Print & Delivered',
    'Financial Closed'
  )),
  financial_status text,
  contract_value bigint NOT NULL CHECK (contract_value >= 0),
  CHECK (stage <> 'Financial Closed' OR financial_status = 'Financially Closed')
);

CREATE TABLE milestone (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES project(id),
  percentage numeric(5, 2) CHECK (percentage > 0 AND percentage <= 100),
  amount bigint NOT NULL CHECK (amount > 0),
  due_date date
);

CREATE TABLE payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio(id),
  milestone_id uuid NOT NULL REFERENCES milestone(id),
  amount bigint NOT NULL CHECK (amount > 0),
  payer_name text,
  payment_mode text CHECK (payment_mode IN ('UPI', 'Bank transfer', 'Cash', 'Other')),
  transaction_utr_ref text,
  verification_status text CHECK (verification_status IN ('Owner-confirmed', 'Unverified')),
  received_on date,
  voided boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX payment_studio_utr_uniq
  ON payment (studio_id, transaction_utr_ref)
  WHERE transaction_utr_ref IS NOT NULL;

CREATE TABLE vendor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio(id),
  vendor_phone text,
  payment_handle text,
  category text
);

CREATE TABLE vendor_bill (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio(id),
  vendor_id uuid NOT NULL REFERENCES vendor(id),
  linked_project_id uuid REFERENCES project(id),
  amount bigint NOT NULL CHECK (amount > 0),
  due_date date NOT NULL
);

CREATE TABLE vendor_payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES vendor_bill(id),
  amount bigint NOT NULL CHECK (amount > 0),
  paid_on date
);

CREATE TABLE recurring_expense (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio(id),
  amount bigint NOT NULL CHECK (amount > 0),
  day_of_month integer NOT NULL CHECK (day_of_month BETWEEN 1 AND 28),
  start_date date NOT NULL,
  end_date date,
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE opening_balance_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio(id),
  as_of_date date NOT NULL,
  amount bigint NOT NULL,
  UNIQUE (studio_id, as_of_date)
);

CREATE TABLE stage_change (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES project(id),
  from_stage text,
  to_stage text NOT NULL,
  changed_by uuid NOT NULL REFERENCES app_user(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE alert (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio(id),
  project_id uuid REFERENCES project(id),
  kind text,
  status text NOT NULL CHECK (status IN ('Open', 'Dismissed', 'Resolved'))
);

CREATE TABLE client_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES project(id),
  token_hash text NOT NULL UNIQUE,
  status text CHECK (status IN ('Active', 'Revoked', 'Expired')),
  expires_at timestamptz NOT NULL
);

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio(id),
  actor_user_id uuid REFERENCES app_user(id),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
