# CashPulse 📸 ⚡

> **The Back Office & Cash-Flow Co-Pilot for Photography Studios**  
> CashPulse eliminates studio cash-flow crunches through predictive 30-day runway modeling, 7-stage production milestone gating, dynamic NPCI UPI payment links, and tone-adaptive automated payment nudges.

---

## 🌟 Key Highlights

- **Predictive Liquidity Engine**: Daily liquidity health gauges tracking cash balances, upcoming vendor payables (print labs, editors, second shooters), and debtor aging buckets (1–15, 16–30, 31–60 days).
- **Interactive "What-If" Runway Slider**: Simulate the financial impact of client payment delays (0 to 30 days) on studio survival in real-time.
- **7-Stage Production Milestone Gates**: Enforce contract milestones (*Booking Advance ➔ Shoot ➔ Proofs ➔ Layout Approval ➔ Print & Delivery ➔ Financial Close*) so deliverables are never released without settled balances.
- **Dynamic NPCI UPI QR & Intent Links**: Clients scan standard UPI QR codes or click instant mobile deep links (`upi://pay?...`) with pre-filled amounts and invoice reference numbers.
- **Enterprise Onboarding & Dual Login**:
  - Full registration wizard (`/register`) with compulsory email verification gate to activate Free Subscriptions and trials.
  - Dual authentication: Email + Password or Indian Mobile (`+91`) + Phone OTP.
- **Tone-Adaptive AI Payment Reminders**: Generate contextual WhatsApp and SMS drafts across **Friendly** (sneak peek celebration), **Formal** (album layout sign-off), and **Firm** (production hold notice) tones with deterministic offline fallback.
- **Progressive Web App (PWA)**:
  - Installable to mobile and desktop home screens with native app shell (`display: standalone`).
  - Offline resilience via Service Worker (`public/sw.js`) and branded offline fallback page (`public/offline.html`).
- **Production-Ready Docker Stacks**: Lightweight multi-stage Alpine Docker image (**~89 MB**) and PostgreSQL 16 Docker Compose environment.

---

## 📚 Project Knowledge Base (PKB)

CashPulse was built under the **Autonomous Product Engine & Autodidact PKB Principle**. The [`project_knowledge_base/`](./project_knowledge_base) serves a dual purpose:
1. **Exhaustive Engineering & Audit Record**: Contains all system specifications, mathematical formulations, security invariants, and schema migrations.
2. **Autodidact Educational Masterclass**: Guides technical product owners and engineers through the 7-stage product evolution lifecycle (*Ideation ➔ MVP ➔ PMF ➔ Optimization ➔ Scaling ➔ Maturity ➔ EOL*).

| Document | Purpose |
|:---|:---|
| **[Concept Document](./project_knowledge_base/concept/concept_document.md)** | Problem validation, studio persona workflows (Aarav Pixels), and core product hypotheses. |
| **[PRD-001](./project_knowledge_base/prd/PRD-001.md)** | Product Requirements Document, user journeys, edge cases, and functional specifications. |
| **[HLD-001](./project_knowledge_base/architecture/HLD-001.md)** | High-Level Design: System architecture, multi-tenant boundaries, and service topology. |
| **[LLD-001](./project_knowledge_base/architecture/LLD-001.md)** | Low-Level Design: Database schemas, RBAC matrix, and canonical API contract definitions. |
| **[DEVELOPMENT-PLAN.md](./project_knowledge_base/plan/DEVELOPMENT-PLAN.md)** | Phased work breakdown structure, Quality Gate checklists, and release tracking. |
| **[ADR Directory](./project_knowledge_base/adr/)** | Architectural Decision Records: Framework selection, session auth, 7-stage schemas, and idempotency. |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Language**: TypeScript 5.6 (Strict Type Safety)
- **Database**: PostgreSQL 16 with ACID transactions and schema migrations
- **Styling**: Tailwind CSS & Lucide Icons (Dark Obsidian `#0b0f19` palette)
- **Containerization**: Docker (Multi-stage Alpine runner) & Docker Compose
- **Testing**: Vitest (452 unit & integration tests across 37 test suites)
- **Mobile/PWA**: Service Worker caching, W3C Web Manifest, and viewport cover configuration

---

## 🚀 Quick Start

### Option A: Running with Docker (Recommended)

1. **Clone the repository and prepare environment variables**:
   ```bash
   cp .env.example .env
   ```

2. **Launch the production stack (App + PostgreSQL)**:
   ```bash
   docker compose up -d --build
   ```
   - Studio Workspace: [http://localhost:3000/app](http://localhost:3000/app)
   - Registration Portal: [http://localhost:3000/register](http://localhost:3000/register)
   - PostgreSQL running on port `5432` with auto-applied migrations.

3. **Stop the stack**:
   ```bash
   docker compose down
   ```

---

### Option B: Local Node.js Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run database migrations (Optional if running against local Postgres)**:
   ```bash
   npm run db:migrate
   ```

3. **Start Next.js development server**:
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000).

---

## 🧪 Verification & Quality Gates

The codebase enforces strict quality gates with comprehensive test coverage:

```bash
# 1. Typecheck the entire TypeScript codebase
npm run typecheck

# 2. Run the automated test suite (450+ tests)
npm test

# 3. Build optimized standalone production artifacts
npm run build
```

### Test Suite Summary (37 Suites, 452 Tests)
- `tests/integration/registration-flow.test.ts`: Enterprise onboarding and compulsory verification gates.
- `tests/integration/api-contracts.test.ts`: Canonical LLD §7 & §8 contract tests (Auth, Projects, Payments, Nudges, Runway).
- `tests/integration/pwa.test.ts`: Service Worker, offline fallback, web manifest, and touch icon validation.
- `tests/unit/forecast.test.ts`: 30-day runway projection algorithms and shortfall warnings.
- `tests/unit/invoicing.test.ts`: Milestone percentage calculations, refund policies, and idempotency keys.
- `tests/unit/ai-adapter.test.ts`: Multi-tone payment reminder generation with offline template fallback.

---

## 📱 Application Routes & Persona Touchpoints

| Route | Persona | Description |
|:---|:---|:---|
| `/` | Public | High-converting marketing landing page. |
| `/register` | Studio Owner | 2-step registration wizard with compulsory email activation. |
| `/login` | All Roles | Dual authentication portal (Email + Password or Phone + OTP). |
| `/app` | Studio Owner & Team | The core operating cockpit: Liquidity Health Gauge, What-If Runway Slider, 7-Stage Milestone Manager, Debtor Radar, and Vendor Payables. |
| `/p/[token]` | Studio Client | Private client portal: Shoot milestone timeline, dynamic NPCI UPI QR code, and "I have paid" UTR submission. |
| `/offline.html` | PWA Offline Fallback | Branded offline page displayed automatically when connectivity drops. |

---

## 🔒 Security & Quality Invariants

- **Zero-Mock Database Staging**: Containerized staging and integration runs execute against real PostgreSQL engines.
- **Idempotency Guarantees**: All payment and financial transactions require `Idempotency-Key` headers to protect against network replays and race conditions.
- **Role-Based Isolation (RBAC)**: Studio Owners retain full ledger and financial rights; Team Members access operational shoot data with money scrubbed from responses.
- **No Production Commits Without Sign-Off**: The Control Plane governs working tree verification before repository state promotion.

---

## 📄 License

Proprietary — CashPulse Studio Co-Pilot. All rights reserved.
