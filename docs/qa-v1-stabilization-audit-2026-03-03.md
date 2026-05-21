# QA v1 Stabilization Audit - 2026-03-03

Owner: QA Lead  
Scope: Regression + acceptance audit for deployed v1 role journeys (student, teacher, super admin), permission boundaries, and release readiness.

## Execution Summary

Audit execution method:
1. Static contract verification against current implementation:
   - `apps/web/src/App.jsx`
   - `apps/web/src/components/RequireAuth.jsx`
   - `apps/web/src/components/RequireRole.jsx`
   - `apps/web/src/pages/TaskDetail.jsx`
   - `apps/web/src/pages/CompanyProfile.jsx`
   - `apps/web/src/pages/Approvals.jsx`
   - `apps/web/src/pages/AdminDashboard.jsx`
   - `apps/web/src/pages/Onboarding.jsx`
   - `apps/web/src/lib/auth-context.jsx`
   - `firestore.rules`
   - `functions/index.js`
2. Build/release command execution:
   - `npm run build` -> Pass
   - `npm run release:preflight` -> Fail
   - `npm --workspace apps/web run lint` -> Fail
3. Cross-functional artifact review:
   - UX: `docs/ux/role-flow-audit-2026-03-03.md`
   - Frontend: `apps/web/docs/frontend-refactor-plan.md`
   - Backend: `docs/backend-auth-contracts-2026-03-03.md`
   - DevOps: `docs/devops-v1-stabilization-audit-2026-03-03.md`, `docs/release-runbook.md`

Known execution limits:
1. Full credentialed role journeys against production were not executed in this workspace session (no live test accounts/session switching in this terminal run).
2. Matrix entries below are marked as `PASS` only when directly validated by executable commands or deterministic rule/code paths.

## Pass/Fail Matrix

| ID | Area | Check | Result | Evidence |
| --- | --- | --- | --- | --- |
| AUTH-01 | Auth boundary | Anonymous user is blocked from protected routes and redirected to `/login`. | PASS | `RequireAuth` redirects when `!user`. |
| AUTH-02 | Role boundary | Users are redirected away from unauthorized role routes. | PASS | `RequireRole` enforces `allow` list and fallback dashboard routing. |
| AUTH-03 | Pending teacher gate | Pending accounts route to `/pending` before protected pages. | PASS | `RequireAuth` checks `status === 'pending'`. |
| AUTH-04 | Super admin approval authority | Teacher activation is restricted to active super admin transition only. | PASS | `firestore.rules` `canSuperAdminApproveTeacher()`. |
| SUB-01 | Student submit validation | Timeline note is required before submission write. | PASS | `TaskDetail` blocks submit when timeline note empty. |
| SUB-02 | Student resubmission integrity | Students can only mutate `status/content/updatedAt` on owned draft/needs-changes submissions. | PASS | `firestore.rules` `canStudentResubmitSubmission()`. |
| SUB-03 | Submission state UX/testability | UI prevents invalid edits for `submitted/approved` states. | FAIL | `TaskDetail` always renders submit action; rules reject invalid status edits. |
| DATA-01 | Points integrity | Exactly one points issuance path per approval. | FAIL | Frontend approval writes points ledger and Cloud Function writes points ledger on approval status change. |
| DATA-02 | Team profile governance | Team profile publishing is teacher-controlled. | PASS | `firestore.rules` now restricts `teamProfiles` create/update to teacher role. |
| ADM-01 | Super admin onboarding dependency | Super admin bootstrap succeeds without backend settings dependency. | BLOCKED | Rules require `settings/security.superAdminEmails`; missing config blocks self-provisioning. |
| REL-01 | Build reproducibility | Production web build succeeds with env validation. | PASS | `npm run build` passed with env check and Vite build. |
| REL-02 | Release gate | `release:preflight` succeeds end-to-end. | FAIL | Preflight fails because lint fails: no ESLint config present. |
| REL-03 | Deploy target safety | Production Firebase alias is explicitly defined. | FAIL | `.firebaserc` contains `staging` and `BEARTANK`; no dedicated `production` alias. |

## Defects (Reproducible)

### DEF-01 - Duplicate points issuance path
- Severity: Critical
- Owners: Backend Lead, Frontend Lead
- Area: Approval workflow / scoring integrity
- Reproduction:
1. Ensure `onSubmissionStatusChange` function is deployed.
2. Approve any submission from `/teacher/approvals`.
3. Query `pointsLedger` by `sourceId == submissionId`.
- Expected:
1. Exactly one `pointsLedger` entry is created for a single approval event.
- Actual:
1. Frontend creates a ledger entry in `Approvals`.
2. Cloud Function also creates a ledger entry when status changes to `approved`.
- Evidence:
1. `apps/web/src/pages/Approvals.jsx` points write in approval handler.
2. `functions/index.js` points write in `onSubmissionStatusChange`.

### DEF-02 - Submission action remains enabled for non-editable statuses
- Severity: High
- Owners: Frontend Lead
- Area: Student task flow / state correctness
- Reproduction:
1. Open a task with an existing submission in `submitted` or `approved`.
2. Edit fields and click "Submit for approval".
- Expected:
1. Read-only state for non-editable statuses.
2. No action button that triggers guaranteed permission failure.
- Actual:
1. Submit action remains available.
2. Backend rules deny update for non-editable statuses, causing avoidable runtime error.
- Evidence:
1. `apps/web/src/pages/TaskDetail.jsx` always renders submit button.
2. `firestore.rules` only allows student updates from `draft`/`needs_changes`.

### DEF-03 - Release preflight is non-functional due missing ESLint configuration
- Severity: High
- Owners: Frontend Lead, DevOps/Release Lead
- Area: Release gating
- Reproduction:
1. Run `npm run release:preflight`.
- Expected:
1. Preflight runs env check + lint + build and can pass on healthy codebase.
- Actual:
1. Lint fails immediately: ESLint configuration file not found.
- Evidence:
1. Command output from `npm run release:preflight`.
2. `npm --workspace apps/web run lint` fails with same root cause.

### DEF-04 - Super admin bootstrap is config-fragile
- Severity: High
- Owners: Backend Lead, DevOps/Release Lead
- Area: Role bootstrap / access continuity
- Reproduction:
1. Remove or omit `settings/security.superAdminEmails`.
2. Sign in with email present in `VITE_SUPER_ADMIN_EMAILS`.
- Expected:
1. Super admin provisioning succeeds consistently for valid admin accounts.
- Actual:
1. Firestore rules deny super admin user doc creation/update without backend settings allowlist, producing blocked admin onboarding/access.
- Evidence:
1. Rule dependency in `firestore.rules` `isAllowlistedSuperAdminEmail()`.
2. Backend handoff note in `docs/backend-auth-contracts-2026-03-03.md`.

## Cross-Functional QA Review

### UX outputs review
1. Confirmed UX finding on submission state ambiguity; this is testability-critical and maps directly to DEF-02.
2. Pending access messaging remains role-ambiguous; this increases acceptance-test interpretation variance.

### Frontend outputs review
1. Frontend refactor plan correctly identifies route-source drift and inconsistent loading/error handling.
2. Immediate regression risk remains until refactor Phase 1 includes deterministic role-route tests and submission-state UI locking.

### Backend outputs review
1. Rules hardening closed key escalation paths and tightened mutable-field boundaries.
2. Remaining blocker is operational dependency (`settings/security`) and unresolved points single-authority design (DEF-01).

### DevOps outputs review
1. Netlify config, SPA fallback, and env validator improvements are positive and testable.
2. Release gate is currently broken because lint cannot execute (DEF-03).
3. Production alias policy remains incomplete and should stay a release blocker (REL-03).

## Residual Risk and Release Confidence

Residual risk register:
1. Critical: scoring inflation risk from duplicate points issuance (DEF-01).
2. High: student-facing invalid action path causing avoidable permission-denied failures (DEF-02).
3. High: non-functional preflight gate undermines release reliability (DEF-03).
4. High: super admin access depends on extra backend config that is easy to miss (DEF-04).

Release risk level: High  
QA recommendation: Do not approve production release until DEF-01 and DEF-03 are resolved, and DEF-02 has either a fix or an explicit product-risk sign-off.

## Immediate Next QA Actions
1. Re-run Gate A (auth boundaries), Gate B (submission lifecycle), and Gate C (scoring/admin side-effects) after fixes for DEF-01/02/03.
2. Execute live role-account smoke on deployed environment and append runtime evidence (screenshots/log IDs) to this report.
