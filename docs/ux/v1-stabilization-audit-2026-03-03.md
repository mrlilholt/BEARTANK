# BEARTANK UX Stabilization Audit (v1)
Date: 2026-03-03  
Lead: UI/UX Lead  
Sprint: Active Assignment Sprint - v1 Stabilization Audit

## Audit Scope
- Role journeys audited: `student`, `teacher`, `super_admin`.
- Surfaces audited: auth/onboarding/pending, dashboards, submission/review, company profile, notifications, shared shell/navigation.
- Cross-functional inputs reviewed:
  - Frontend refactor plan: `apps/web/docs/frontend-refactor-plan.md`
  - Backend contract hardening: `docs/backend-auth-contracts-2026-03-03.md`
  - Enforcement source: `firestore.rules`

## Journey Map Snapshot

### Student
1. `Landing -> Login -> Onboarding (class code) -> /student`
2. Core loop: `/student -> /student/task/:taskId -> /student/company`
3. Supporting loop: notifications, announcements, resources, help desk, pitch deck

### Teacher
1. `Landing -> Login -> Onboarding (teacher) -> /pending`
2. After approval: `/teacher`
3. Core loop: `/teacher/approvals`, `/teacher/teams`, `/teacher/stages`

### Super Admin
1. Role resolved through allowlist flow in rules/context
2. Current default route still sends super admin to teacher dashboard first
3. Admin approval workspace is separated at `/admin`

## Prioritized Findings

## Critical

### C1. Submission action state does not match backend permissions
- Evidence:
  - Submission button always shown as primary action in task detail: `apps/web/src/pages/TaskDetail.jsx:174`
  - Existing submission is always updated on submit click: `apps/web/src/pages/TaskDetail.jsx:97`
  - Backend only allows student resubmit from `draft` or `needs_changes`: `firestore.rules:174`
- UX impact:
  - Students can attempt an action that is not actually allowed, then get a late failure.
  - This is trust-breaking in the core learning workflow.
- Frontend implementation guidance:
  - Add explicit UI states by `submission.status`:
    - `draft` -> primary `Submit for approval`
    - `needs_changes` -> primary `Resubmit for approval`
    - `submitted` -> disable form, show "Waiting for teacher review"
    - `approved` -> lock form, show "Approved and closed"
  - Hide or disable primary action when backend would reject it.
  - Replace generic error with deterministic state message.

## High

### H1. Super admin lands on teacher dashboard instead of admin control surface
- Evidence: `DASHBOARD_BY_ROLE.super_admin = '/teacher'`: `apps/web/src/lib/auth-context.jsx:37`
- UX impact:
  - First action for super admin (teacher approvals/access control) is deprioritized.
  - Increases time-to-resolution for pending teacher access.
- Frontend implementation guidance:
  - Route super admin default landing to `/admin`.
  - Keep teacher tools accessible as secondary navigation context.

### H2. Pending page copy conflicts with actual approval model
- Evidence:
  - Title says teacher approval wait: `apps/web/src/pages/PendingAccess.jsx:11`
  - Body clarifies super admin approval for teacher accounts: `apps/web/src/pages/PendingAccess.jsx:18`
- UX impact:
  - Ambiguous ownership of approval action during first blocked moment.
- Frontend implementation guidance:
  - Split into role-aware pending messaging variants:
    - Teacher pending -> waiting on super admin approval
    - Student pending/blocked -> class/team-specific resolution path

### H3. Silent redirect on unauthorized role access breaks orientation
- Evidence: role rejection redirects with no explanation: `apps/web/src/components/RequireRole.jsx:8`, `apps/web/src/components/RequireRole.jsx:10`
- UX impact:
  - User is moved without context; appears like random navigation behavior.
- Frontend implementation guidance:
  - Add "Access restricted" state page/toast before redirect or as destination banner.
  - Include plain-language reason + valid destination CTA.

### H4. Startup env failures are hard errors without user-facing recovery
- Evidence: app throws on missing env vars: `apps/web/src/lib/env.js:21`, `apps/web/src/lib/env.js:30`
- UX impact:
  - Production misconfiguration yields crash-level failure with no in-app guidance.
- Frontend + DevOps handoff:
  - Add explicit config-failure screen for runtime startup errors (human-readable + support next step).
  - Add release gate validating required env set before deploy.

## Medium

### M1. Student dashboard shows synthetic schedule values
- Evidence: generated day index/time placeholders: `apps/web/src/pages/StudentDashboard.jsx:337`, `apps/web/src/pages/StudentDashboard.jsx:338`
- UX impact:
  - Students may interpret fake schedule metadata as real deadlines.
- Frontend implementation guidance:
  - Replace with real scheduling metadata or neutral labels (`Next`, `In Queue`, `Completed`).

### M2. Student phase picker truncates stage visibility
- Evidence: only first four stages shown in quick tiles: `apps/web/src/pages/StudentDashboard.jsx:326`
- UX impact:
  - Teams lose discoverability for later-stage roadmap context.
- Frontend implementation guidance:
  - Add horizontal scroll, pagination, or "View all phases" modal/list.

### M3. Teacher quick-action labels are hover-discoverable only
- Evidence: label reveal on hover with hidden default opacity: `apps/web/src/pages/TeacherDashboard.jsx:262`, `apps/web/src/pages/TeacherDashboard.jsx:291`
- UX impact:
  - Weak affordance on touch devices and keyboard-only navigation.
- Frontend implementation guidance:
  - Keep labels visible by default; hover should only enhance styling.

### M4. Shared shell uses fixed-width scale transform instead of responsive layout
- Evidence:
  - Fixed base width: `apps/web/src/components/AppShell.jsx:73`
  - Scaled container: `apps/web/src/components/AppShell.jsx:123`
  - Window-width dependent scaling: `apps/web/src/components/AppShell.jsx:85`
- UX impact:
  - Potential text-size/readability distortion on smaller screens.
- Frontend implementation guidance:
  - Move to responsive grid/breakpoint layout without global scale transform.

### M5. Notification links use `href` for app-internal paths
- Evidence: `href={item.link}` in notifications list: `apps/web/src/pages/Notifications.jsx:55`
- UX impact:
  - Full document navigation can feel inconsistent vs in-app route transitions.
- Frontend implementation guidance:
  - Use router-aware navigation for internal links, preserve external `href` behavior only for true external URLs.

### M6. Many high-traffic pages ignore loading/error states
- Evidence:
  - Student dashboard reads many collections but no loading/error model: `apps/web/src/pages/StudentDashboard.jsx:102`
  - Teacher dashboard same pattern: `apps/web/src/pages/TeacherDashboard.jsx:58`
  - Teams page same pattern: `apps/web/src/pages/Teams.jsx:41`
  - Contrasting good pattern exists in Approvals: `apps/web/src/pages/Approvals.jsx:39`
- UX impact:
  - Users can see temporary false empty states during initial data fetch.
- Frontend implementation guidance:
  - Standardize `loading/empty/error` frame before rendering empty-state claims.

## Low

### L1. Route source-of-truth drift risk remains in repo
- Evidence:
  - Unused static route list still present: `apps/web/src/routes.jsx:21`
  - Active router includes paths not represented there: `apps/web/src/App.jsx:32`, `apps/web/src/App.jsx:100`, `apps/web/src/App.jsx:165`
- UX impact:
  - Future route edits can drift and create inconsistent behavior/copy across docs/components.
- Frontend implementation guidance:
  - Complete route consolidation to one config source and remove stale route map file.

## Frontend Implementation Pack (Prioritized)

### P0 (next implementation cycle)
1. Implement task submission capability states (C1).
2. Change super admin default landing to `/admin` (H1).
3. Add role-aware pending messaging and access-restriction explanatory states (H2, H3).
4. Add unified loading/empty/error wrapper for student and teacher dashboards first (M6).

### P1
1. Replace synthetic student runway schedule data and expose all stages (M1, M2).
2. Remove hover-only labeling pattern in teacher quick actions (M3).
3. Convert internal notification links to router navigation (M5).

### P2
1. Replace AppShell scale transform with responsive breakpoint layout (M4).
2. Finalize route source-of-truth cleanup (L1).

## Cross-Functional Handoff Notes

### Backend Lead
1. Confirm canonical submission lifecycle names used by UX copy (`draft`, `submitted`, `needs_changes`, `approved`).
2. Confirm super admin provisioning dependency rollout for `settings/security.superAdminEmails` so pending/access messaging can be deterministic.

### QA Lead
1. Add explicit regression checks for each task submission status state and expected UI affordances.
2. Add role-routing assertion for super admin default landing destination.
3. Add accessibility checks for teacher quick action discoverability on touch/keyboard.

### DevOps/Release Lead
1. Add deploy gate ensuring required env variables are populated.
2. Add post-deploy verification for auth onboarding + pending + admin landing path.

## Acceptance Criteria (Plain Language)
1. A student can always tell whether a task is editable and what action is allowed now.
2. A student never sees a primary submit action that backend rules will reject.
3. A super admin lands directly on the admin access-control workspace.
4. Pending-state copy clearly states who must approve access for that role.
5. Student dashboard schedule labels reflect real data or clearly non-time placeholders.
6. Teacher quick actions are understandable without hover.
7. Key dashboard pages show loading/error/empty states consistently.
8. Internal notifications open in-app without disruptive full-page reload.

## Dependencies
1. Backend confirmation that lifecycle/status naming will remain stable for UI copy.
2. Frontend agreement to adjust super admin landing behavior in current sprint scope.
3. DevOps addition of env parity/release gate checks.

## Open Questions
1. Should super admins keep the teacher dashboard as a secondary default tab after `/admin`, or only as explicit nav?
2. Should submitted tasks be fully locked, or should students be allowed to withdraw before review?
3. Should student-facing timeline/runway show exact due times, or priority buckets only?
