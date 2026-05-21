# UI/UX Role Flow Audit - 2026-03-03

## Scope
- Product area reviewed: role-based student, teacher, and super admin experiences in `apps/web`.
- Supporting contract review: `firestore.rules`, `functions/index.js`, and current project quality/release scaffolding.
- Goal: identify trust-critical UX risks, define wireframe priorities, and provide implementation-ready UI guidance.

## Current Flow Maps

### Student flow
1. `Landing` -> `Login` -> `Onboarding`.
2. Onboarding (student + class code) -> auto-routed to `/student`.
3. Main loop:
- `/student` (Company HQ dashboard with phase selector, missions, team request card).
- `/student/task/:taskId` for submission.
- `/student/company` for brand kit, timeline, and phase checklist.
- `/student/pitch-deck`, `/student/notifications`, `/student/announcements`, `/student/resources`, `/student/help`.
4. Key branch:
- If student has no approved team, task access remains visible but team-dependent actions can fail late (after form input) in `TaskDetail`.

### Teacher flow
1. `Landing` -> `Login` -> `Onboarding` (role `teacher`).
2. Teacher account status set to `pending` -> `/pending`.
3. After approval -> `/teacher`.
4. Main loop:
- `/teacher` dashboard.
- `/teacher/approvals` queue and review actions.
- `/teacher/teams`, `/teacher/stages`, `/teacher/analytics`, `/teacher/announcements`, `/teacher/resources`, `/teacher/side-hustles`, `/teacher/helpdesk`.

### Super admin flow
1. Super admin email auto-resolves role.
2. Entry route currently lands on teacher dashboard (`DASHBOARD_BY_ROLE.super_admin = '/teacher'`).
3. Admin-specific work is in `/admin` and only accessible via bottom nav item.
4. Result: critical access-approval workflow is not the first focus after sign-in.

## Screen And Wireframe Priorities

### P0 wireframes
1. `Student Work Queue` (replace faux schedule with real due/status queue).
2. `Teacher Approvals Inbox` (single decision card with explicit state machine, confidence cues, and post-action confirmation).
3. `Super Admin Access Console` (default landing for pending-teacher approvals and cohort governance).

### P1 wireframes
1. `Student Phase Navigator` (all stages discoverable, not only first four).
2. `Submission Detail` state panels (`draft`, `submitted`, `needs_changes`, `approved`) with capability-aware actions.
3. `Pending Access` role-specific variants (teacher pending vs student/account messaging).
4. `Touch-first Teacher Dashboard` (remove hover-only labels, always-visible context).

### P2 wireframes
1. `Notifications` action model (internal route actions use in-app navigation, not full-page href transitions).
2. `System Empty States` set (stage/task/profile/help/announcements/resources standardized voice and CTA pattern).

## UX Risks And Impact

### P0
1. Submission resubmission trap.
- Evidence: `TaskDetail` always shows "Submit for approval" while update permissions only allow edits from `draft` or `needs_changes`.
- References: `apps/web/src/pages/TaskDetail.jsx:109`, `apps/web/src/pages/TaskDetail.jsx:173`, `firestore.rules:107`.
- User impact: student can spend time editing and still hit failure messaging that feels random.
- Handoff: Frontend + Backend align state model and disable/replace invalid actions.

2. Brand governance bypass possibility.
- Evidence: team members can directly `create/update` `teamProfiles`.
- References: `firestore.rules:62`, `firestore.rules:64`.
- User impact: approval trust is undermined if published identity can bypass teacher review narrative.
- Handoff: Backend tighten authorization contract; Frontend messaging should match enforced policy.

### P1
1. Super admin entrypoint mismatch.
- Evidence: super admins default to teacher dashboard while admin approvals are separate.
- References: `apps/web/src/lib/auth-context.jsx:39`, `apps/web/src/components/AppShell.jsx:62`.
- Impact: delayed handling of access requests and unclear role priority.

2. Student dashboard hides stages and shows synthetic schedule values.
- Evidence: phase tiles are limited to 4; schedule uses `day: index + 1` and hardcoded `9:00 AM`.
- References: `apps/web/src/pages/StudentDashboard.jsx:326`, `apps/web/src/pages/StudentDashboard.jsx:337`, `apps/web/src/pages/StudentDashboard.jsx:338`.
- Impact: weak planning confidence and reduced transparency.

3. Hover-only labeling on teacher dashboard quick actions.
- Evidence: panel labels are hidden by default and revealed only on hover.
- References: `apps/web/src/pages/TeacherDashboard.jsx:262`, `apps/web/src/pages/TeacherDashboard.jsx:291`.
- Impact: poor comprehension on touch devices and keyboard-only navigation.

4. Pending access copy is role-ambiguous.
- Evidence: title says "Waiting on teacher approval" while body clarifies teacher needs super admin approval.
- References: `apps/web/src/pages/PendingAccess.jsx:11`, `apps/web/src/pages/PendingAccess.jsx:18`.
- Impact: trust and orientation drop during the first blocked moment.

### P2
1. Information architecture source drift.
- Evidence: `routes.jsx` is incomplete vs active router in `App.jsx` (missing newer pages like resources and pending route handling context).
- References: `apps/web/src/routes.jsx:21`, `apps/web/src/App.jsx:100`, `apps/web/src/App.jsx:165`.
- Impact: design/QA documentation drift and handoff confusion.

2. Points issuance ownership overlap risk.
- Evidence: points can be written from both approval UI and Cloud Function stub.
- References: `apps/web/src/pages/Approvals.jsx:332`, `functions/index.js:9`, `functions/index.js:20`.
- Impact: duplicated rewards if both paths are active; student trust risk.

3. Quality gate gap.
- Evidence: lint script exists, but no ESLint config baseline currently committed.
- References: `apps/web/package.json:10`.
- Impact: UI regressions and accessibility regressions become harder to catch early.

## Actionable UI Guidance For Frontend Lead

1. Implement explicit submission capability states in `TaskDetail`.
- Add status banner + action lock rules:
- `submitted`: read-only with "Waiting for teacher review".
- `needs_changes`: editable with "Resubmit".
- `approved`: read-only with "Approved".
- Only show actionable primary button when the next transition is valid.

2. Redesign student dashboard "Today’s runway" into data-backed queue.
- Replace hardcoded day/time with task metadata or relative ordering labels (`Next`, `Later`, `Done`).
- Preserve one-click path to task detail.
- Show queue-level empty state with CTA (`Go to Mission control`).

3. Make super admin landing role-first.
- Route `super_admin` default to `/admin`.
- Keep teacher tools discoverable as secondary nav group.

4. Remove hover-only context for high-frequency controls.
- Teacher quick panels should show persistent labels/helper text in default state.
- Keep hover as enhancement, not required discovery mechanism.

5. Standardize pending and blocked-state copy.
- Introduce role-aware templates:
- `Teacher pending`: awaiting super admin approval.
- `Student blocked`: class/team/code issue with next action and owner.

6. Add a page-state pattern library (loading/empty/error/unauthorized).
- Apply consistently to student, teacher, and admin pages.
- Include consistent CTA style: primary next action + secondary retry/help action.

## Cross-Functional Handoff Notes

1. Backend Lead
- Align and document canonical submission state machine and write permissions.
- Lock `teamProfiles` writes to approved workflow owner(s) only.
- Decide single authority for points issuance (`frontend` or `function`) to prevent duplicates.

2. QA Lead
- Add role-based regression scenarios for:
- submission editability per status,
- pending access copy and routing by role,
- super admin default landing and approval completion loop,
- stage discovery when stage count > 4.

3. DevOps/Release Lead
- Add enforceable frontend quality gate (lint config + CI check).
- Add pre-release smoke run for role routes and protected-page transitions.

## Acceptance Criteria (Plain Language)

1. A student can always tell what they can do next on a task page without trial-and-error.
2. A student cannot see a submission action button that will fail because of status rules.
3. A super admin lands directly on the access-approval workspace after sign-in.
4. Teacher quick actions are readable without hover and on touch devices.
5. Student phase navigation exposes all available stages.
6. Pending-access messaging matches the actual approving role.
7. Approval and points behavior is deterministic and not duplicated.
8. Empty, loading, and error states use consistent language and clear next actions.

## Dependencies

1. Backend confirmation of final submission state model and authorization boundaries.
2. Frontend alignment on whether role-based landing can change this sprint.
3. QA bandwidth to add role-state regression checks in the same release window.

## Open Questions

1. Should super admins always have teacher operational views, or should admin functions be isolated first?
2. Is the intended policy that students can draft after first submit, or only after `needs_changes`?
3. Should team profile edits ever be student-direct, or exclusively mediated through reviewed submissions?
4. What is the source of truth for task scheduling metadata shown on student dashboard queue?
