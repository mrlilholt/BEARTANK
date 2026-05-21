const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();
const auth = getAuth();

const ALLOWED_ROLES = new Set(['student', 'teacher', 'super_admin']);
const ALLOWED_STATUSES = new Set(['pending', 'active', 'suspended', 'disabled']);

function normalizeClaim(value, allowlist) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return allowlist.has(normalized) ? normalized : null;
}

async function syncRoleStatusClaims(userId, profile) {
  const userRecord = await auth.getUser(userId);
  const existingClaims = userRecord.customClaims || {};
  const nextClaims = { ...existingClaims };

  const nextRole = normalizeClaim(profile?.role, ALLOWED_ROLES);
  const nextStatus = normalizeClaim(profile?.status, ALLOWED_STATUSES);

  if (nextRole) nextClaims.role = nextRole;
  else delete nextClaims.role;

  if (nextStatus) nextClaims.status = nextStatus;
  else delete nextClaims.status;

  const existingRole = typeof existingClaims.role === 'string' ? existingClaims.role : null;
  const existingStatus = typeof existingClaims.status === 'string' ? existingClaims.status : null;
  if (existingRole === nextRole && existingStatus === nextStatus) return;

  await auth.setCustomUserClaims(userId, nextClaims);
}

exports.onSubmissionStatusChange = onDocumentUpdated('submissions/{submissionId}', async (event) => {
  const after = event.data.after.data();
  if (!after) return;
  if (after.status !== 'approved') return;

  const submissionId = event.params.submissionId;
  const submissionRef = db.collection('submissions').doc(submissionId);
  const ledgerRef = db.collection('pointsLedger').doc(`task-approved_${submissionId}`);

  await db.runTransaction(async (transaction) => {
    const [submissionSnap, ledgerSnap] = await Promise.all([
      transaction.get(submissionRef),
      transaction.get(ledgerRef)
    ]);
    if (!submissionSnap.exists) return;

    const submission = submissionSnap.data();
    if (!submission || submission.status !== 'approved') return;

    const entityId = submission.teamId || submission.userId || null;
    const entityType = submission.teamId ? 'team' : 'user';
    const amount = Number(submission.pointsAwarded ?? submission.taskPoints ?? 0);

    if (!ledgerSnap.exists && amount > 0 && entityId) {
      transaction.create(ledgerRef, {
        entityType,
        entityId,
        amount,
        reason: 'task-approved',
        sourceId: submissionId,
        createdAt: FieldValue.serverTimestamp()
      });
    }

    if (submission.pointsIssued !== true) {
      transaction.update(submissionRef, {
        pointsIssued: true,
        pointsIssuedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  });
});

exports.onUserCreatedSyncClaims = onDocumentCreated('users/{userId}', async (event) => {
  const after = event.data.data();
  if (!after) return;
  await syncRoleStatusClaims(event.params.userId, after);
});

exports.onUserRoleUpdate = onDocumentUpdated('users/{userId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before || !after) return;

  if (before.role === after.role && before.status === after.status) return;
  await syncRoleStatusClaims(event.params.userId, after);
});

// TODO: Fan-out announcements into notifications.
exports.onAnnouncementCreated = onDocumentCreated('announcements/{announcementId}', async () => {
  // Placeholder stub.
});
