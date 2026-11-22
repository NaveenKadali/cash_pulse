# CashPulse Development Plan

## How to read the status column

| Status | Meaning |
|---|---|
| **Done** | Committed to git, and its unit tests pass. If the unit also has database tests that have not been run, the status says "DB tests not run". |
| **Written, not committed** | The code exists in the working tree but is not yet in git. It has not been reviewed as a finished unit. |
| **Partly done** | Some of the unit exists. The rest is missing, or it is not verified. |
| **Ready** | Every item it depends on is done, so it can be started now. |
| **Waiting on X** | It cannot start until X is done or decided. X is named. |
| **Decided, not built** | A decision is recorded, but no code implements it yet. |
| **Needs a decision** | A person must choose an option before work can continue. |
| **Needs a fix** | A known problem in the repo that can be corrected without a new decision. |

Status reflects the working tree as of commit bad6ad1 + local working-tree changes. "Written" and "Partly done" rows were verified via typecheck, build, and vitest unit tests (165 passing tests).

## Wave 0 — Decisions

| ID | Decision | Status | Notes |
|---|---|---|---|
| D1 | Web framework: Next.js 16+ (App Router), TypeScript, Tailwind CSS | Written, not committed | Configured via next.config.mjs, tailwind.config.ts, and postcss.config.mjs. `npm run build` succeeds (Turbopack). See ADR-001. |
| D2 | Join table `project_assignee` (snake_case raw SQL) | Written, not committed | Schema defined in `0004_decisions_schema_update.sql`. See ADR-003. |
| D3 | Canonical enums: event_type, financial_status, vendor.category, alert.kind | Written, not committed | Check constraints codified in `0004_decisions_schema_update.sql`. See ADR-003. |
| D4 | Added endpoints: pay-notify, balance, invites, client-link | Decided, not built | Specifications codified in ADR-002, ADR-004. Route handlers pending in src/app/api/. |
| D5 | Backup: 30 days daily snapshots + 7 days local WAL retention | Decided, not built | Documented in HLD-001 §8.4. Operations only; no code or config exists. |
| D6 | Module levels L0–L5; lower levels never import higher ones | Decided, not built | No lint or dependency-cruiser rule enforces it. |

## Open items

| ID | Item | Status | Blocks |
|---|---|---|---|
| OPEN-1 | Scaffold is plain Node; D1 requires Next.js. Decide whether K5 and UI-0 replace or wrap the scaffold, and who owns the change. | Resolved: Next.js App Router wraps the scaffold; src/infrastructure and src/modules remain pure headless services (ADR-001) | None |
| OPEN-2 | D2 uses camelCase names (User, Project); committed schema is snake_case raw SQL. Pick one convention before more tables are added. | Resolved: Standardized on snake_case raw SQL for tables and columns (ADR-003); TypeScript domain types map to camelCase | None |
| OPEN-3 | Two migrations share the prefix 0002: committed `0002_idempotency.sql` and untracked `0002_decisions_schema_update.sql`. Renumber the untracked one (or the decision is needed first, see OPEN-6). | Resolved: Consolidated untracked migration to `0004_decisions_schema_update.sql` | None |
| OPEN-4 | `src/lib/index.ts` does not exist. Create it once session, tenancy, idempotency and audit are wired in. | Resolved: Created `src/lib/index.ts` re-exporting session, tenancy, audit, and idempotency | None |
| OPEN-5 | `TEST_DATABASE_URL` is not set in any config, `.env.example` or CI, and there is no `.github/` workflow. Integration tests for K2, K3 and the 0001–0003 migrations have never run. | Resolved: Added TEST_DATABASE_URL to `.env.example` and created `.github/workflows/ci.yml` with Postgres 16 service container | None |
| OPEN-6 | Two idempotency tables: committed `idempotency_keys` (K2) and untracked `idempotency_record` in the decisions migration. Choose one. | Resolved: Canonical table is committed `idempotency_keys` (K2); removed redundant `idempotency_record` table | None |
| OPEN-7 | The untracked decisions migration uses event_type values (Wedding, Pre-Wedding, Engagement, Birthday, Corporate, Anniversary, Other) and financial_status values (Financially Open, Partially Settled, Financially Closed) that differ from D3. Confirm which set is canonical, then correct the migration. | Resolved: Standardized canonical enums in `0004_decisions_schema_update.sql` with check constraints for event_type, financial_status, vendor.category, and alert.kind | None |

## Wave 1 — Kernel

| ID | Unit | Owns | Depends on | Status |
|---|---|---|---|---|
| K1 | Session cookies (HttpOnly/Secure/SameSite), idle expiry | src/lib/session/ | none | Done |
| K2 | Idempotency keys: table and withIdempotency helper | src/lib/idempotency/, migration 0002_idempotency.sql | none | Done (DB tests not run) |
| K3 | Append-only audit writer and immutability triggers | src/lib/audit/, migration 0003_audit_details.sql | none | Done (DB tests not run) |
| K4 | Tenancy guard: scoped query builders forcing studio_id | src/lib/tenancy/ | none | Done |
| K5 | HTTP shell: router, error model, request context | src/app/ | none | Written, not committed (Next.js App Router root layout and routing shell) |
| K6 | SMS OTP adapter, mock in dev | src/adapters/sms/ | none | Written, not committed (types, mock adapter, tests pending) |
| K7 | UPI deep-link builder and sandbox payment gateway | src/adapters/payment/ | none | Ready (calculation utility implemented in invoicing calculations) |
| K8 | AI adapter interface only | src/adapters/ai/ | none | Ready |
| K9 | Integration harness: Postgres via TEST_DATABASE_URL in CI | tests/integration/, CI config | none | Partly done (CI workflow and .env.example configured; live run pending) |
| FC-1 | Pure cash-schedule engine | src/modules/forecast/ | none | Written, not committed (in engine.ts; 22 unit tests passing) |
| NU-1 | Three deterministic tone templates | src/modules/nudges/templates.ts | none | Written, not committed (templates.ts; 36 unit tests passing) |

## Wave 2 — Modules

Migration ranges: auth 0100s, projects 0200s, invoicing 0300s, vendors 0400s, forecast 0500s, nudges 0600s, client-portal 0700s. 0001–0004 are reserved. Committed migrations are not edited.

### auth (src/modules/auth/)
| ID | Unit | Depends on | Status |
|---|---|---|---|
| AU-1 | Phone OTP sign-in | K1, K6 | Written, not committed (service.ts, otp.ts; 20 unit tests passing) |
| AU-2 | Email sign-in | K1 | Written, not committed (service.ts, otp.ts) |
| AU-3 | Session expiry and sign-out-all | K1 | Written, not committed (service.ts, sliding timeout, sign-out-all) |
| AU-4 | Account recovery | AU-1, AU-2 | Ready |
| AU-5 | Workspace resolution, Free plan flag | K4 | Written, not committed (service.ts, universal resolution FR-H-07) |
| AU-6 | Role policy (Owner / Team Member) | AU-5, D2 | Ready (D2 resolved in schema 0004) |
| AU-7 | Invitations (P1) | AU-6, D4 | Waiting on AU-6 |
| AU-8 | Activity log view (P1) | K3 | Ready |

Module status: Universal Phone/Email OTP sign-in, session token issuance, sliding inactivity expiry, sign-out-all, and workspace resolution implemented with 20 unit tests passing.

### projects (src/modules/projects/)
| ID | Unit | Depends on | Status |
|---|---|---|---|
| PR-1 | Client records CRUD | K4 | Written, not committed (clients.ts; 17 unit tests passing) |
| PR-2 | Project create and seven-stage state machine | PR-1 | Written, not committed (projects.ts, lifecycle.ts; 23 unit tests passing) |
| PR-3 | Append-only stage log | PR-2, K3 | Written, not committed (projects.ts, types.ts; verified in unit tests) |
| PR-4 | Flexible & custom milestone schedule (50/50, 20/30/50, auto-rebalancing) | PR-2 | Written, not committed (milestones.ts; 15 unit tests passing) |
| PR-5 | Financial-status derivation | PR-2, IN-2 | Written, not committed (lifecycle.ts; verified in unit tests) |
| PR-6 | Album/download hold display | PR-2 | Written, not committed (summary.ts, isDeliverableHoldActive) |
| PR-7 | Project financial summary | PR-4, IN-2 | Written, not committed (summary.ts; verified in unit tests) |
| PR-8 | Role-based project list | AU-6, D2 | Ready |
| PR-9 | Studio profit summary (P1) | VD-4, IN-2 | Ready (VD-4 complete) |

Module status: Client CRUD, project lifecycle state machine, append-only stage log, flexible milestone schedules, financial status derivation, and contribution summary implemented with 71 unit tests passing across 4 test files.

### invoicing (src/modules/invoicing/)
| ID | Unit | Depends on | Status |
|---|---|---|---|
| IN-1 | Payment record, idempotent, UTR unique per studio | K2, PR-4 | Written, not committed (service.ts; 34 unit tests passing) |
| IN-2 | Balances per milestone and project | IN-1 | Written, not committed (calculations.ts) |
| IN-3 | Receivables aging | IN-2 | Written, not committed (calculations.ts) |
| IN-4 | Void and correction, audited | IN-1, K3 | Written, not committed (service.ts) |
| IN-5 | Refund as negative payment (P1) | IN-1 | Written, not committed (service.ts, recordRefund; 8 unit tests passing) |
| IN-6 | "I have paid" record (pending verification) | IN-1, D4 | Ready |

Module status: Complete domain engine, calculations, idempotent payments, void/corrections, and negative refunds implemented with 42 unit tests passing across 2 test files.

### vendors (src/modules/vendors/)
| ID | Unit | Depends on | Status |
|---|---|---|---|
| VD-1 | Vendor directory CRUD | K4, D3 | Written, not committed (directory.ts, types.ts; 27 unit tests passing) |
| VD-2 | Bills and estimated vs actual cost | VD-1, PR-2 | Written, not committed (bills.ts, types.ts; verified in unit tests) |
| VD-3 | Recurring expenses (day-of-month rule) | VD-1 | Written, not committed (recurring.ts; verified in unit tests) |
| VD-4 | Vendor payments incl. partial | VD-2, K2 | Written, not committed (bills.ts; verified in unit tests) |
| VD-5 | Payables aging | VD-4 | Written, not committed (bills.ts; verified in unit tests) |
| VD-6 | Owner-only payout rates (P1) | AU-6 | Ready |

Module status: Complete vendor directory, bills, partial payments, payables aging, and recurring expenses implemented with 73 unit tests passing across 3 test files.

### forecast (src/modules/forecast/)
| ID | Unit | Depends on | Status |
|---|---|---|---|
| FC-2 | Opening balance entry | AU-5, D4 | Written, not committed (types.ts & engine.ts; 22 unit tests passing) |
| FC-3 | 30/60/90-day runway and shortfall flag | FC-1, FC-2, IN-2, VD-5, VD-3 | Written, not committed (computeRunway in engine.ts) |
| FC-4 | No double-counting rule | FC-3 | Written, not committed (engine.ts; verified in unit tests) |
| FC-5 | What-if delays, 0–30 days | FC-3 | Written, not committed (compareForecastScenarios in engine.ts) |
| FC-6 | Collision attribution | FC-3 | Written, not committed (CandidateCover in engine.ts) |
| FC-7 | Lowest projected balance | FC-3 | Written, not committed (engine.ts; verified in unit tests) |

Module status: Complete pure forecast calculation engine implemented with 22 tests passing.

### nudges (src/modules/nudges/)
Reads figures from other modules; never recalculates them.
| ID | Unit | Depends on | Status |
|---|---|---|---|
| NU-2 | Follow-up message composition | NU-1, IN-3 | Written, not committed (messages.ts; 20 unit tests passing) |
| NU-3 | Alert generation (read-only over figures) | FC-3, IN-3, VD-5, D3 | Ready (VD-5 complete) |
| NU-4 | Alert de-duplication (P1) | NU-3 | Waiting on NU-3 |
| NU-5 | AI drafting with template fallback | NU-1, K8 | Waiting on K8 |
| NU-6 | Morning brief | NU-3, FC-3 | Waiting on NU-3 |
| NU-7 | Dashboard totals | IN-2, VD-5, FC-3 | Ready (VD-5 complete) |

Module status: Tone templates and follow-up message composer implemented with 56 unit tests passing across 2 test files.

### client-portal (src/modules/client-portal/)
Only unauthenticated module.
| ID | Unit | Depends on | Status |
|---|---|---|---|
| CP-1 | Token issue: 128-bit, stored hashed, expiry, revoke | PR-2 | Written, not committed (tokens.ts, service.ts; 16 unit tests passing) |
| CP-2 | /p/:token read model: noindex, no-cache | CP-1 | Written, not committed (service.ts, scrubbed read-model, FR-G-06 privacy) |
| CP-3 | Immediate revocation | CP-1 | Written, not committed (service.ts, revokeLink) |
| CP-4 | Sandbox pay simulate and "I have paid" | CP-2, K7, IN-6 | Waiting on CP-2 |
| CP-5 | UPI QR and pay action | K7, CP-2 | Written, not committed (service.ts, buildUpiDeepLink) |
| CP-6 | Visibility limits (P1) | CP-2 | Written, not committed (verified in client-portal.test.ts) |
| CP-7 | Link-expiry edit | CP-1, D4 | Written, not committed (service.ts, updateExpiry) |

Module status: 128-bit unguessable guest tokens, SHA-256 hash storage, sanitized read-model projection, immediate revocation, and dynamic NPCI UPI links implemented with 16 unit tests passing.

## Wave 3–4 — Web layer and QA

| ID | Unit | Owns | Depends on | Status |
|---|---|---|---|---|
| UI-0 | App shell per D1 | D1, K5 | Written, not committed (src/app/layout.tsx with metadata, font, viewport) |
| UI-1 | Landing page with live demo | UI-0 | Written, not committed (src/app/page.tsx; prerendered static via Next.js Turbopack) |
| UI-2 | Login page | AU-1, UI-0 | Written, not committed (src/app/login/page.tsx; phone/email OTP flow) |
| UI-3 | /app shell: five tabs and top bar | UI-0, AU-5 | Written, not committed (src/app/app/page.tsx; 5 tabs, top bar, morning brief) |
| UI-4 | Cash Runway & What-If tab | FC-3, FC-5 | Written, not committed (interactive delay slider & runway chart) |
| UI-5 | Projects & Contribution tab | PR-7, PR-8 | Written, not committed (stage stepper & contribution margins) |
| UI-6 | Invoices & Nudges tab | IN-3, NU-6 | Written, not committed (debtor radar table & record payment) |
| UI-7 | Vendor Payables tab | VD-5 | Written, not committed (print lab bills & pending payouts) |
| UI-8 | Settings & Team tab | AU-6, AU-7 | Written, not committed (studio details, UPI VPA, free tier limits) |
| UI-9 | Onboarding: studio profile, opening balance | AU-5, FC-2 | Ready |
| UI-10 | "Aarav Pixels" sample data | PR-2, IN-1, VD-2 | Written, not committed (aarav-pixels.ts; verified in unit tests) |
| UI-11 | Client page UI, mobile layout | CP-2, CP-5 | Written, not committed (src/app/p/[token]/page.tsx; scrubbed view, QR, claim) |
| QA-1 | Integration suite in CI | K9 | Ready (.github/workflows/ci.yml created) |
| QA-2 | Tenancy isolation and client-token leak tests | CP-1, K4 | Written, not committed (tests/unit/client-portal.test.ts) |
| QA-3 | Money invariant tests (paise, milestone sums) | PR-4 | Written, not committed (tests/unit/projects-milestones.test.ts) |
| QA-4 | Forecast no-double-count property test | FC-4 | Written, not committed (tests/unit/forecast.test.ts) |
| QA-5 | End-to-end happy path on demo data | UI-10, UI-3 | Written, not committed (tests/unit/ui-smoke.test.ts) |

## Parallel lanes

- Lane A (kernel and auth): K1–K4 (done), K5 (written), AU-1…AU-6
- Lane B (money): PR-1 (written), PR-2…PR-7, IN-1…IN-4 (written), VD-1…VD-5
- Lane C (forecast and nudges): FC-1…FC-7 (written), NU-1 (written), NU-2…NU-7
- Lane D (client portal): CP-1…CP-5, K6/K7 adapters
- Lane E (web and QA): D1 migration (written), K5 (written), UI-0…UI-1 (written), UI-2…UI-11, QA-1…QA-5

## Coordination rules

1. One session per unit; branch `wp/<ID>`.
2. Owned paths only. Shared files (package.json, route registry, src/lib/, migrations) change through the owning unit's small commit.
3. Contract first: a module's index.ts public interface merges before dependents are coded.
4. Always green: each commit passes typecheck, build and unit tests.
5. Done means the PRD acceptance criteria for the covered FR IDs pass.

## Changelog

- v1: plan drafted from PRD-001 v0.3, HLD-001, LLD-001.
- v2: Wave 0 decisions D1–D6 recorded; K1–K4 done; OPEN-1…OPEN-5 added.
- v3: status key reworded; statuses set from a working-tree survey at fd31b0c. Added OPEN-6 (duplicate idempotency tables) and OPEN-7 (enum values in the untracked decisions migration differ from D3). Written, uncommitted work found in K6, FC-1, FC-2, FC-3, FC-5, IN-1, IN-2, IN-3 and the adapters.
- v4: statuses updated to working tree at bad6ad1 + uncommitted changes.
- v5: updated working tree status. OPEN-1 through OPEN-7 resolved. D1, D2, D3 codified in ADR-001..004 and schema migration 0004. Next.js 16 App Router + Tailwind 3.4 wired, verified via next build. Unit PR-1 (Client CRUD in projects) and NU-1 (tone templates in nudges) implemented. Invoicing (IN-1..IN-4) and Forecast (FC-1..FC-7) complete in working tree. 165 tests passing across 13 test files.
- v6: implemented and verified VD-2 (Vendor bills & estimated vs actual costs), VD-3 (recurring expenses with day-of-month rule), VD-4 (partial vendor payments & overpayment protection), VD-5 (payables aging report), NU-2 (follow-up message composer with WhatsApp/SMS deep links), PR-3 (append-only stage log), PR-6 (deliverable hold display logic), and PR-7 (project financial summary & retention margin). 297 unit tests passing across 19 test files with clean next build.
- v7: implemented and verified AU-1..AU-5 (Universal Phone/Email OTP sign-in, session tokens, sliding inactivity expiry, sign-out-all, workspace resolution), CP-1..CP-3, CP-5, CP-7 (128-bit unguessable guest tokens, SHA-256 storage, scrubbed read-model with zero leakage, immediate revocation, dynamic NPCI UPI links), and UI-10 ("Aarav Pixels" demo seed fixture). 348 unit tests passing across 22 test files with clean next build.
- v8: implemented and verified PR-4 (flexible & customizable milestone schedules across arbitrary cuts like 50/50, 20/30/50, 20/30/20/30, and dynamic auto-rebalancing for ad-hoc client payments) and IN-5 (negative payment refunds with mandatory audit reason). 371 unit tests passing across 24 test files with clean next build.
