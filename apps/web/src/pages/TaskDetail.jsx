import {
  Alert,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  where,
  query
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { useAuth } from '../lib/auth-context.jsx';
import { useCollection, useDocument } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';

export default function TaskDetail() {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const { user, profile } = useAuth();
  const taskRef = useMemo(() => (taskId ? doc(db, 'tasks', taskId) : null), [taskId]);
  const { data: task } = useDocument(taskRef);

  const submissionQuery = useMemo(() => {
    if (!taskId || !user) return null;
    if (task?.type === 'team') {
      if (!profile?.teamId) return null;
      return query(
        collection(db, 'submissions'),
        where('taskId', '==', taskId),
        where('teamId', '==', profile.teamId)
      );
    }
    return query(
      collection(db, 'submissions'),
      where('taskId', '==', taskId),
      where('userId', '==', user.uid),
      where('teamId', '==', profile?.teamId || null)
    );
  }, [taskId, task?.type, user?.uid, profile?.teamId]);

  const { data: submissions } = useCollection(submissionQuery);
  const submission = submissions[0];
  const submissionStatus = submission?.status || null;

  const [link, setLink] = useState('');
  const [reflection, setReflection] = useState('');
  const [timelineNote, setTimelineNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!submission) return;
    setLink(submission.content?.link || '');
    setReflection(submission.content?.reflection || '');
    setTimelineNote(submission.content?.timelineNote || '');
  }, [submission]);

  const isTeamTask = task?.type === 'team';
  const isSideHustle = task?.category === 'side_hustle';
  const missingTeam = isTeamTask && !profile?.teamId;
  const canEditSubmission =
    !submission || submissionStatus === 'draft' || submissionStatus === 'needs_changes';
  const submitLabel = submissionStatus === 'needs_changes' ? 'Resubmit for approval' : 'Submit for approval';

  const handleSubmit = async () => {
    setError('');
    if (!task) {
      setError('Task not found.');
      return;
    }
    if (!user) {
      setError('You must be signed in.');
      return;
    }
    if (missingTeam) {
      setError('Your team must be approved before submitting this task.');
      return;
    }
    if (!timelineNote.trim()) {
      setError('Add a timeline update to submit.');
      return;
    }

    const contentPayload = {
      link: link.trim(),
      reflection: reflection.trim(),
      timelineNote: timelineNote.trim()
    };

    setSaving(true);
    try {
      if (submission?.id) {
        await updateDoc(doc(db, 'submissions', submission.id), {
          status: 'submitted',
          content: contentPayload,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'submissions'), {
          taskId,
          taskTitle: task.title || '',
          taskPoints: task.points || 0,
          taskType: task.type || 'individual',
          stageId: task.stageId || null,
          teamId: profile?.teamId || null,
          userId: isTeamTask ? null : user.uid,
          submittedBy: user.uid,
          status: 'submitted',
          content: contentPayload,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      }
      navigate('/student', {
        replace: true,
        state: isSideHustle
          ? {
              sideHustleCelebration: true,
              sideHustleTaskTitle: task.title || ''
            }
          : null
      });
    } catch (err) {
      if (err?.code === 'permission-denied') {
        setError('This submission can no longer be edited. Refresh to view the latest status.');
      } else {
        setError(err.message || 'Could not submit.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      kicker="TASK"
      title={task?.title || 'Task detail'}
      subtitle={task?.description || 'Submit the link to your Google Doc and any supporting notes.'}
    >
      <Paper sx={{ p: 3, maxWidth: 720 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1}>
            {task?.type ? <Chip label={task.type} size="small" color="secondary" /> : null}
            {task?.isBonus ? <Chip label="Bonus" size="small" variant="outlined" /> : null}
            {task?.points ? <Chip label={`${task.points} BB`} size="small" variant="outlined" /> : null}
          </Stack>
          {submission ? (
            <Alert severity={submission.status === 'approved' ? 'success' : 'info'}>
              Current status: {submission.status}
              {submission.feedback?.note ? ` — ${submission.feedback.note}` : ''}
            </Alert>
          ) : null}
          {submission && !canEditSubmission ? (
            <Alert severity="info">
              This submission is locked while it is {submissionStatus}. You can edit again only when it
              returns to needs changes.
            </Alert>
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {missingTeam ? (
            <Alert severity="warning">
              Your team has not been approved yet. Once approved, you can submit team tasks.
            </Alert>
          ) : null}
          <TextField
            label="Google Doc link"
            placeholder="https://docs.google.com/..."
            value={link}
            onChange={(event) => setLink(event.target.value)}
            disabled={!canEditSubmission || saving}
          />
          <TextField
            label="Reflection"
            multiline
            minRows={4}
            placeholder="What did your team decide?"
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
            disabled={!canEditSubmission || saving}
          />
          <TextField
            label="Timeline update (required)"
            multiline
            minRows={3}
            placeholder="Summarize the work you completed so it appears on your company timeline."
            value={timelineNote}
            onChange={(event) => setTimelineNote(event.target.value)}
            disabled={!canEditSubmission || saving}
          />
          <Divider />
          {canEditSubmission ? (
            <Button variant="contained" color="secondary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Submitting...' : submitLabel}
            </Button>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No action needed right now. Your submission is currently read-only.
            </Typography>
          )}
        </Stack>
      </Paper>
    </AppShell>
  );
}
