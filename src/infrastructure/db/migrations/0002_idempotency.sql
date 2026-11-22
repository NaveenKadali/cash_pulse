CREATE TABLE idempotency_keys (
  studio_id uuid NOT NULL REFERENCES studio(id) ON DELETE CASCADE,
  idem_key text NOT NULL CHECK (length(idem_key) BETWEEN 8 AND 128),
  request_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('in_progress','completed')),
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (studio_id, idem_key),
  CHECK ((status = 'completed') = (response IS NOT NULL))
);
