# Frontend Execution Checklist - Critical Fixes (2026-03-03)

Owner: Frontend Lead  
Sprint: `Execution Sprint - Critical Fixes`

## Behavior-to-QA Mapping

| FE Change ID | Changed Behavior | Files | QA Case IDs | QA Defect IDs |
| --- | --- | --- | --- | --- |
| FE-EXEC-01 | ESLint baseline is now present; `npm --workspace apps/web run lint` executes and returns success (warnings only). | `apps/web/.eslintrc.cjs` | `REL-02` | `DEF-03` |
| FE-EXEC-02 | Submission form is read-only for non-editable statuses (`submitted`, `approved`), and action button is hidden when transitions are invalid. | `apps/web/src/pages/TaskDetail.jsx` | `SUB-03` | `DEF-02` |
| FE-EXEC-03 | Permission failures in task submit flow map to deterministic user-safe message for stale/locked submission state. | `apps/web/src/pages/TaskDetail.jsx` | `SUB-03` | `DEF-02` |
| FE-EXEC-04 | Firestore hooks clear stale errors when query/doc refs change and on successful snapshots. | `apps/web/src/lib/firestore-hooks.js` | `AUTH-01`, `AUTH-02`, `SUB-03` | `DEF-02` |
| FE-EXEC-05 | Route source is consolidated in `App.jsx`; stale duplicate route source removed to eliminate drift risk. | `apps/web/src/App.jsx`, `apps/web/src/routes.jsx` (removed), `apps/web/src/lib/paths.js` | `AUTH-01`, `AUTH-02`, `AUTH-03` | N/A |
| FE-EXEC-06 | Unauthorized role access now routes to a role-aware unauthorized page instead of silent fallback redirect. | `apps/web/src/components/RequireRole.jsx`, `apps/web/src/pages/Unauthorized.jsx`, `apps/web/src/App.jsx` | `AUTH-02` | N/A |
| FE-EXEC-07 | Pending page copy is role-aware (teacher pending vs generic pending) for clearer approval-state messaging. | `apps/web/src/pages/PendingAccess.jsx` | `AUTH-03` | N/A |
| FE-EXEC-08 | Shared path constants now drive route and nav usage to reduce string drift across auth guards/navigation/pages. | `apps/web/src/lib/paths.js`, `apps/web/src/components/AppShell.jsx`, `apps/web/src/components/RequireAuth.jsx`, `apps/web/src/pages/Landing.jsx`, `apps/web/src/pages/Login.jsx`, `apps/web/src/pages/Onboarding.jsx`, `apps/web/src/lib/auth-context.jsx` | `AUTH-01`, `AUTH-02`, `AUTH-03` | N/A |
| FE-EXEC-09 | Super admin default landing now routes to admin workspace (`/admin`) rather than teacher dashboard. | `apps/web/src/lib/auth-context.jsx` | `AUTH-04` | N/A |

## Validation Commands

1. `npm --workspace apps/web run lint` -> pass (warnings only).
2. `npm --workspace apps/web run build` -> pass.
3. `npm run release:preflight` -> pass (warnings only).
