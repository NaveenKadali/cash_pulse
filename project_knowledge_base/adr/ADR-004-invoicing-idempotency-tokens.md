# ADR-004: Invoicing Idempotency, Client Link Token Security, and Concurrency Locks (D4)

- **Status:** Accepted (Decided)
- **Date:** 2026-11-22
- **Deciders:** Product Owner, Lead Architect
- **Technical Story:** D4 (Invoicing Lane) — Unblocks Invoicing, Client Portal, and Payments concurrency

---

## Context and Problem Statement

The Invoicing and Payments lane handles financial transactions, client payment links, and immutable audit logs ([PRD-001 FR-A-03, FR-A-07, FR-A-08, FR-G-01, FR-G-07](file:///home/nvnk/projects/cash_pulse/project_knowledge_base/prd/PRD-001.md), [HLD-001 §8.1, §8.5](file:///home/nvnk/projects/cash_pulse/project_knowledge_base/architecture/HLD-001.md), [LLD-001 §4.10, §9](file:///home/nvnk/projects/cash_pulse/project_knowledge_base/architecture/LLD-001.md)).
To ensure absolute mathematical correctness and zero race conditions under flaky mobile network conditions (A6), the following decisions must be codified:
1. Standard idempotency key mechanism on mutating money endpoints.
2. Unguessable, one-way hashed client link tokens with instant revocation.
3. Concurrency locking to prevent double-spending or simultaneous overpayments.
4. Refund representation and void auditability.

---

## Decision Outcome

**Decided Architecture for Invoicing Lane (D4):**

### 1. Idempotency Key Protocol & Storage
* **Header**: Mutating payment and schedule endpoints (`POST /api/vendor-bills/:id/payments`, `POST /api/invoicing/payments`, `POST /api/projects/:id/milestones`) require the header:
  `Idempotency-Key: <client-generated-uuid>`
* **Persistence Schema**:
  ```sql
  CREATE TABLE idempotency_record (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id uuid NOT NULL REFERENCES studio(id),
    key text NOT NULL,
    request_path text NOT NULL,
    request_hash text NOT NULL, -- SHA-256 of canonical JSON payload
    response_code integer NOT NULL,
    response_body jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (studio_id, key)
  );

  CREATE INDEX idx_idempotency_studio_key ON idempotency_record(studio_id, key);
  ```
* **Execution Rules**:
  1. If `(studio_id, key)` exists and `request_hash` matches: Return stored `response_body` and `response_code` immediately with zero state mutation.
  2. If `(studio_id, key)` exists but `request_hash` differs: Abort transaction and return HTTP 409 `IDEMPOTENCY_KEY_REUSED`.
  3. If missing on a mutating money endpoint: Return HTTP 400 `MISSING_IDEMPOTENCY_KEY`.

### 2. Client Link Token Security & Revocation
* **Generation**: 256-bit entropy token generated via `crypto.randomBytes(32).toString('base64url')`.
* **One-Way Digest Storage**:
  - The raw token is returned to the studio owner once upon creation.
  - The database only stores `SHA-256(raw_token)` in `client_link.token_hash`.
  - Lookup query:
    ```sql
    SELECT * FROM client_link
    WHERE studio_id = $1
      AND token_hash = digest($2, 'sha256')
      AND status = 'Active'
      AND (expires_at IS NULL OR expires_at > now());
    ```
* **Instant Edge Revocation**:
  - Setting `status = 'Revoked'` takes effect instantly on the next Edge request.
  - The Edge route `/p/:token` is served with `Cache-Control: no-store, no-cache, must-revalidate` and `X-Robots-Tag: noindex, nofollow`. Revoked/expired links render `"link no longer active"` with zero data exposure.

### 3. Concurrency Protection via Pessimistic Row Locking
* Every payment write runs inside `withTransaction`.
* To prevent race conditions where two simultaneous requests overpay a milestone or vendor bill:
  - The service executes `SELECT amount, contract_value FROM milestone WHERE id = $1 FOR UPDATE` (or `vendor_bill`).
  - Reads and aggregates all non-voided payments within that locked snapshot.
  - Validates `sum(payments) + newPayment <= milestone.amount`.
  - Rejects with `OVERPAYMENT_REJECTED` if exceeded.

### 4. Refunds & Correction History
* **Voiding Payments (FR-A-07)**:
  - `voidPayment` sets `voided = true`, `void_reason = $reason`, and `voided_at = now()`.
  - The row is **never deleted**. Milestone balance is restored.
* **Refunds (FR-A-09)**:
  - Recorded as a payment record with negative `amountPaise` (e.g. `-250000n` for a ₹2,500 refund).
  - Requires explicit `refund_reason` and is tagged `OwnerConfirmed`.
  - Adjusts net collected cash while preserving full payment ledger history.
