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

Status reflects the working tree as of commit fd31b0c. "Written" and "Partly done" rows were checked by file and function name, not by reading every line of logic.

## Wave 0 — Decisions

| ID | Decision | Status | Notes |
|---|---|---|---|
| D1 | Web framework: Next.js 14+ (App Router), TypeScript, Tailwind CSS | Decided, not built | No Next.js config, dependency or app/ directory exists. The scaffold is plain Node. See OPEN-1. |
| D2 | Join table `ProjectAssignee` (id, projectId, userId, role ASSIGNED_SHOOTER / LEAD_EDITOR / ASSISTANT, assignedAt; unique [projectId, userId]) | Decided, not built | No ProjectAssignee table or code exists. Naming conflicts with the schema. See OPEN-2. |
| D3 | Canonical enums: event_type, financial_status, vendor.category, alert.kind | Decided, not built | The untracked migration uses different values for event_type and financial_status, and has no constraint for category or kind. See OPEN-7. |
| D4 | Added endpoints: pay-notify, balance, invites, client-link | Decided, not built | None of the four routes exists in src/. |
| D5 | Backup: 30 days daily snapshots + 7 days local WAL retention | Decided, not built | Documented in HLD-001 §8.4. Operations only; no code or config exists. |
| D6 | Module levels L0–L5; lower levels never import higher ones | Decided, not built | No lint or dependency-cruiser rule enforces it. |

## Open items

| ID | Item | Status | Blocks |
|---|---|---|---|
| OPEN-1 | Scaffold is plain Node; D1 requires Next.js. Decide whether K5 and UI-0 replace or wrap the scaffold, and who owns the change. | Needs a decision | K5, UI-0…UI-11 |
| OPEN-2 | D2 uses camelCase names (User, Project); committed schema is snake_case raw SQL. Pick one convention before more tables are added. | Needs a decision | AU-6, PR-8, UI-5, all new migrations |
| OPEN-3 | Two migrations share the prefix 0002: committed `0002_idempotency.sql` and untracked `0002_decisions_schema_update.sql`. Renumber the untracked one (or the decision is needed first, see OPEN-6). | Needs a fix | Migration runner on a real database |
| OPEN-4 | `src/lib/index.ts` does not exist. Create it once session, tenancy, idempotency and audit are wired in. | Needs a fix | Any unit importing from the `src/lib` root |
| OPEN-5 | `TEST_DATABASE_URL` is not set in any config, `.env.example` or CI, and there is no `.github/` workflow. Integration tests for K2, K3 and the 0001–0003 migrations have never run. | Needs a fix | K9, QA-1, verification of K2 and K3 |
| OPEN-6 | Two idempotency tables: committed `idempotency_keys` (K2) and untracked `idempotency_record` in the decisions migration. Choose one. | Needs a decision | IN-1, VD-4, any payment write path |
| OPEN-7 | The untracked decisions migration uses event_type values (Wedding, Pre-Wedding, Engagement, Birthday, Corporate, Anniversary, Other) and financial_status values (Financially Open, Partially Settled, Financially Closed) that differ from D3. Confirm which set is canonical, then correct the migration. | Needs a decision | PR-1, PR-2, PR-5, UI-5 |

## Wave 1 — Kernel

| ID | Unit | Owns | Depends on | Status |
|---|---|---|---|---|
| K1 | Session cookies (HttpOnly/Secure/SameSite), idle expiry | src/lib/session/ | none | Done |
| K2 | Idempotency keys: table and withIdempotency helper | src/lib/idempotency/, migration 0002_idempotency.sql | none | Done (DB tests not run, OPEN-5) |
| K3 | Append-only audit writer and immutability triggers | src/lib/audit/, migration 0003_audit_details.sql | none | Done (DB tests not run, OPEN-5) |
| K4 | Tenancy guard: scoped query builders forcing studio_id | src/lib/tenancy/ | none | Done |
| K5 | HTTP shell: router, error model, request context | src/app/ | OPEN-1 | Waiting on OPEN-1 |
| K6 | SMS OTP adapter, mock in dev | src/adapters/sms/ | none | Written, not committed (no tests yet) |
| K7 | UPI deep-link builder and sandbox payment gateway | src/adapters/payment/ | none | Ready |
| K8 | AI adapter interface only | src/adapters/ai/ | none | Ready |
| K9 | Integration harness: Postgres via TEST_DATABASE_URL in CI | tests/integration/, CI config | OPEN-5 | Partly done (integration test files exist; no CI or env setup) |
| FC-1 | Pure cash-schedule engine | src/modules/forecast/ | none | Written, not committed (in engine.ts; the planned schedule.ts does not exist) |
| NU-1 | Three deterministic tone templates | src/modules/nudges/templates.ts | none | Ready |

## Wave 2 — Modules

Migration ranges: auth 0100s, projects 0200s, invoicing 0300s, vendors 0400s, forecast 0500s, nudges 0600s, client-portal 0700s. 0001–0003 are taken. Committed migrations are not edited.

### auth (src/modules/auth/)
| ID | Unit | Depends on | Status |
|---|---|---|---|
| AU-1 | Phone OTP sign-in | K1, K6 | Waiting on K6 (commit) |
| AU-2 | Email sign-in | K1 | Ready |
| AU-3 | Session expiry and sign-out-all | K1 | Ready |
| AU-4 | Account recovery | AU-1, AU-2 | Waiting on AU-1 |
| AU-5 | Workspace resolution, Free plan flag | K4 | Ready |
| AU-6 | Role policy (Owner / Team Member) | AU-5, D2, OPEN-2 | Waiting on OPEN-2 |
| AU-7 | Invitations (P1) | AU-6, D4 | Waiting on AU-6 |
| AU-8 | Activity log view (P1) | K3 | Ready |

Module status: `index.ts` is an empty placeholder.

### projects (src/modules/projects/)
| ID | Unit | Depends on | Status |
|---|---|---|---|
| PR-1 | Client records CRUD | K4 | Ready |
| PR-2 | Project create and seven-stage state machine | PR-1 | Waiting on PR-1 |
| PR-3 | Append-only stage log | PR-2, K3 | Waiting on PR-2 |
| PR-4 | Default 30/40/30 milestones summing to contract value | PR-2 | Waiting on PR-2 |
| PR-5 | Financial-status derivation | PR-2, IN-2 | Waiting on PR-2, IN-2 |
| PR-6 | Album/download hold display | PR-2 | Waiting on PR-2 |
| PR-7 | Project financial summary | PR-4, IN-2 | Waiting on PR-4, IN-2 |
| PR-8 | Role-based project list | AU-6, D2 | Waiting on AU-6 |
| PR-9 | Studio profit summary (P1) | VD-4, IN-2 | Waiting on VD-4, IN-2 |

Module status: `index.ts` is an empty placeholder.

### invoicing (src/modules/invoicing/)
| ID | Unit | Depends on | Status |
|---|---|---|---|
| IN-1 | Payment record, idempotent, UTR unique per studio | K2, PR-4 | Written, not committed (service.ts; idempotency and UTR uniqueness not verified) |
| IN-2 | Balances per milestone and project | IN-1 | Written, not committed (calculations.ts) |
| IN-3 | Receivables aging | IN-2 | Written, not committed (calculations.ts) |
| IN-4 | Void and correction, audited | IN-1, K3 | Partly done (void error type exists; flow not verified) |
| IN-5 | Refund as negative payment (P1) | IN-1 | Waiting on IN-1 (commit) |
| IN-6 | "I have paid" record (pending verification) | IN-1, D4 | Waiting on IN-1 (commit), D4 |

### vendors (src/modules/vendors/)
| ID | Unit | Depends on | Status |
|---|---|---|---|
| VD-1 | Vendor directory CRUD | K4, D3 | Ready (category CHECK still missing, OPEN-7) |
| VD-2 | Bills and estimated vs actual cost | VD-1, PR-2 | Waiting on VD-1, PR-2 |
| VD-3 | Recurring expenses (day-of-month rule) | VD-1 | Waiting on VD-1 |
| VD-4 | Vendor payments incl. partial | VD-2, K2 | Waiting on VD-2 |
| VD-5 | Payables aging | VD-4 | Waiting on VD-4 |
| VD-6 | Owner-only payout rates (P1) | AU-6 | Waiting on AU-6 |

Module status: `index.ts` is an empty placeholder.

### forecast (src/modules/forecast/)
| ID | Unit | Depends on | Status |
|---|---|---|---|
| FC-2 | Opening balance entry | AU-5, D4 | Written, not committed (OpeningBalanceInput type; no endpoint, D4 not built) |
| FC-3 | 30/60/90-day runway and shortfall flag | FC-1, FC-2, IN-2, VD-5, VD-3 | Written, not committed (computeRunway in engine.ts; VD-5 input not yet available) |
| FC-4 | No double-counting rule | FC-3 | Partly done (not verified) |
| FC-5 | What-if delays, 0–30 days | FC-3 | Written, not committed (DelayOverride and compareForecastScenarios; 0–30 range not verified) |
| FC-6 | Collision attribution | FC-3 | Partly done (CandidateCover type exists; logic not verified) |
| FC-7 | Lowest projected balance | FC-3 | Partly done (not verified) |

### nudges (src/modules/nudges/)
Reads figures from other modules; never recalculates them.
| ID | Unit | Depends on | Status |
|---|---|---|---|
| NU-2 | Follow-up message composition | NU-1, IN-3 | Waiting on NU-1 |
| NU-3 | Alert generation (read-only over figures) | FC-3, IN-3, VD-5, D3 | Waiting on FC-3 (commit), VD-5 |
| NU-4 | Alert de-duplication (P1) | NU-3 | Waiting on NU-3 |
| NU-5 | AI drafting with template fallback | NU-1, K8 | Waiting on NU-1, K8 |
| NU-6 | Morning brief | NU-3, FC-3 | Waiting on NU-3 |
| NU-7 | Dashboard totals | IN-2, VD-5, FC-3 | Waiting on VD-5, FC-3 (commit) |

Module status: `index.ts` is an empty placeholder.

### client-portal (src/modules/client-portal/)
Only unauthenticated module.
| ID | Unit | Depends on | Status |
|---|---|---|---|
| CP-1 | Token issue: 128-bit, stored hashed, expiry, revoke | PR-2 | Waiting on PR-2 |
| CP-2 | /p/:token read model: noindex, no-cache | CP-1 | Waiting on CP-1 |
| CP-3 | Immediate revocation | CP-1 | Waiting on CP-1 |
| CP-4 | Sandbox pay simulate and "I have paid" | CP-2, K7, IN-6 | Waiting on CP-2, K7, IN-6 |
| CP-5 | UPI QR and pay action | K7, CP-2 | Waiting on K7, CP-2 |
| CP-6 | Visibility limits (P1) | CP-2 | Waiting on CP-2 |
| CP-7 | Link-expiry edit | CP-1, D4 | Waiting on CP-1 |

Module status: `index.ts` is an empty placeholder.

## Wave 3–4 — Web layer and QA

| ID | Unit | Depends on | Status |
|---|---|---|---|
| UI-0 | App shell per D1 | D1, K5, OPEN-1 | Waiting on OPEN-1 |
| UI-1 | Landing page with live demo | UI-0 | Waiting on UI-0 |
| UI-2 | Login page | AU-1, UI-0 | Waiting on AU-1, UI-0 |
| UI-3 | /app shell: five tabs and top bar | UI-0, AU-5 | Waiting on UI-0 |
| UI-4 | Cash Runway & What-If tab | FC-3, FC-5 | Waiting on FC-3 (commit), UI-0 |
| UI-5 | Projects & Contribution tab | PR-7, PR-8 | Waiting on PR-7, PR-8 |
| UI-6 | Invoices & Nudges tab | IN-3, NU-6 | Waiting on NU-6, UI-0 |
| UI-7 | Vendor Payables tab | VD-5 | Waiting on VD-5, UI-0 |
| UI-8 | Settings & Team tab | AU-6, AU-7 | Waiting on AU-6, UI-0 |
| UI-9 | Onboarding: studio profile, opening balance | AU-5, FC-2 | Waiting on UI-0 |
| UI-10 | "Aarav Pixels" sample data | PR-2, IN-1, VD-2 | Waiting on PR-2 |
| UI-11 | Client page UI, mobile layout | CP-2, CP-5 | Waiting on CP-2, CP-5 |
| QA-1 | Integration suite in CI | K9 | Waiting on K9 |
| QA-2 | Tenancy isolation and client-token leak tests | CP-1, K4 | Waiting on CP-1 |
| QA-3 | Money invariant tests (paise, milestone sums) | PR-4 | Waiting on PR-4 |
| QA-4 | Forecast no-double-count property test | FC-4 | Waiting on FC-4 |
| QA-5 | End-to-end happy path on demo data | UI-10, UI-3 | Waiting on UI-10, UI-3 |

## Parallel lanes

- Lane A (kernel and auth): K1–K4 (done), K5, AU-1…AU-6
- Lane B (money): PR-1…PR-7, IN-1…IN-4, VD-1…VD-5
- Lane C (forecast and nudges): FC-1…FC-7, NU-1…NU-7
- Lane D (client portal): CP-1…CP-5, K6/K7 adapters
- Lane E (web and QA): D1 migration, K5, UI-0…UI-11, QA-1…QA-5

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
