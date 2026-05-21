# BEARTANK - The App

Student-facing workflow and teacher admin system for the BEARTANK Shark Tank parody project.

## Repo layout
- `apps/web` - Single React app (student/teacher/admin) with role-based routing
- `packages/shared` - Shared utilities (placeholder)
- `functions` - Firebase Functions triggers
- `docs/release-runbook.md` - Release preflight, deployment, and rollback checklist
- `netlify.toml` - Netlify build/publish/redirect contract

## Getting started
1. `npm install`
2. Copy `/Users/alilholt/BEARTANK/apps/web/.env.example` to `/Users/alilholt/BEARTANK/apps/web/.env` and fill in Firebase values
3. Set `VITE_SUPER_ADMIN_EMAILS` with a comma-separated list (your email must be included)
4. Set `VITE_CLASS_CODE` (example: `BEAR-2026`)
5. Validate configuration: `npm run env:check`
6. `npm run dev`

## Build
- `npm run build`
- `npm run preview`

## Release Commands
- `npm run release:preflight` - Env validation + lint + build
- `npm run deploy:backend` - Deploy Firestore indexes, Firestore rules, and Functions in sequence

Set `FIREBASE_PROJECT_ALIAS` before backend deploy if you do not want the default alias (`staging`).
Use `FIREBASE_PROJECT_ALIAS=production` for production release windows.
See `/Users/alilholt/BEARTANK/docs/release-runbook.md` for full release and rollback steps.

## Notes
- No files are uploaded to BEARTANK; submissions are text and external links
- Points currency is Bear Bucks
