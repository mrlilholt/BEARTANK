# QA Gate A-D Rerun - Execution Sprint (2026-03-03)

Owner: QA Lead  
Scope: Final rerun after Execution Sprint critical fixes.

## Gate Results

| Gate | Scope | Result | Evidence |
| --- | --- | --- | --- |
| Gate A | Auth boundaries + route integrity | PASS | `App.jsx` now uses valid direct `<Route>` children only; protected routes still enforce `RequireAuth` + `RequireRole`; dedicated unauthorized route exists. |
| Gate B | Submission lifecycle | PASS | `TaskDetail` now gates editing to `draft`/`needs_changes`, disables form for locked states, hides action button when transition is invalid, and maps permission errors to deterministic messaging. |
| Gate C | Scoring/admin side-effects | PASS | Client points ledger writes removed from approvals flow; Cloud Function now issues points server-side with deterministic ledger ID + transaction idempotency; Firestore rules deny all client writes to `pointsLedger`. |
| Gate D | Release sanity | PASS | `env:check --release`, `lint`, `build`, and `release:preflight` all exit 0; Netlify build command is set to `npm run release:preflight`. |

## Executed Checks

1. `npm --workspace apps/web run lint`
- Result: pass (0 errors, warnings only).

2. `npm run build`
- Result: pass.

3. `npm run env:check -- --release`
- Result: pass.

4. `npm run release:preflight`
- Result: pass.

5. `FIREBASE_PROJECT_ALIAS=production npm run release:preflight`
- Result: pass.

## Critical Defect Closure Verification

1. Previous `DEF-01` (duplicate points issuance): CLOSED
- `apps/web/src/pages/Approvals.jsx` no longer writes `pointsLedger`.
- `functions/index.js` owns issuance with deterministic doc ID `task-approved_{submissionId}` and transaction guard.
- `firestore.rules` denies all client create/update/delete on `pointsLedger`.

2. Previous `DEF-02` (invalid submission transitions exposed): CLOSED
- `apps/web/src/pages/TaskDetail.jsx` computes `canEditSubmission` and enforces read-only for locked statuses.

3. Previous `DEF-03` (release gate non-functional): CLOSED
- ESLint baseline committed; lint command executes and preflight chain passes.

4. Previous `DEF-04` (super admin bootstrap config fragility): PARTIAL / OPERATIONAL
- Contract still requires `settings/security.superAdminEmails`.
- Not failing in this QA rerun command chain, but remains an operational dependency to verify in deployed environment.

## Residual Risk

1. Medium: Browser-path smoke could not be executed from this sandbox because local dev server bind is blocked (`listen EPERM`).
- Mitigation: Project Manager broadcast confirms local runtime boot issue is resolved outside sandbox; keep post-deploy role-route smoke mandatory.

2. Medium: Non-blocking lint warnings remain (hooks deps + unused imports).
- Mitigation: schedule follow-up quality sprint item.

3. Medium: Bundle-size warning remains (>500 kB chunk).
- Mitigation: track code-splitting optimization as post-release improvement.

4. Low: Documentation drift risk (`release-runbook.md` still references temporary Netlify build command text).
- Mitigation: update runbook to match `netlify.toml`.

## Final Recommendation

Release recommendation: **GO**

Rationale:
1. All four QA gates (A-D) pass on current integrated branch.
2. Critical blockers from prior QA audit are closed at code and command-validation level.
3. Remaining items are medium/low operational hardening tasks and do not block patch release promotion.
