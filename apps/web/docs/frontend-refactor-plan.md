# BEARTANK Frontend Refactor Plan

Date: 2026-03-03  
Owner: Frontend Lead

## Scope

This plan covers maintainability refactors for routing and component structure in `apps/web/src`, while preserving current product behavior.

## Current-State Findings

1. Route definitions are duplicated across [`App.jsx`](/Users/alilholt/BEARTANK/apps/web/src/App.jsx) and [`routes.jsx`](/Users/alilholt/BEARTANK/apps/web/src/routes.jsx), and the files are already out of sync (`/pending` and `/resources` only exist in `App.jsx`).
2. [`App.jsx`](/Users/alilholt/BEARTANK/apps/web/src/App.jsx) repeats `RequireRole` wrappers for every protected route, which increases coupling and edit risk.
3. [`AppShell.jsx`](/Users/alilholt/BEARTANK/apps/web/src/components/AppShell.jsx) mixes layout rendering, role navigation config, auth state usage, and Firestore listeners (notification/approval badges).
4. Several pages are monolithic (500-900 lines) and mix data access, mutation logic, and presentational JSX in one file:
   - [`StudentDashboard.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/StudentDashboard.jsx)
   - [`CompanyProfile.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/CompanyProfile.jsx)
   - [`Approvals.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/Approvals.jsx)
   - [`TeacherStages.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/TeacherStages.jsx)
   - [`Teams.jsx`](/Users/alilholt/BEARTANK/apps/web/src/pages/Teams.jsx)
5. Firestore query/mutation contracts are spread directly across pages instead of being isolated behind feature APIs/hooks, which makes behavior changes risky.
6. Loading/error/empty states are inconsistent; many pages call `useCollection` but ignore `loading` and/or `error`.
7. Legacy auth utility [`lib/auth.js`](/Users/alilholt/BEARTANK/apps/web/src/lib/auth.js) is unused and duplicates role constants already defined in auth context.

## Refactor Goals

1. Single source of truth for route metadata, role permissions, and path constants.
2. Separate feature data orchestration from presentational components.
3. Standardize deterministic UI states: `loading`, `empty`, `error`, `unauthorized`.
4. Keep role-based behavior and current Firebase integration unchanged unless explicitly approved.
5. Make changes incremental and reversible by feature slice.

## Proposed Target Structure

```text
apps/web/src/
  app/
    routing/
      paths.js
      route-config.jsx
      role-routes.jsx
    navigation/
      nav-config.js
      use-nav-badges.js
  features/
    student/
      dashboard/
        page.jsx
        use-student-dashboard-data.js
        components/
    teacher/
      approvals/
        page.jsx
        use-approvals-data.js
        use-approval-actions.js
        components/
    shared/
      page-state/
        page-state.jsx
  services/
    firestore/
      submissions.js
      stages.js
      teams.js
      notifications.js
```

## Phased Execution Plan

### Phase 1: Routing Consolidation (highest priority)

1. Create `paths.js` for all route path constants.
2. Create a single `route-config.jsx` with `{ path, element, allowRoles, requiresAuth }`.
3. Generate route elements from config to remove repetitive `RequireRole` wrappers.
4. Remove unused [`routes.jsx`](/Users/alilholt/BEARTANK/apps/web/src/routes.jsx).
5. Add route-level fallback behavior for unauthorized and unknown-role access.

### Phase 2: AppShell Decomposition

1. Move role nav config out of [`AppShell.jsx`](/Users/alilholt/BEARTANK/apps/web/src/components/AppShell.jsx) into `nav-config.js`.
2. Move badge queries (`notifications`, `approvals`) into `use-nav-badges.js`.
3. Split sidebar item rendering into reusable nav item sections to remove duplicated JSX.
4. Keep current visual layout, but isolate side effects from view code.

### Phase 3: Feature Slice Extraction (begin with largest files)

1. Extract data/query hooks from:
   - Student dashboard
   - Approvals
   - Teams
2. Extract pure presentational sections from those pages into `components/` subfolders.
3. Keep page entry components thin (`compose hooks + sections`).
4. Keep existing user-visible copy and route behavior unchanged.

### Phase 4: State Model + Shared UI States

1. Add shared `PageState` primitives for loading/empty/error/unauthorized.
2. Adopt a consistent pattern for async actions (`isSaving`, `error`) with explicit reset behavior.
3. Centralize role/status constants in one module; remove duplicates (including unused `lib/auth.js`).

### Phase 5: Performance and Accessibility Hardening

1. Add route-level lazy loading with `React.lazy` + `Suspense` fallback.
2. Evaluate replacing global transform scaling in [`AppShell.jsx`](/Users/alilholt/BEARTANK/apps/web/src/components/AppShell.jsx) with responsive layout to avoid scaled text on small screens.
3. Normalize semantics for interactive list items (`ButtonBase`/link roles, focus styles, aria labels on icon-only controls).

## Backend Contract Validation Notes

Validated against [`firestore.rules`](/Users/alilholt/BEARTANK/firestore.rules):

1. Roles in frontend (`student`, `teacher`, `super_admin`) match rules.
2. Status gating (`pending`, `active`) affects route access and is required for teacher/student permissions.
3. Teacher/super-admin read access assumptions for submissions/notifications align with rules.
4. Student submission updates are restricted by rules (`draft`/`needs_changes`), so UI should expose permission-denied errors deterministically when editing non-editable states.

Backend dependencies to keep explicit during refactor:

1. `users/{uid}` shape: `role`, `status`, `onboarded`, `teamId`, `profile`.
2. `teamStages` id convention `${teamId}_${stageId}`.
3. `submissions` status lifecycle and `taskType` usage in approvals workflow.

## QA Coverage Targets

1. Route guard matrix by role: anonymous, student, pending teacher, active teacher, super admin.
2. Unauthorized redirect behavior for direct URL entry to protected routes.
3. Deterministic page states for each major page (`loading`, `error`, `empty`, `success`).
4. Approval flow regression: submit -> approve/needs changes -> notification + points update.
5. Navigation badge correctness across role switch and sign-out/sign-in cycles.

## DevOps / Runtime Config Risks

1. Frontend depends on runtime/build vars:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_SUPER_ADMIN_EMAILS`
   - `VITE_CLASS_CODE`
2. Missing env values currently fail late at runtime; add a lightweight startup validator in Phase 1/2 to fail fast in development.

## Recommended Next Implementation Step

Start Phase 1 and deliver it as a single PR:
1. Add `paths.js` and `route-config.jsx`.
2. Refactor `App.jsx` to render from config.
3. Remove dead `routes.jsx`.
4. Add basic route-guard coverage (smoke-level) for role redirects.
