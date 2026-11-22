# CashPulse Development Plan

Status key: **Done** (committed), **Ready** (no open dependency, can start), **Blocked** (waits on a named item), **Open** (decision or conflict still to resolve).

Last updated: after K1–K4 commits (a52c006, 3b254af, b332c13, b81ef02).

## Wave 0 — Decisions

| ID | Decision | Status | Notes |
|---|---|---|---|
| D1 | Web framework: Next.js 14+ (App Router), TypeScript, Tailwind CSS | Decided | Current scaffold is plain TypeScript on Node with no web framework; migration to Next.js is needed before UI work. See OPEN-1. |
| D2 | Team Member ↔ Project join table `ProjectAssignee` (id, projectId, userId, role enum ASSIGNED_SHOOTER/LEAD_EDITOR/ASSISTANT, assignedAt; unique [projectId, userId]) | Decided | Naming conflicts with committed snake_case schema. See OPEN-2. |
| D3 | Canonical enums: event_type, financial_status, vendor.category, alert.kind | Decided | Currently stored as plain text in 0001_initial.sql; add CHECK constraints in a new migration. |
| D4 | Added endpoints: pay-notify, balance, invites, client-link | Decided | Must be reflected in LLD-001 before the owning units start. |
| D5 | Backup: 30 days daily snapshots + 7 days local WAL retention | Decided | Ops only. |
| D6 | Module levels L0–L5, acyclic; lower levels never import higher ones | Decided | Enforced through service functions or DB transactions. |

## Open items

| ID | Item | Status | Blocks |
|---|---|---|---|
| OPEN-1 | Scaffold is plain Node; D1 requires Next.js. Decide whether K5 (HTTP shell) and UI-0 replace or wrap the scaffold, and who owns that migration. | Open | K5, UI-0…UI-11 |
| OPEN-2 | D2 uses camelCase Prisma-style names (User, Project); committed schema is snake_case raw SQL. Pick one naming convention before more tables are added. | Open | AU-6, PR-8, UI-5, all new migrations |
| OPEN-3 | Two migration files share prefix 0002: `0002_idempotency.sql` (ours, committed b332c13) and `0002_decisions_schema_update.sql` (untracked, not created by us). Renumber one. | Open | Migration runner on a real DB |
| OPEN-4 | `src/lib/index.ts` not created (shared file). Add when session, tenancy, idempotency and audit are wired in. | Open | Any unit importing from `src/lib` root |
| OPEN-5 | Integration tests (idempotency, audit, db engine) never run: `TEST_DATABASE_URL` not set. | Open | Verification of K2, K3, 0001–0003 migrations |

## Wave 1 — Kernel (no dependencies; file-disjoint)

| ID | Unit | Owns | Status |
|---|---|---|---|
| K1 | Session cookies (HttpOnly/Secure/SameSite), idle expiry | src/lib/session/ | Done (a52c006) |
| K2 | Idempotency keys: table and withIdempotency helper | src/lib/idempotency/, migration 0002 | Done (b332c13); integration not run (OPEN-5) |
| K3 | Append-only audit writer + immutability triggers | src/lib/audit/, migration 0003 | Done (b81ef02); integration not run (OPEN-5) |
| K4 | Tenancy guard: scoped query builders forcing studio_id | src/lib/tenancy/ | Done (3b254af) |
| K5 | HTTP shell: router, error model, request context | src/app/ | Blocked (OPEN-1) |
| K6 | SMS OTP adapter, mock in dev | src/adapters/sms/ | Ready |
| K7 | UPI deep-link builder and sandbox payment gateway | src/adapters/payment/ | Ready |
| K8 | AI adapter interface only | src/adapters/ai/ | Ready |
| K9 | Integration harness: Postgres via TEST_DATABASE_URL in CI | tests/integration/, CI config | Blocked (OPEN-5) |
| FC-1 | Pure cash-schedule engine (no DB) | src/modules/forecast/schedule.ts | Ready |
| NU-1 | Three deterministic tone templates (pure) | src/modules/nudges/templates.ts | Ready |

## Wave 2 — Modules

Migration ranges: auth 0100s, projects 0200s, invoicing 0300s, vendors 0400s, forecast 0500s, nudges 0600s, client-portal 0700s. 0001–0003 are taken. Do not edit committed migrations.

### auth (src/modules/auth/)
| ID | Unit | Depends on | Status |
|---|---|---|---|
| AU-1 | Phone OTP sign-in | K1, K6 | Blocked (K6) |
| AU-2 | Email sign-in | K1 | Ready |
| AU-3 | Session expiry and sign-out-all | K1 | Ready |
| AU-4 | Account recovery | AU-1, AU-2 | Blocked |
| AU-5 | Workspace resolution, Free plan flag | K4 | Ready |
| AU-6 | Role policy (Owner / Team Member) | AU-5, D2, OPEN-2 | Blocked (OPEN-2) |
| AU-7 | Invitations (P1) | AU-6, D4 | Blocked |
| AU-8 | Activity log view (P1) | K3 | Ready |

### projects (src/modules/projects/)
| ID | Unit | Depends on | Status |
|---|---|---|---|
| PR-1 | Client records CRUD | K4 | Ready |
| PR-2 | Project create and seven-stage state machine | PR-1 | Blocked |
| PR-3 | Append-only stage log | PR-2, K3 | Blocked |
| PR-4 | Default 30/40/30 milestones summing to contract value | PR-2 | Blocked |
| PR-5 | Financial-status derivation | PR-2, IN-2 | Blocked |
| PR-6 | Album/download hold display | PR-2 | Blocked |
| PR-7 | Project financial summary | PR-4, IN-2 | Blocked |
| PR-8 | Role-based project list | AU-6, D2 | Blocked |
| PR-9 | Studio profit summary (P1) | VD-4, IN-2 | Blocked |

### invoicing (src/modules/invoicing/)
| ID | Unit | Depends on | Status |
|---|---|---|---|
| IN-1 | Payment record, idempotent, UTR unique per studio | K2, PR-4 | Blocked (PR-4) |
| IN-2 | Balances per milestone and project | IN-1 | Blocked |
| IN-3 | Receivables aging | IN-2 | Blocked |
| IN-4 | Void and correction, audited | IN-1, K3 | Blocked |
| IN-5 | Refund as negative payment (P1) | IN-1 | Blocked |
| IN-6 | "I have paid" record (pending verification) | IN-1, D4 | Blocked |

### vendors (src/modules/vendors/)
| ID | Unit | Depends on | Status |
|---|---|---|---|
| VD-1 | Vendor directory CRUD | K4, D3 | Blocked (D3 CHECK migration) |
| VD-2 | Bills and estimated vs actual cost | VD-1, PR-2 | Blocked |
| VD-3 | Recurring expenses (day-of-month rule) | VD-1 | Blocked |
| VD-4 | Vendor payments incl. partial | VD-2, K2 | Blocked |
| VD-5 | Payables aging | VD-4 | Blocked |
| VD-6 | Owner-only payout rates (P1) | AU-6 | Blocked |

### forecast (src/modules/forecast/)
| ID | Unit | Depends on | Status |
|---|---|---|---|
| FC-2 | Opening balance entry | AU-5, D4 | Blocked |
| FC-3 | 30/60/90-day runway and shortfall flag | FC-1, FC-2, IN-2, VD-5, VD-3 | Blocked |
| FC-4 | No double-counting rule | FC-3 | Blocked |
| FC-5 | What-if delays, 0–30 days | FC-3 | Blocked |
| FC-6 | Collision attribution | FC-3 | Blocked |
| FC-7 | Lowest projected balance | FC-3 | Blocked |

### nudges (src/modules/nudges/)
Reads figures from other modules; never recalculates them.
| ID | Unit | Depends on | Status |
|---|---|---|---|
| NU-2 | Follow-up message composition | NU-1, IN-3 | Blocked |
| NU-3 | Alert generation (read-only over figures) | FC-3, IN-3, VD-5, D3 | Blocked |
| NU-4 | Alert de-duplication (P1) | NU-3 | Blocked |
| NU-5 | AI drafting with template fallback | NU-1, K8 | Blocked |
| NU-6 | Morning brief | NU-3, FC-3 | Blocked |
| NU-7 | Dashboard totals | IN-2, VD-5, FC-3 | Blocked |

### client-portal (src/modules/client-portal/)
Only unauthenticated module.
| ID | Unit | Depends on | Status |
|---|---|---|---|
| CP-1 | Token issue: 128-bit, stored hashed, expiry, revoke | PR-2 | Blocked |
| CP-2 | /p/:token read model: noindex, no-cache | CP-1 | Blocked |
| CP-3 | Immediate revocation | CP-1 | Blocked |
| CP-4 | Sandbox pay simulate and "I have paid" | CP-2, K7, IN-6 | Blocked |
| CP-5 | UPI QR and pay action | K7, CP-2 | Blocked |
| CP-6 | Visibility limits (P1) | CP-2 | Blocked |
| CP-7 | Link-expiry edit | CP-1, D4 | Blocked |

## Wave 3–4 — Web layer and QA

| ID | Unit | Depends on | Status |
|---|---|---|---|
| UI-0 | App shell per D1 | D1, K5, OPEN-1 | Blocked |
| UI-1 | Landing page with live demo | UI-0 | Blocked |
| UI-2 | Login page | AU-1, UI-0 | Blocked |
| UI-3 | /app shell: five tabs and top bar | UI-0, AU-5 | Blocked |
| UI-4 | Cash Runway & What-If tab | FC-3, FC-5 | Blocked |
| UI-5 | Projects & Contribution tab | PR-7, PR-8 | Blocked |
| UI-6 | Invoices & Nudges tab | IN-3, NU-6 | Blocked |
| UI-7 | Vendor Payables tab | VD-5 | Blocked |
| UI-8 | Settings & Team tab | AU-6, AU-7 | Blocked |
| UI-9 | Onboarding: studio profile, opening balance | AU-5, FC-2 | Blocked |
| UI-10 | "Aarav Pixels" sample data | PR-2, IN-1, VD-2 | Blocked |
| UI-11 | Client page UI, mobile layout | CP-2, CP-5 | Blocked |
| QA-1 | Integration suite in CI | K9 | Blocked |
| QA-2 | Tenancy isolation and client-token leak tests | CP-1, K4 | Blocked |
| QA-3 | Money invariant tests (paise, milestone sums) | PR-4 | Blocked |
| QA-4 | Forecast no-double-count property test | FC-4 | Blocked |
| QA-5 | End-to-end happy path on demo data | UI-10, UI-3 | Blocked |

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
