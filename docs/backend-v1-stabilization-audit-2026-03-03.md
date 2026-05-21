# Backend Lead - v1 Stabilization Audit (2026-03-03)

## Scope
- Firebase auth role resolution and onboarding write paths.
- Firestore rules enforcement for student/teacher/super admin boundaries.
- Frontend-visible Firestore write assumptions that affect backend integrity.
- Cloud Functions reliability for post-approval side effects.
- DevOps/QA artifacts that impact backend safety in production.

## Executive Summary
- Core least-privilege posture improved versus v1 baseline, but there are still **production risks to data integrity and authorization consistency**.
- Highest-risk gap: **points issuance has two writers** (client + function), which can cause duplicate rewards and weak auditability.
- Highest-risk auth gap: **student onboarding class code remains client-only validation** and is not enforced by backend policy.
- A **source-of-truth mismatch** exists between frontend super-admin email logic and backend allowlist/rules.

## Findings (Severity Ordered)

### Critical
1. Dual points issuance authority can duplicate or tamper rewards.
- Evidence:
  - Frontend teacher flow writes points directly: `apps/web/src/pages/Approvals.jsx` lines 331-339.
  - Firestore trigger also writes points on approval: `functions/index.js` lines 16-27.
  - Rules still allow teacher client writes to ledger: `firestore.rules` line 312.
- Risk:
  - Duplicate ledger entries when both paths run.
  - Any active teacher client can mint arbitrary ledger rows.
  - Audit trail is not deterministic.
- Required fix:
  - Make points issuance server-authoritative only.
  - Remove direct client `pointsLedger` writes.
  - Keep `pointsLedger` write path inaccessible to web clients.
  - Add idempotency keyed by `sourceId` (`submissionId`) in function logic.

### High
2. Student class-code gate is enforced only in UI, not backend authorization.
- Evidence:
  - Class code validated in client: `apps/web/src/pages/Onboarding.jsx` lines 49-52.
  - Onboarding writes role/status directly from client: `apps/web/src/lib/auth-context.jsx` lines 131-153.
  - Rules allow student self-create with `student + active` and no class code check: `firestore.rules` lines 53-65.
- Risk:
  - A direct Firestore client can bypass class code and self-register as active student.
- Required fix:
  - Enforce class code (or invite token) server-side via callable/function or rules-backed settings document.
  - Treat UI class-code check as usability only, not security.

3. Super-admin source-of-truth split between frontend env and backend rules/settings.
- Evidence:
  - Frontend role inference uses env email list fallback: `apps/web/src/lib/auth-context.jsx` lines 201-205.
  - Backend super-admin creation requires `settings/security.superAdminEmails`: `firestore.rules` lines 45-63.
- Risk:
  - Frontend can render admin/teacher routes for users backend does not authorize.
  - Creates inconsistent behavior (`permission-denied` loops) and weak operator trust.
- Required fix:
  - Backend profile/claims must be the single role source of truth.
  - Remove email-fallback role elevation in frontend routing decisions.
  - Implement claims synchronization in backend trigger.

### Medium
4. Cloud Functions auth side effects remain stubbed.
- Evidence:
  - TODO placeholders in `functions/index.js` lines 8, 32, 42.
- Risk:
  - Teacher approval claim sync not guaranteed.
  - Announcement fan-out reliability tied to frontend client path.
  - Audit/event consistency depends on UI execution order.
- Required fix:
  - Implement `onUserRoleUpdate` claim sync and robust announcement fan-out with retries/idempotency.

5. QA coverage artifacts for security boundaries are missing from repo.
- Evidence:
  - No QA plan/matrix files found for regression/auth boundary execution.
- Risk:
  - Rule regressions and role leakage can ship undetected.
- Required fix:
  - Add role-boundary pass/fail matrix with reproducible cases.
  - Include explicit negative tests (forbidden writes) as release gates.

6. Release hygiene gap: lint gate is defined but currently non-executable in this workspace state.
- Evidence:
  - Lint script exists: `apps/web/package.json` line 10.
  - Current lint execution fails due missing ESLint config discovery baseline in workspace.
- Risk:
  - Preflight reliability is reduced and can block predictable release flow.
- Required fix:
  - Commit and verify a stable ESLint config baseline; ensure `release:preflight` is deterministic in CI.

## Cross-Functional Review Notes

### Frontend trust assumptions
- Approval and points UX currently assumes client-side side effects are authoritative; backend should own integrity-critical writes.
- Role fallback logic should not infer elevated role from local env alone.

### UI/UX permission implications
- UX recommendation to prevent invalid student submission actions is aligned with rules hardening.
- Super-admin landing and role copy should reflect backend-authorized role, not inferred role.

### QA security/authorization implications
- Must include negative-path tests for:
  - student self role/status mutation,
  - forbidden submission field tampering,
  - forbidden points ledger writes from client,
  - class-code bypass attempts.

### DevOps config/secrets implications
- `settings/security.superAdminEmails` becomes a release-critical backend config object.
- Netlify and Firebase env/alias validation has improved, but backend settings drift still needs a documented ownership process.

## Rollout-Safe Sequencing
1. **Freeze authority model**:
   - Decide canonical points issuer (server only).
2. **Backend-first hardening**:
   - Implement idempotent server points issuance.
   - Implement claim sync trigger.
3. **Frontend contract migration**:
   - Remove client ledger writes.
   - Remove super-admin email fallback for elevated role routing.
4. **Rules tightening**:
   - Block client writes to `pointsLedger`.
   - Add server-backed student enrollment policy (class code/invite enforcement).
5. **QA gate update**:
   - Add explicit authorization negative tests and release matrix.
6. **Release check**:
   - Run preflight + role-based smoke tests before and after rules/functions deploy.

## Immediate Next Actions (Backend Lead)
1. Implement server-only points issuance with idempotency and remove client writer path.
2. Implement `onUserRoleUpdate` custom claim sync.
3. Propose class-code/invite server-side enforcement design and migration plan for existing users.
