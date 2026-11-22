# ADR-001: Web Framework Selection for Hybrid Rendering (D1)

- **Status:** Accepted (Decided)
- **Date:** 2026-11-22
- **Deciders:** Product Owner, Lead Architect
- **Technical Story:** D1 (Web Framework) — Resolves blocker for HLD §5 rendering implementation

---

## Context and Problem Statement

The CashPulse High-Level Design ([HLD-001 §5](file:///home/nvnk/projects/cash_pulse/project_knowledge_base/architecture/HLD-001.md)) dictates an explicit hybrid rendering strategy where each route uses the optimal rendering mode for its security, caching, and latency needs:
1. `/` (Public Landing): **SSG / ISR** (Static marketing content; ISR refreshes live demo entry without full rebuild).
2. `/app/*` (Dashboard, Projects, Invoices, Payables, Settings): **SSR** for the shell and data; **CSR** widgets for interactive sliders (`what-if`) and checklist progress.
3. `/login` (Auth): **SSR** (Universal phone/email sign-in form; server-rendered session creation; zero client caching).
4. `/p/:token` (Client Portal): **Edge SSR** (`noindex`, `no-cache`, sub-second latency on mobile WhatsApp links, dynamic UPI QR and deep links).
5. `/api/*` (Typed REST): **Server JSON API** with auth middleware, RBAC, and studio scoping.
6. **PWA Installability**: Installable standalone mobile shell (`manifest.json` + service worker per NFR-02).

The baseline repository was bootstrapped as a bare Node.js + TypeScript library with `vitest` and `pg`. It lacked an HTTP server, routing, SSR engine, and asset bundler. HLD §5 cannot be built without selecting and integrating a production web framework.

---

## Decision Drivers

1. **Native Support for HLD §5 Modes**: Must natively support SSG/ISR, Node SSR, Edge SSR, React Server Components (RSC), Client Components (CSR widgets), and Route Handlers without complex custom infrastructure.
2. **Clean Modular Monolith Boundary**: The existing domain modules in `src/modules/*` (forecast, invoicing, auth, projects, vendors, nudges, client-portal) must remain pure headless TypeScript services that the web framework consumes.
3. **Deployment Topology (HLD §7)**: Must compile via a multi-stage Dockerfile for containerized deployment (Render/Docker) or zero-config deployment on Vercel.
4. **Developer Experience & Performance**: Fast local dev server, strict TypeScript type-safety, and minimal bundle sizes for mobile devices in India (NFR-01, NFR-03).

---

## Considered Options

1. **Next.js (App Router, v15+ / React 19)**:
   - *Pros*: Natively supports all five HLD §5 rendering modes:
     - SSG / ISR via `revalidate` / `generateStaticParams`.
     - Server Components (RSC) for SSR routes (`/app`, `/login`).
     - Client Components (`'use client'`) for isolated interactive widgets.
     - Edge Runtime (`export const runtime = 'edge'`) for `/p/[token]`.
     - Route Handlers (`app/api/**/route.ts`) for typed REST.
     - Built-in PWA metadata and static asset pipeline.
   - *Cons*: Tighter coupling to React ecosystem; requires Next.js build runtime.
2. **Fastify / Express + Separate React Vite SPA**:
   - *Pros*: Very simple Node API server.
   - *Cons*: Fails HLD §5 requirements. Single-page applications cannot do SSG/ISR on marketing landing, cannot do Edge SSR for WhatsApp client links, and exposes raw client bundles rather than server-rendered security-gated shells.
3. **Remix / React Router v7**:
   - *Pros*: Excellent SSR and web standards request/response handling.
   - *Cons*: Edge runtime configuration per-route is less turnkey; ISR for static marketing pages requires external reverse proxy caching (e.g. Cloudflare / Fastly).

---

## Decision Outcome

**Chosen Option: Next.js (App Router)**

### Key Implementation Guidelines

1. **Routing and Page Structure (`src/app/` or `app/`)**:
   - `app/page.tsx`: Static marketing landing with ISR (`revalidate = 3600`).
   - `app/login/page.tsx`: SSR authentication gateway (universal phone/email).
   - `app/(dashboard)/app/...`: Authenticated studio portal (SSR layout with role-based checks; CSR interactive widgets marked with `'use client'`).
   - `app/p/[token]/page.tsx`: Edge SSR client portal (`export const runtime = 'edge'`) with `no-store` headers and NPCI UPI deep links.
   - `app/api/[...route]/route.ts`: Typed REST API routes importing domain services from `src/modules/*`.
2. **Module Integration**:
   - Domain modules (`src/modules/*`) remain pure business logic and repositories.
   - Route handlers and server components import module services directly.
3. **PWA Assets**:
   - `app/manifest.ts` or `public/manifest.json` configured with `display: 'standalone'`, theme colors, and icons.
