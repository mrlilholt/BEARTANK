# Backend Contract Update - Execution Sprint (2026-03-03)

## What Changed

### 1) Points Issuance Authority
- **Single source of truth is now server-only**.
- Client-side points ledger writes were removed from teacher approvals flow.
- Cloud Function `onSubmissionStatusChange` now owns issuance and marks submissions as `pointsIssued`.

### 2) Points Issuance Idempotency
- Ledger entry id is deterministic per submission: `pointsLedger/task-approved_{submissionId}`.
- Reprocessing the same approved submission no longer creates duplicate ledger rows.

### 3) Claims Sync for Role Consistency
- Claims sync now runs on both user create and role/status updates:
  - `onUserCreatedSyncClaims`
  - `onUserRoleUpdate`
- Both triggers sync Firebase custom claims (`role`, `status`) from `users/{uid}`.
- Supported roles: `student`, `teacher`, `super_admin`.
- Supported statuses: `pending`, `active`, `suspended`, `disabled`.

### 4) Rules Contract Update
- `pointsLedger` is now **read-only for clients**.
- Firestore rules deny all client create/update/delete on `pointsLedger`.

## Frontend Impact
- Approval UI must not attempt `pointsLedger` writes.
- Points should be displayed from:
  - submission fields (`pointsAwarded`, `pointsIssued`) and/or
  - ledger reads only.
- If approval succeeds, points may appear after function processing latency.

## QA Impact
- Validate no duplicate points entries for repeated approval updates on same submission.
- Validate teacher client cannot write to `pointsLedger` directly (`permission-denied`).
- Validate role/status claim alignment after user role/status updates (token refresh path).

## Migration/Compatibility Notes
- Existing historical duplicate ledger entries are not auto-deduplicated by this change.
- If older clients still try direct ledger writes, they will now fail by rules design.
