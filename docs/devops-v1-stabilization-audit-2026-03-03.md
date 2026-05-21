# DevOps v1 Stabilization Audit - 2026-03-03

## Scope
- Netlify deployment determinism and SPA runtime safety.
- Environment-variable parity and validation behavior across local vs hosted builds.
- Release process reliability, rollback readiness, and post-deploy verification gates.
- Cross-functional risk review from current UX and Backend audit outputs.

## Findings (Prioritized)

### Critical
1. Netlify build contract was not codified in repo.
- Risk: dashboard-edited settings can drift silently and break reproducibility.
- Status: Mitigated by adding `netlify.toml` with explicit build/publish rules and Node version.

2. SPA route fallback was not committed.
- Risk: direct loads to `/student/*`, `/teacher/*`, `/admin` can return 404 on Netlify.
- Status: Mitigated by adding `apps/web/public/_redirects` and Netlify redirect rule.

### High
1. Env validation previously required a local `.env` file.
- Risk: Netlify/CI builds with dashboard env vars but no file would fail preflight.
- Status: Mitigated by updating `scripts/validate-web-env.mjs` to support process-env-only mode.

2. Firebase project alias model is not production-safe yet.
- Evidence: `.firebaserc` currently uses non-production aliases only.
- Risk: backend deployment can target wrong project during manual release.
- Status: Open.
- Required action: add explicit production alias and enforce it in release runbook.

3. No committed frontend observability integration for UX-critical failures.
- Risk: permission/routing regressions in production are detected late.
- Status: Open.
- Required action: wire centralized frontend error reporting (Sentry or equivalent) with release markers.

4. Lint quality gate is currently non-operational.
- Evidence: `npm run lint` fails because no ESLint configuration file exists.
- Risk: pre-release static checks are not enforceable; regressions can merge/deploy without style/quality guardrails.
- Status: Open blocker.
- Required action: commit a baseline ESLint config and fix/waive violations, then restore lint as blocking in hosted build.

### Medium
1. Release verification relies on manual checks only.
- Risk: inconsistent role-journey verification before/after deploy.
- Status: Open.
- Required action: automate smoke coverage for role login/routing + task submission + teacher approval.

2. Rollback procedure exists but is not yet artifact-based.
- Risk: rollback speed depends on rebuilding old commits under current infra state.
- Status: Open.
- Required action: store immutable build artifact per release and link it in release log.

## Hardening Changes Implemented
1. Added deterministic Netlify config:
- `netlify.toml`
  - `build.command = "npm run build"` (temporary stable path until lint baseline is committed)
  - `build.publish = "apps/web/dist"`
  - `NODE_VERSION = "18"`
  - SPA redirect rule.

2. Added committed SPA fallback:
- `apps/web/public/_redirects` with `/* /index.html 200`.

3. Fixed env validator for hosted builds:
- `scripts/validate-web-env.mjs` now supports process-env-only execution when `.env` is not present.

## Release-Gate Criteria (Required to Release)

1. **Config Gate**
- `npm run env:check -- --release` passes.
- Netlify env vars include all required `VITE_*` keys.
- `FIREBASE_PROJECT_ALIAS` is explicitly set for backend deploy steps.

2. **Build Gate**
- `npm run lint` passes (currently blocked until ESLint config is committed).
- `npm run build` passes.
- Netlify deploy preview build passes from repository settings (not ad hoc UI command overrides).
- After lint baseline is added, switch Netlify build command to `npm run release:preflight`.

3. **Security Gate**
- Firestore rules deployment and functions deployment succeed in defined order.
- Backend contract checks from `docs/backend-auth-contracts-2026-03-03.md` are validated in smoke.

4. **QA/Role Gate**
- Student: login -> onboarding -> task submit path verified.
- Teacher: pending -> active approval path verified.
- Super admin: `/admin` approval actions verified.
- Permission boundaries: student denied teacher/admin routes and protected writes.

5. **Post-Deploy Observability Gate**
- Check frontend console for permission/query regressions in all three roles.
- Check Firebase function logs for approval-trigger path health.
- Confirm no spike in failed Firestore reads/writes during first verification window.

## Cross-Functional Risk Notes
1. UX audit flags role-state clarity and pending-access messaging gaps; release checks must include route and state-copy verification.
2. Backend audit tightened write permissions; QA smoke must include expected `permission-denied` behavior to prevent false-positive incident triage.
3. Frontend routing refactor is planned; Netlify SPA fallback and route smoke are now mandatory before merging routing changes.

## Open Blockers
1. Owner: DevOps/Project Manager
- Blocker: Missing production Firebase alias policy.
- Impact: elevated risk of wrong-project backend deployments.
- Next action: add `production` alias in `.firebaserc` and require it in production release SOP.
