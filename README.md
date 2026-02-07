# BEARTANK - The App

Student-facing workflow and teacher admin system for the BEARTANK Shark Tank parody project.

## Repo layout
- `apps/web` - Single React app (student/teacher/admin) with role-based routing
- `packages/shared` - Shared utilities (placeholder)

## Getting started
1. `npm install`
2. Copy `/Users/alilholt/BEARTANK/apps/web/.env.example` to `/Users/alilholt/BEARTANK/apps/web/.env` and fill in Firebase values
3. Set `VITE_SUPER_ADMIN_EMAILS` with a comma-separated list (your email must be included)
4. Set `VITE_CLASS_CODE` (example: `BEAR-2026`)
5. `npm run dev`

## Build
- `npm run build`
- `npm run preview`

## Notes
- No files are uploaded to BEARTANK; submissions are text and external links
- Points currency is Bear Bucks
