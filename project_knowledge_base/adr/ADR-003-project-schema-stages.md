# ADR-003: Project Enums, Team Assignment Join Table, and Stage 7 Derivation (D3)

- **Status:** Accepted (Decided)
- **Date:** 2026-11-22
- **Deciders:** Product Owner, Lead Architect
- **Technical Story:** D3 (Projects Lane) — Unblocks Projects domain module and schema constraints

---

## Context and Problem Statement

The initial database migration (`0001_initial.sql`) noted several open items left without SQL `CHECK` constraints or definitions:
* Undefined values for `project.event_type`.
* Undefined values for `project.financial_status` (only "Financially Closed" was explicitly named).
* Undefined team-assignment join table linking `app_user` team members to `project`.
* Formalization of the 7-stage workflow and the rule governing Stage 7 (`Financial Closed`).

The Projects lane cannot enforce data integrity or implement project operations without settling these specifications.

---

## Decision Outcome

**Decided Architecture for Projects Lane (D3):**

### 1. Concrete Domain Enums & Schema Constraints
* **`project.event_type`**:
  Constrained to canonical photography studio booking types:
  ```sql
  CHECK (event_type IN (
    'Wedding',
    'Pre-Wedding',
    'Engagement',
    'Birthday',
    'Corporate',
    'Anniversary',
    'Other'
  ))
  ```
* **`project.financial_status`**:
  Constrained to the three lifecycle states defined in PRD §4 / FR-E-04:
  ```sql
  CHECK (financial_status IN (
    'Financially Open',
    'Partially Settled',
    'Financially Closed'
  ))
  ```

### 2. Team Member Assignment Join Table
An explicit join table `project_team_assignment` is added to support M:N team member assignments (e.g. assigning second shooters, cinematographers, lead editors):
```sql
CREATE TABLE project_team_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio(id),
  project_id uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  assigned_role text NOT NULL, -- e.g. 'Lead Shooter', 'Second Shooter', 'Editor'
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_team_assignment_project ON project_team_assignment(project_id);
CREATE INDEX idx_project_team_assignment_user ON project_team_assignment(user_id);
```

### 3. Seven Deliverable Stages & Stage 7 Derivation Rule
* **The 7 Progress Stages (HLD §11c Decided)**:
  1. `Booking`
  2. `Vendor Setup`
  3. `Shoot Completed`
  4. `Digital Proofs Ready`
  5. `Album Layout Approved`
  6. `Print & Delivered`
  7. `Financial Closed`
* **Stage 7 Derivation Rule**:
  - `Financial Closed` is **never selectable or manually set by any user** (Owner or Team Member).
  - Any request `POST /api/projects/:id/stage` with `toStage: 'Financial Closed'` is rejected with error `STAGE_CANNOT_BE_SET_MANUALLY`.
  - The system automatically advances a project to `Financial Closed` when both:
    1. Deliverables have reached `Print & Delivered`.
    2. `financial_status` transitions to `'Financially Closed'` (all milestone payments verified and project balance equals 0).

### 4. Financial Status Lifecycle Transitions
* `Financially Open`: Project balance equals contract value (no verified payments yet).
* `Partially Settled`: Verified payments > 0, but remaining balance > 0.
* `Financially Closed`: Remaining project balance is exactly 0 paise.
