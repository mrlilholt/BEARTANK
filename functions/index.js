const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

// TODO: On submission approved, issue points + notifications + audit logs.
exports.onSubmissionStatusChange = onDocumentUpdated('submissions/{submissionId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (!before || !after) return;
  if (before.status === after.status) return;

  if (after.status === 'approved') {
    // Example stub: write a points ledger entry.
    const amount = after.pointsAwarded || after.taskPoints || 0;
    if (amount > 0) {
      await db.collection('pointsLedger').add({
        entityType: after.teamId ? 'team' : 'user',
        entityId: after.teamId || after.userId,
        amount,
        reason: 'task-approved',
        sourceId: event.params.submissionId,
        createdAt: FieldValue.serverTimestamp()
      });
    }
  }
});

// TODO: When a teacher account is approved, set custom claims.
exports.onUserRoleUpdate = onDocumentUpdated('users/{userId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before || !after) return;

  if (before.role === after.role && before.status === after.status) return;
  // Placeholder for custom claims updates (requires auth admin SDK).
});

// TODO: Fan-out announcements into notifications.
exports.onAnnouncementCreated = onDocumentCreated('announcements/{announcementId}', async () => {
  // Placeholder stub.
});
