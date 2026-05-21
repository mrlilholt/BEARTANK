# Backend Auth + Data Contract Update (2026-03-03)

## Scope
- Firestore authorization hardening for role enforcement, student write boundaries, and immutable audit fields.
- Contract clarification for frontend error handling and QA security coverage.

## Role Enforcement Model

### `users/{userId}`
- `create`:
  - Allowed only for `request.auth.uid == userId`.
  - `email` must equal authenticated email.
  - Allowed role/status pairs:
    - `student` + `active`
    - `teacher` + `pending`
    - `super_admin` + `active` only when email is allowlisted in `settings/security.superAdminEmails`.
- `update`:
  - Self updates:
    - Allowed keys: `profile`, `classCode`, `photoURL`, `email`, `updatedAt`.
    - `role`, `status`, `approvedBy`, `createdAt` are immutable.
  - Self solo-team claim:
    - Allowed once when current `teamId` is null.
    - Team must exist, be created by requester, and have only requester in `memberIds`.
  - Teacher team assignment:
    - Allowed keys: `teamId`, `companyName`, `teamName`, `updatedAt`.
    - Core identity fields remain immutable.
  - Super admin teacher approval:
    - Allowed transition: teacher `pending -> active` with `approvedBy == request.auth.uid`.

### `submissions/{submissionId}`
- Student `create`:
  - Must be owner (`userId == request.auth.uid`) or team member for team submissions.
  - `submittedBy == request.auth.uid`.
  - Allowed status on create: `draft`, `submitted`.
  - Allowed create keys only:
    - `taskId`, `taskTitle`, `taskPoints`, `taskType`, `stageId`, `teamId`, `userId`,
      `submittedBy`, `status`, `content`, `createdAt`, `updatedAt`.
- Student `update` (resubmission):
  - Allowed only when current status is `draft` or `needs_changes`.
  - Mutable keys only: `status`, `content`, `updatedAt`.
  - Immutable fields: task/user/team identity, scoring/review fields, `createdAt`.
  - Allowed statuses on update: `draft`, `submitted`.
- Teacher retains full write authority for review workflows.

### `notifications/{notificationId}`
- Non-teacher user update is now read-only semantics:
  - Allowed mutable keys: `read`, `readAt`.
  - `userId`, `title`, `message`, `type`, `sourceId`, `link`, `createdAt` are immutable.

### `helpTickets/{ticketId}`
- Non-teacher ticket owner update is now reply-only:
  - Allowed mutable keys: `messages`, `updatedAt`.
  - `createdBy`, `stage`, `task`, `status`, `createdAt` are immutable.

### `teamProfiles/{teamId}`
- Student direct writes removed.
- Create/update/delete are teacher-only.

## Frontend Failure Modes (Required Handling)
- Unauthorized writes now return Firestore `permission-denied`.
- Frontend should treat this as expected authorization failure, not generic crash.
- Recommended UX mapping:
  - Role/status mismatch: "Your account does not have permission for this action."
  - Stale submission state (e.g., trying to edit approved item): "This submission can no longer be edited."
  - Team claim mismatch: "Team assignment changed. Refresh and try again."

## QA Security Coverage (Minimum)
- Student cannot set own `role` or `status` via `users/{uid}` update.
- Student cannot create `super_admin` user unless email is allowlisted in `settings/security`.
- Teacher cannot approve teacher accounts unless acting as super admin.
- Student cannot change submission score/review fields during resubmission.
- Student cannot alter notification payload fields other than `read/readAt`.
- Student cannot alter help ticket status/owner metadata.
- Student cannot write `teamProfiles` directly.

## DevOps / Config Notes
- Create and maintain `settings/security` document:
  - `superAdminEmails: string[]`
- Keep this backend allowlist aligned with any onboarding/admin UX configuration.
- `VITE_CLASS_CODE` remains a client-side check and is not a secure authorization control.

## Migration and Compatibility Risks
- Existing clients attempting broad submission updates may receive `permission-denied`.
- Existing super admin onboarding paths require `settings/security.superAdminEmails` to be populated.
- Existing data with non-standard status transitions may block student resubmissions until normalized.
