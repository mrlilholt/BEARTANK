import {
  Alert,
  Box,
  Button,
  Link,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useAuth } from '../lib/auth-context.jsx';
import { useCollection } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';

export default function Approvals() {
  const { user } = useAuth();
  const submissionsQuery = useMemo(() => {
    return query(
      collection(db, 'submissions'),
      where('status', '==', 'submitted')
    );
  }, []);
  const { data: submissions, loading, error } = useCollection(submissionsQuery);
  const stagesQuery = useMemo(
    () => query(collection(db, 'stages'), orderBy('order', 'asc')),
    []
  );
  const { data: stages } = useCollection(stagesQuery);
  const tasksQuery = useMemo(() => query(collection(db, 'tasks')), []);
  const { data: tasks } = useCollection(tasksQuery);
  const teamsQuery = useMemo(() => query(collection(db, 'teams')), []);
  const { data: teams } = useCollection(teamsQuery);
  const usersQuery = useMemo(() => query(collection(db, 'users')), []);
  const { data: users } = useCollection(usersQuery);
  const [feedbackById, setFeedbackById] = useState({});
  const [bonusById, setBonusById] = useState({});
  const [actionError, setActionError] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [filterTeam, setFilterTeam] = useState('all');
  const [search, setSearch] = useState('');

  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const teamMap = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const userMap = useMemo(() => new Map(users.map((item) => [item.id, item])), [users]);
  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.updatedAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || b.updatedAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }, [submissions]);
  const filteredSubmissions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortedSubmissions.filter((submission) => {
      if (filterStage !== 'all' && submission.stageId !== filterStage) return false;
      if (filterTeam !== 'all' && submission.teamId !== filterTeam) return false;
      if (!term) return true;
      const taskTitle =
        submission.taskTitle || taskMap.get(submission.taskId)?.title || '';
      const teamName = submission.teamId
        ? teamMap.get(submission.teamId)?.companyName || ''
        : '';
      const submitterId = submission.userId || submission.submittedBy;
      const submitter = submitterId ? userMap.get(submitterId) : null;
      const submitterName =
        submitter?.preferredName || submitter?.fullName || submitter?.email || '';
      const haystack = `${taskTitle} ${teamName} ${submitterName}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [sortedSubmissions, filterStage, filterTeam, search, taskMap, teamMap, userMap]);

  const sendNotifications = async ({ userIds, title, message, link, type, sourceId }) => {
    if (!userIds || userIds.length === 0) return;
    await Promise.all(
      userIds.map((userId) =>
        addDoc(collection(db, 'notifications'), {
          userId,
          title,
          message,
          link: link || null,
          type,
          sourceId: sourceId || null,
          read: false,
          createdAt: serverTimestamp()
        })
      )
    );
  };

  const updateTeamStageProgress = async (submission) => {
    if (stages.length === 0) return;
    const stageId = submission.stageId;
    if (!stageId) return;

    let teamId = submission.teamId;
    if (!teamId && submission.userId) {
      const userSnap = await getDoc(doc(db, 'users', submission.userId));
      teamId = userSnap.exists() ? userSnap.data().teamId : null;
    }
    if (!teamId) return;

    const teamSnap = await getDoc(doc(db, 'teams', teamId));
    if (!teamSnap.exists()) return;
    const memberIds = teamSnap.data().memberIds || [];

    const tasksSnapshot = await getDocs(
      query(collection(db, 'tasks'), where('stageId', '==', stageId))
    );
    const tasks = tasksSnapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((task) => !task.isBonus);

    if (tasks.length === 0) return;

    let completed = 0;
    for (const task of tasks) {
      if (task.type === 'team') {
        const teamSubSnapshot = await getDocs(
          query(
            collection(db, 'submissions'),
            where('taskId', '==', task.id),
            where('teamId', '==', teamId),
            where('status', '==', 'approved')
          )
        );
        if (!teamSubSnapshot.empty) completed += 1;
      } else {
        if (memberIds.length === 0) continue;
        const individualSnapshot = await getDocs(
          query(
            collection(db, 'submissions'),
            where('taskId', '==', task.id),
            where('status', '==', 'approved'),
            where('userId', 'in', memberIds)
          )
        );
        const approvedIds = new Set(individualSnapshot.docs.map((docSnap) => docSnap.data().userId));
        if (memberIds.every((id) => approvedIds.has(id))) completed += 1;
      }
    }

    const progress = Math.round((completed / tasks.length) * 100);
    const teamStageId = `${teamId}_${stageId}`;
    const teamStageRef = doc(db, 'teamStages', teamStageId);
    const teamStageSnap = await getDoc(teamStageRef);
    const currentStatus = teamStageSnap.exists()
      ? teamStageSnap.data().status
      : 'locked';
    const nextStatus = completed >= tasks.length ? 'complete' : currentStatus === 'locked' ? 'locked' : 'active';

    await setDoc(
      teamStageRef,
      {
        teamId,
        stageId,
        order: stages.find((stage) => stage.id === stageId)?.order || 0,
        status: nextStatus,
        progress,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      },
      { merge: true }
    );

    if (completed >= tasks.length) {
      const currentStage = stages.find((stage) => stage.id === stageId);
      const unlockIds = currentStage?.unlockStageIds || [];
      let unlockTargets = [];

      if (unlockIds.length) {
        unlockTargets = stages.filter((stage) => unlockIds.includes(stage.id));
      } else if (currentStage?.title?.toLowerCase?.().includes('prototyp')) {
        unlockTargets = stages.filter((stage) =>
          ['marketing', 'fabrication'].some((keyword) =>
            stage.title?.toLowerCase?.().includes(keyword)
          )
        );
      }

      if (unlockTargets.length === 0) {
        const nextStage = stages
          .filter((stage) => Number(stage.order) > Number(currentStage?.order || 0))
          .sort((a, b) => Number(a.order) - Number(b.order))[0];
        if (nextStage) unlockTargets = [nextStage];
      }

      await Promise.all(
        unlockTargets.map(async (targetStage) => {
          const nextStageRef = doc(db, 'teamStages', `${teamId}_${targetStage.id}`);
          const nextStageSnap = await getDoc(nextStageRef);
          if (!nextStageSnap.exists() || nextStageSnap.data().status === 'locked') {
            await setDoc(
              nextStageRef,
              {
                teamId,
                stageId: targetStage.id,
                order: targetStage.order || 0,
                status: 'active',
                progress: nextStageSnap.exists() ? nextStageSnap.data().progress || 0 : 0,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp()
              },
              { merge: true }
            );
          }
        })
      );
    }
  };

  const handleUpdate = async (submission, nextStatus) => {
    setActionError('');
    if (!user) return;
    const feedbackNote = feedbackById[submission.id] || '';
    const bonus = Number(bonusById[submission.id] || 0);
    const pointsAwarded =
      nextStatus === 'approved' ? (submission.taskPoints || 0) + bonus : 0;

    try {
      let resolvedTeamId = submission.teamId || null;

      if (
        nextStatus === 'approved' &&
        submission.taskType === 'brand_kit' &&
        !submission.teamId &&
        submission.userId
      ) {
        const userSnap = await getDoc(doc(db, 'users', submission.userId));
        const userData = userSnap.exists() ? userSnap.data() : {};
        const companyName =
          submission.content?.companyName ||
          userData.companyName ||
          userData.profile?.preferredName ||
          'Solo Team';
        const teamRef = await addDoc(collection(db, 'teams'), {
          companyName,
          teamName: companyName,
          memberIds: [submission.userId],
          memberEmails: userData.email ? [userData.email] : [],
          status: 'active',
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        resolvedTeamId = teamRef.id;

        await Promise.all(
          stages.map(async (stage, index) => {
            const docId = `${teamRef.id}_${stage.id}`;
            const stageRef = doc(db, 'teamStages', docId);
            const existing = await getDoc(stageRef);
            if (existing.exists()) return;
            await setDoc(stageRef, {
              teamId: teamRef.id,
              stageId: stage.id,
              order: Number(stage.order || index + 1),
              status: index === 0 ? 'active' : 'locked',
              progress: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          })
        );

        await updateDoc(doc(db, 'users', submission.userId), {
          teamId: teamRef.id,
          companyName,
          teamName: companyName,
          updatedAt: serverTimestamp()
        });
      }

      const updatePayload = {
        status: nextStatus,
        feedback: {
          note: feedbackNote,
          type: nextStatus,
          by: user.uid,
          createdAt: serverTimestamp()
        },
        bonusPoints: bonus,
        pointsAwarded,
        pointsIssued: nextStatus === 'approved' ? true : submission.pointsIssued || false,
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (resolvedTeamId && resolvedTeamId !== submission.teamId) {
        updatePayload.teamId = resolvedTeamId;
      }

      await updateDoc(doc(db, 'submissions', submission.id), updatePayload);

      if (
        nextStatus === 'approved' &&
        submission.taskType === 'brand_kit' &&
        (resolvedTeamId || submission.teamId)
      ) {
        await setDoc(
          doc(db, 'teamProfiles', resolvedTeamId || submission.teamId),
          {
            teamId: resolvedTeamId || submission.teamId,
            companyName: submission.content?.companyName || '',
            logoUrl: submission.content?.logoUrl || '',
            logoDataUrl: submission.content?.logoDataUrl || '',
            mission: submission.content?.mission || '',
            approvedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      }

      if (nextStatus === 'approved' && !submission.pointsIssued && pointsAwarded > 0) {
        await addDoc(collection(db, 'pointsLedger'), {
          entityType: submission.teamId ? 'team' : 'user',
          entityId: submission.teamId || submission.userId,
          amount: pointsAwarded,
          reason: 'task-approved',
          sourceId: submission.id,
          createdAt: serverTimestamp()
        });
      }

      await updateTeamStageProgress({ ...submission, status: nextStatus });

      const recipients = [];
      const notifyTeamId = resolvedTeamId || submission.teamId;
      if (notifyTeamId) {
        const teamSnap = await getDoc(doc(db, 'teams', notifyTeamId));
        if (teamSnap.exists()) {
          recipients.push(...(teamSnap.data().memberIds || []));
        }
      } else if (submission.userId) {
        recipients.push(submission.userId);
      }

      if (recipients.length > 0) {
        const isBrandKit = submission.taskType === 'brand_kit';
        const baseTitle = isBrandKit ? 'Brand kit' : submission.taskTitle || 'Task update';
        const link = isBrandKit
          ? '/student/company'
          : submission.taskId
          ? `/student/task/${submission.taskId}`
          : null;
        if (nextStatus === 'approved') {
          await sendNotifications({
            userIds: recipients,
            title: `Approved: ${baseTitle}`,
            message: isBrandKit
              ? 'Your brand kit is approved and published.'
              : `You earned ${pointsAwarded} Bear Bucks. ${feedbackNote ? `Feedback: ${feedbackNote}` : ''}`.trim(),
            link,
            type: 'task-approved',
            sourceId: submission.id
          });
        } else if (nextStatus === 'needs_changes') {
          await sendNotifications({
            userIds: recipients,
            title: `Needs changes: ${baseTitle}`,
            message: isBrandKit
              ? `Update your brand kit and resubmit. ${feedbackNote ? `Feedback: ${feedbackNote}` : ''}`.trim()
              : `Review feedback and resubmit. ${feedbackNote ? `Feedback: ${feedbackNote}` : ''}`.trim(),
            link,
            type: 'task-needs-changes',
            sourceId: submission.id
          });
        }
      }
    } catch (err) {
      setActionError(err.message || 'Could not update submission.');
    }
  };

  return (
    <AppShell
      kicker="APPROVALS"
      title="Review submissions"
      subtitle="Approve, request edits, and award Bear Bucks for every task and stage."
    >
      <Stack spacing={2}>
        {error ? <Alert severity="error">{error.message}</Alert> : null}
        {actionError ? <Alert severity="error">{actionError}</Alert> : null}
        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Search"
              placeholder="Search by task, team, or student"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              select
              label="Stage"
              value={filterStage}
              onChange={(event) => setFilterStage(event.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">All stages</MenuItem>
              {stages.map((stage) => (
                <MenuItem key={stage.id} value={stage.id}>
                  {stage.title || 'Stage'}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Team"
              value={filterTeam}
              onChange={(event) => setFilterTeam(event.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">All teams</MenuItem>
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.companyName || 'Team'}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Paper>
        {loading ? (
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary">Loading submissions...</Typography>
          </Paper>
        ) : null}
        {!loading && filteredSubmissions.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary">No submissions waiting for approval.</Typography>
          </Paper>
        ) : null}
        {filteredSubmissions.map((submission) => {
          const task = taskMap.get(submission.taskId);
          const team = submission.teamId ? teamMap.get(submission.teamId) : null;
          const submitterId = submission.userId || submission.submittedBy;
          const submitter = submitterId ? userMap.get(submitterId) : null;
          return (
          <Paper key={submission.id} sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="h6">
                  {submission.taskTitle || task?.title || 'Untitled task'}
                </Typography>
                <Typography color="text.secondary">
                  {team?.companyName
                    ? `Team: ${team.companyName}`
                    : submitter?.fullName || submitter?.email
                    ? `Student: ${submitter?.fullName || submitter?.email}`
                    : submission.teamId
                    ? `Team: ${submission.teamId}`
                    : `Student: ${submission.userId}`}
                </Typography>
                <Typography color="text.secondary">
                  Bear Bucks: {submission.taskPoints || 0}
                </Typography>
                {task?.type ? (
                  <Typography variant="caption" color="text.secondary">
                    Task type: {task.type}
                  </Typography>
                ) : null}
                {submission.content?.link ? (
                  <Link href={submission.content.link} target="_blank" rel="noreferrer">
                    Open submission link
                  </Link>
                ) : null}
                {submission.content?.timelineNote ? (
                  <Typography variant="body2" color="text.secondary">
                    Timeline: {submission.content.timelineNote}
                  </Typography>
                ) : null}
                {submission.content?.reflection ? (
                  <Typography variant="body2" color="text.secondary">
                    Reflection: {submission.content.reflection}
                  </Typography>
                ) : null}
                {submission.taskType === 'brand_kit' ? (
                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      Company name: {submission.content?.companyName || '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Mission: {submission.content?.mission || '—'}
                    </Typography>
                    {submission.content?.logoDataUrl ? (
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Logo preview:
                        </Typography>
                        <Box
                          component="img"
                          src={submission.content.logoDataUrl}
                          alt="Brand logo"
                          sx={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 2 }}
                        />
                      </Stack>
                    ) : null}
                    {submission.content?.logoUrl ? (
                      <Link href={submission.content.logoUrl} target="_blank" rel="noreferrer">
                        Open logo link
                      </Link>
                    ) : null}
                  </Stack>
                ) : null}
              </Stack>
              <TextField
                label="Feedback"
                multiline
                minRows={3}
                value={feedbackById[submission.id] || ''}
                onChange={(event) =>
                  setFeedbackById((prev) => ({ ...prev, [submission.id]: event.target.value }))
                }
              />
              <TextField
                label="Bonus Bear Bucks"
                type="number"
                value={bonusById[submission.id] || ''}
                onChange={(event) =>
                  setBonusById((prev) => ({ ...prev, [submission.id]: event.target.value }))
                }
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => handleUpdate(submission, 'approved')}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Approve + Feedback
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => handleUpdate(submission, 'needs_changes')}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Needs Changes
                </Button>
              </Stack>
            </Stack>
          </Paper>
        );
        })}
      </Stack>
    </AppShell>
  );
}
