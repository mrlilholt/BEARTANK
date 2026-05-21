# BEARTANK Release Runbook

This runbook defines deterministic release steps for the React/Vite frontend and Firebase backend.

Netlify build behavior is codified in `/Users/alilholt/BEARTANK/netlify.toml`.

## 1. Environment Contract

Use `apps/web/.env` for local/release builds. Validate with:

```bash
npm run env:check
```

For hosted CI (Netlify), `env:check` supports process-environment validation when `.env` is absent.

Required keys:

| Variable | Required | Used by | Notes |
| --- | --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Yes | Firebase init | Web client config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth | Must match target project |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firestore/Auth | Must match deploy target |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase init | Keep aligned to project |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase init | Web app sender id |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase init | Web app id |
| `VITE_FIREBASE_MEASUREMENT_ID` | No | Analytics wiring | Optional until analytics is enabled |
| `VITE_SUPER_ADMIN_EMAILS` | Yes | Role bootstrap | Comma-separated allowlist |
| `VITE_CLASS_CODE` | Yes | Student onboarding gate | Must be non-empty for predictable onboarding |

Release-mode validation also checks `FIREBASE_PROJECT_ALIAS` exists in `.firebaserc`.

## 2. Deterministic Pre-Release Steps

Run from repo root:

```bash
npm run release:preflight
```

This enforces:
1. Environment validation (`npm run env:check -- --release`)
2. Lint (`npm run lint`)
3. Web build (`npm run build`)

If any step fails, do not deploy.

## 3. Backend Deployment Sequence

Default alias is `staging`. For production release windows, set `FIREBASE_PROJECT_ALIAS=production`.

```bash
npm run deploy:backend
```

Sequence is fixed:
1. Firestore indexes
2. Firestore rules
3. Functions

Rationale:
1. Indexes can take time to build; start early.
2. Rules are production-critical authorization controls.
3. Functions deploy last to avoid trigger code mismatch while rules are still old.

## 4. Frontend Deployment Notes

`firebase.json` currently contains Firestore + Functions only; no Firebase Hosting target is configured.

Release requirement:
1. Build with validated env (`npm run build`).
2. Deploy `apps/web/dist` via your web hosting platform.
3. Ensure host uses the same Firebase project values as backend release target.
4. For Netlify, keep repository settings aligned with `netlify.toml`:
   - Build command: `npm run release:preflight`
   - Publish directory: `apps/web/dist`
   - SPA fallback enabled via `_redirects` and `[[redirects]]`.

## 5. QA Release Gates (Must Pass)

Before release sign-off:
1. Student flow: sign in, complete onboarding with valid class code, submit task, view submission status.
2. Teacher flow: review submission, approve/needs changes, verify stage progression updates.
3. Super admin flow: approve pending teacher, verify teacher dashboard access.
4. Permission boundaries: student cannot access teacher/admin pages; pending teacher is redirected to `/pending`.
5. Smoke data checks: notifications list loads, announcements load, team/stage queries return without permission errors.

## 6. Post-Release Verification

Immediately after deploy:
1. Open app as student, teacher, and super admin accounts and verify route-level access.
2. Verify Firestore reads/writes for onboarding, submissions, approvals, and notifications.
3. Confirm `onSubmissionStatusChange` function executes for approved submissions (Cloud Logging).
4. Confirm no surge in frontend `permission-denied` or failed query errors in browser console.

## 7. Rollback Readiness

Rollback strategy is commit-based:
1. Identify last known good commit SHA.
2. Re-run backend deploy commands from that commit.
3. Re-deploy previous frontend artifact from that commit.
4. Re-run post-release verification checks.

## 8. Operational Risks and Mitigations

1. **Project alias drift risk**: `.firebaserc` currently does not define a dedicated `production` alias.
   - Mitigation: add a production alias before first production release; never deploy by raw project id ad hoc.
2. **Frontend config fragility risk**: missing `VITE_*` values previously fell back to empty strings.
   - Mitigation: centralized runtime/env validation now fails fast.
3. **Rules deploy blast radius**: restrictive rules can block all app reads/writes immediately.
   - Mitigation: always run preflight + role-based smoke checks before/after rules deploy.
4. **Observability gap on UX-critical flows**: no centralized frontend error telemetry is configured yet.
   - Mitigation: short-term monitor browser console + Cloud Logging during release window; add error monitoring integration in a follow-up.
