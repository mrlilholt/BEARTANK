# Frontend v1 Stabilization Audit - 2026-03-03

Owner: Frontend Lead  
Scope: `apps/web` architecture, runtime reliability, route consistency, state handling, and performance.

## Audit Method

1. Code sweep of `apps/web/src` and existing lead handoff docs.
2. Runtime checks:
   - `npm run lint` (fails)
   - `npm run build` (passes with large chunk warning)
3. Contract alignment review against `firestore.rules` and backend handoff (`docs/backend-auth-contracts-2026-03-03.md`).

## Prioritized Findings

### Critical

1. Frontend lint gate is broken.
   - Evidence: `npm run lint` fails because no ESLint config exists.
   - Reference: `apps/web/package.json` (lint script), no `.eslintrc*`/`eslint.config.*` in repo.
   - Risk: no enforceable static quality gate for regressions/accessibility/runtime safety.

2. Submission action UI does not enforce backend state machine.
   - Evidence: task page always renders editable fields + submit action, regardless of current submission status.
   - References: [`TaskDetail.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/TaskDetail.jsx:138), [`TaskDetail.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/TaskDetail.jsx:173), backend resubmission limits in `firestore.rules`.
   - Risk: predictable `permission-denied` on student edits for non-editable statuses (`submitted`, `approved`), high user-facing failure rate.

### High

1. Route config drift and duplication.
   - Evidence: active router is in `App.jsx`, but `routes.jsx` remains unused and stale.
   - References: [`App.jsx`](/Users/alilholt/BEARTANK/apps/web/src/App.jsx:26), [`routes.jsx`](/Users/alilholt/BEARTANK/apps/web/src/routes.jsx:21).
   - Risk: role-route mismatch in future edits, QA/docs drift.

2. Firestore hook error state can become stale.
   - Evidence: `useDocument`/`useCollection` set error on failure but do not clear error on successful snapshots or when ref becomes null.
   - Reference: [`firestore-hooks.js`](/Users/alilholt/BEARTANK/apps/web/src/lib/firestore-hooks.js:23), [`firestore-hooks.js`](/Users/alilholt/BEARTANK/apps/web/src/lib/firestore-hooks.js:55).
   - Risk: stale error banners and non-deterministic page state.

3. Major pages are over-coupled and monolithic.
   - Evidence: large single-file pages mixing data access, mutation orchestration, and view rendering.
   - References:
     - [`StudentDashboard.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/StudentDashboard.jsx:1) (939 lines)
     - [`CompanyProfile.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/CompanyProfile.jsx:1) (828 lines)
     - [`TeacherStages.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/TeacherStages.jsx:1) (732 lines)
     - [`Teams.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/Teams.jsx:1) (680 lines)
     - [`Approvals.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/Approvals.jsx:1) (565 lines)
   - Risk: high regression probability and slow iteration.

4. Data loading pattern is inconsistent outside Approvals.
   - Evidence: most pages using `useCollection` ignore `loading` and `error`, rendering empty/sparse UI during load or failures.
   - Reference examples: [`StudentDashboard.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/StudentDashboard.jsx:102), [`StageDetail.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/StageDetail.jsx:18), [`Notifications.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/Notifications.jsx:19), contrasted with [`Approvals.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/Approvals.jsx:39).
   - Risk: indeterminate UX states and QA ambiguity.

### Medium

1. Performance bottleneck: single large JS bundle.
   - Evidence: build output reports `dist/assets/index-*.js` at ~1.2 MB minified and chunk-size warning.
   - Risk: slower initial load and poorer mobile performance.

2. Broad unscoped real-time subscriptions in teacher/admin surfaces.
   - Evidence:
     - `TeacherDashboard` reads whole collections (`submissions`, `teams`, `announcements`).
     - `Teams` reads `users`, `submissions`, `teamStages` globally.
     - `Approvals` reads wide data and runs nested read loops in approval updates.
   - References: [`TeacherDashboard.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/TeacherDashboard.jsx:60), [`Teams.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/Teams.jsx:55), [`Approvals.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/Approvals.jsx:106).
   - Risk: elevated read costs, slower UI, harder scaling.

3. Navigation and path literals are duplicated across app shell, routes, and pages.
   - References: [`App.jsx`](/Users/alilholt/BEARTANK/apps/web/src/App.jsx:36), [`AppShell.jsx`](/Users/alilholt/BEARTANK/apps/web/src/components/AppShell.jsx:32), [`TeacherDashboard.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/TeacherDashboard.jsx:111).
   - Risk: path drift and broken links during refactors.

4. Dead/legacy auth utility remains in codebase.
   - Evidence: `lib/auth.js` exports role utilities not imported anywhere.
   - Reference: [`auth.js`](/Users/alilholt/BEARTANK/apps/web/src/lib/auth.js:1).
   - Risk: confusion around source-of-truth role model.

5. Build artifacts are not ignored for workspace app output.
   - Evidence: root `.gitignore` only ignores `/dist`, not `apps/web/dist`.
   - Reference: [`.gitignore`](/Users/alilholt/BEARTANK/.gitignore:2).
   - Risk: accidental artifact churn in commits.

### Low

1. Repeated local UI helpers instead of shared primitives.
   - Evidence: duplicate `ProgressRing` implementations in student/teacher dashboards.
   - References: [`StudentDashboard.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/StudentDashboard.jsx:66), [`TeacherDashboard.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/TeacherDashboard.jsx:22).
   - Risk: style and behavior divergence over time.

2. Sidebar rendering duplication in `AppShell`.
   - Evidence: near-duplicate nav item rendering branches for primary and bottom nav groups.
   - Reference: [`AppShell.jsx`](/Users/alilholt/BEARTANK/apps/web/src/components/AppShell.jsx:175), [`AppShell.jsx`](/Users/alilholt/BEARTANK/apps/web/src/components/AppShell.jsx:257).
   - Risk: maintenance overhead.

## Remediation Plan

## Quick Wins (0-3 days)

1. Restore lint gate.
   - Add minimal ESLint config for React + hooks; ensure `npm run lint` passes in `apps/web`.
   - Add lint as required local/CI preflight step.

2. Remove route drift immediately.
   - Delete unused `routes.jsx`.
   - Move paths into constants (`paths.js`) and use them in `App.jsx` + `AppShell`.

3. Enforce submission action gating in `TaskDetail`.
   - Derive `canEditSubmission` from current submission status (`draft`/`needs_changes`).
   - Disable/hide submit action and set read-only inputs for non-editable states.
   - Map `permission-denied` to explicit user-safe message.

4. Stabilize Firestore hook state.
   - Clear stale `error` when query/doc ref changes or success snapshot arrives.
   - Return deterministic state transitions (`idle/loading/success/error`) or equivalent flags.

5. Add deterministic baseline states to high-traffic pages.
   - Apply loading/empty/error UI to Student Dashboard, Teacher Dashboard, Notifications, Stage Detail.

6. Prevent build artifact churn.
   - Update `.gitignore` to include `apps/web/dist`.

## Structural Refactors (1-2 sprints)

1. Route architecture consolidation.
   - Replace route repetition in `App.jsx` with config-driven role routing metadata.
   - Support route-level lazy loading and guard composition.

2. Feature-slice decomposition for monolith pages.
   - Extract data hooks and mutation actions from Student Dashboard, Teams, Approvals, Company Profile.
   - Keep page files as composition layers only.

3. Data-access layer hardening.
   - Centralize Firestore queries/mutations in feature service modules.
   - Limit broad subscriptions (pagination, filtering, demand-driven reads).
   - Move heavy approval side effects toward backend-authoritative operations where appropriate.

4. Shared page-state and form-action primitives.
   - Introduce `PageState` and action feedback components for consistent loading/error/unauthorized handling.
   - Standardize async mutation patterns (`idle`, `pending`, `success`, `error`).

5. App-shell/nav decomposition.
   - Separate nav configuration, badge query hooks, and presentation.
   - Remove duplicated sidebar rendering branches.

## Cross-Functional Validation Notes

1. Backend contract alignment required.
   - Frontend must handle `permission-denied` as expected state for restricted writes (per `docs/backend-auth-contracts-2026-03-03.md`).
   - Submission edit UX must stay aligned with rules for student resubmission fields/status.

2. QA test points to add/expand.
   - Submission page state matrix by status: `draft`, `submitted`, `needs_changes`, `approved`.
   - Role-route matrix: anonymous/student/pending teacher/active teacher/super admin.
   - Loading/empty/error states on core dashboards and lists.
   - Link/path integrity checks after route constant consolidation.

3. DevOps/runtime config risks.
   - Lint gate currently non-functional until config is added.
   - Bundle-size warning should be tracked with thresholds after route-level code splitting.
   - Env validation has improved via `env.js`; ensure release pipeline continues to run `env:check`.

## Recommended Sprint Sequencing

1. PR 1 (stability gate): ESLint config + hook error reset + task state gating.
2. PR 2 (routing integrity): path constants + remove stale route file + route smoke tests.
3. PR 3 (UI determinism): shared loading/empty/error states on priority pages.
4. PR 4 (performance): route lazy loading + large-page decomposition kickoff.
