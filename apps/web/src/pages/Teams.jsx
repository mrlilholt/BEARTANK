import {
  Alert,
  Avatar,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  addDoc,
  arrayUnion,
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

export default function Teams() {
  const { user } = useAuth();
  const requestsQuery = useMemo(
    () => query(collection(db, 'teamRequests'), orderBy('createdAt', 'desc')),
    []
  );
  const { data: teamRequests } = useCollection(requestsQuery);

  const stagesQuery = useMemo(
    () => query(collection(db, 'stages'), orderBy('order', 'asc')),
    []
  );
  const { data: stages } = useCollection(stagesQuery);

  const teamsQuery = useMemo(
    () => query(collection(db, 'teams'), orderBy('createdAt', 'desc')),
    []
  );
  const { data: teams } = useCollection(teamsQuery);

  const usersQuery = useMemo(() => query(collection(db, 'users')), []);
  const { data: users } = useCollection(usersQuery);

  const submissionsQuery = useMemo(() => query(collection(db, 'submissions')), []);
  const { data: submissions } = useCollection(submissionsQuery);

  const brandKitQuery = useMemo(
    () => query(collection(db, 'submissions'), where('taskType', '==', 'brand_kit')),
    []
  );
  const { data: brandKitSubmissions } = useCollection(brandKitQuery);

  const teamStagesQuery = useMemo(() => query(collection(db, 'teamStages')), []);
  const { data: teamStages } = useCollection(teamStagesQuery);

  const [companyName, setCompanyName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [memberEmails, setMemberEmails] = useState('');
  const [error, setError] = useState('');
  const [brandFeedbackById, setBrandFeedbackById] = useState({});
  const [addMemberByTeam, setAddMemberByTeam] = useState({});
  const [addMemberErrorByTeam, setAddMemberErrorByTeam] = useState({});

  const parseEmails = (value) =>
    value
      .split(/[,\\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean);

  const resolveMemberIds = async (emails = []) => {
    if (!emails.length) return [];
    if (emails.length > 10) {
      setError('Only up to 10 member emails can be resolved at once.');
      return [];
    }
    const chunks = [];
    for (let i = 0; i < emails.length; i += 10) {
      chunks.push(emails.slice(i, i + 10));
    }

    const ids = new Set();
    for (const chunk of chunks) {
      const snapshot = await getDocs(
        query(collection(db, 'users'), where('email', 'in', chunk))
      );
      snapshot.forEach((docSnap) => ids.add(docSnap.id));
    }
    return Array.from(ids);
  };

  const createTeam = async ({ request } = {}) => {
    setError('');
    const emailSource = request ? request.memberEmails || [] : parseEmails(memberEmails);
    const emails = Array.isArray(emailSource) ? emailSource : parseEmails(emailSource);
    const ids = await resolveMemberIds(emails);

    const memberIds = new Set(ids);
    if (request?.requestedBy) memberIds.add(request.requestedBy);

    const nextCompanyName = request?.companyName || companyName.trim();
    const nextTeamName = request?.teamName || teamName.trim();

    if (!nextCompanyName) {
      setError('Company name is required.');
      return;
    }

    const teamRef = await addDoc(collection(db, 'teams'), {
      companyName: nextCompanyName,
      teamName: nextTeamName || nextCompanyName,
      memberIds: Array.from(memberIds),
      memberEmails: emails,
      status: 'active',
      createdBy: user?.uid || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const stageInitPromises = stages.map(async (stage, index) => {
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
    });
    await Promise.all(stageInitPromises);

    await Promise.all(
      Array.from(memberIds).map((memberId) =>
        updateDoc(doc(db, 'users', memberId), {
          teamId: teamRef.id,
          companyName: nextCompanyName,
          teamName: nextTeamName || nextCompanyName,
          updatedAt: serverTimestamp()
        })
      )
    );

    if (request?.id) {
      await updateDoc(doc(db, 'teamRequests', request.id), {
        status: 'approved',
        resolvedBy: user?.uid || null,
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    setCompanyName('');
    setTeamName('');
    setMemberEmails('');
  };

  const handleReject = async (requestId) => {
    await updateDoc(doc(db, 'teamRequests', requestId), {
      status: 'rejected',
      resolvedBy: user?.uid || null,
      resolvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  };

  const handleAddMember = async (team) => {
    const email = (addMemberByTeam[team.id] || '').trim().toLowerCase();
    if (!email) {
      setAddMemberErrorByTeam((prev) => ({ ...prev, [team.id]: 'Enter an email address.' }));
      return;
    }
    setAddMemberErrorByTeam((prev) => ({ ...prev, [team.id]: '' }));

    const snapshot = await getDocs(
      query(collection(db, 'users'), where('email', '==', email))
    );
    if (snapshot.empty) {
      setAddMemberErrorByTeam((prev) => ({
        ...prev,
        [team.id]: 'No user found with that email.'
      }));
      return;
    }
    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    if ((team.memberIds || []).includes(userId)) {
      setAddMemberErrorByTeam((prev) => ({
        ...prev,
        [team.id]: 'That student is already on this team.'
      }));
      return;
    }

    await updateDoc(doc(db, 'teams', team.id), {
      memberIds: arrayUnion(userId),
      memberEmails: arrayUnion(email),
      updatedAt: serverTimestamp()
    });

    await updateDoc(doc(db, 'users', userId), {
      teamId: team.id,
      companyName: team.companyName,
      teamName: team.teamName || team.companyName,
      updatedAt: serverTimestamp()
    });

    setAddMemberByTeam((prev) => ({ ...prev, [team.id]: '' }));
  };

  const pendingRequests = teamRequests.filter((request) => request.status === 'pending');
  const userMap = useMemo(() => new Map(users.map((item) => [item.id, item])), [users]);

  const teamStageMap = useMemo(() => {
    const map = new Map();
    teamStages.forEach((stage) => {
      if (!stage.teamId) return;
      if (!map.has(stage.teamId)) map.set(stage.teamId, []);
      map.get(stage.teamId).push(stage);
    });
    map.forEach((list) => list.sort((a, b) => Number(a.order || 0) - Number(b.order || 0)));
    return map;
  }, [teamStages]);

  const stageTitleMap = useMemo(
    () => new Map(stages.map((stage) => [stage.id, stage.title || 'Stage'])),
    [stages]
  );

  const teamContributionMap = useMemo(() => {
    const map = new Map();
    teams.forEach((team) => {
      const memberIds = team.memberIds || [];
      const memberStats = new Map();
      memberIds.forEach((memberId) => {
        memberStats.set(memberId, {
          approved: 0,
          pending: 0,
          needsChanges: 0,
          total: 0,
          points: 0
        });
      });

      submissions.forEach((submission) => {
        const inTeam =
          submission.teamId === team.id ||
          (submission.userId && memberIds.includes(submission.userId));
        if (!inTeam) return;
        const contributorId = submission.userId || submission.submittedBy;
        if (!contributorId || !memberStats.has(contributorId)) return;
        const stats = memberStats.get(contributorId);
        stats.total += 1;
        if (submission.status === 'approved') {
          stats.approved += 1;
          stats.points += submission.pointsAwarded ?? submission.taskPoints ?? 0;
        } else if (submission.status === 'submitted') {
          stats.pending += 1;
        } else if (submission.status === 'needs_changes') {
          stats.needsChanges += 1;
        }
      });

      map.set(team.id, memberStats);
    });
    return map;
  }, [teams, submissions]);

  const brandKitByTeam = useMemo(() => {
    const map = new Map();
    brandKitSubmissions.forEach((submission) => {
      if (!submission.teamId) return;
      const existing = map.get(submission.teamId);
      const submissionTime =
        submission.updatedAt?.toMillis?.() || submission.createdAt?.toMillis?.() || 0;
      const existingTime =
        existing?.updatedAt?.toMillis?.() || existing?.createdAt?.toMillis?.() || 0;
      if (!existing || submissionTime >= existingTime) {
        map.set(submission.teamId, submission);
      }
    });
    return map;
  }, [brandKitSubmissions]);

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

  const handleBrandKitDecision = async (submission, team, nextStatus) => {
    if (!submission || !team) return;
    const feedbackNote = brandFeedbackById[submission.id] || '';
    await updateDoc(doc(db, 'submissions', submission.id), {
      status: nextStatus,
      feedback: {
        note: feedbackNote,
        type: nextStatus,
        by: user?.uid || null,
        createdAt: serverTimestamp()
      },
      reviewedBy: user?.uid || null,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    if (nextStatus === 'approved') {
      await setDoc(
        doc(db, 'teamProfiles', submission.teamId),
        {
          teamId: submission.teamId,
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

    const recipients = team.memberIds || [];
    if (nextStatus === 'approved') {
      await sendNotifications({
        userIds: recipients,
        title: 'Approved: Brand kit',
        message: 'Your brand kit is approved and published.',
        link: '/student/company',
        type: 'task-approved',
        sourceId: submission.id
      });
    } else if (nextStatus === 'needs_changes') {
      await sendNotifications({
        userIds: recipients,
        title: 'Needs changes: Brand kit',
        message: `Update your brand kit and resubmit. ${feedbackNote ? `Feedback: ${feedbackNote}` : ''}`.trim(),
        link: '/student/company',
        type: 'task-needs-changes',
        sourceId: submission.id
      });
    }
  };

  return (
    <AppShell
      kicker="TEAMS"
      title="Company roster"
      subtitle="Approve team requests and track individual contributions."
    >
      <Stack spacing={3}>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Create a team</Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              label="Company name"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
            <TextField
              label="Team name (optional)"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
            />
            <TextField
              label="Member emails (comma or newline)"
              value={memberEmails}
              onChange={(event) => setMemberEmails(event.target.value)}
              multiline
              minRows={2}
            />
            <Button
              variant="contained"
              color="secondary"
              onClick={() => createTeam()}
              sx={{ width: { xs: '100%', sm: 'auto' }, alignSelf: { sm: 'flex-start' } }}
            >
              Create team
            </Button>
          </Stack>
        </Paper>

        <Stack spacing={2}>
          <Typography variant="h6">Pending team requests</Typography>
          {pendingRequests.length === 0 ? (
            <Paper sx={{ p: 3 }}>
              <Typography color="text.secondary">No pending team requests.</Typography>
            </Paper>
          ) : null}
          {pendingRequests.map((request) => (
            <Card key={request.id}>
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant="h6">{request.companyName || 'Unnamed team'}</Typography>
                  <Typography color="text.secondary">
                    Team name: {request.teamName || '—'}
                  </Typography>
                  <Typography color="text.secondary">
                    Requested by: {request.requestedBy}
                  </Typography>
                  <Typography color="text.secondary">
                    Members: {(request.memberEmails || []).join(', ') || '—'}
                  </Typography>
                  <Divider />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => createTeam({ request })}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      Approve & create team
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => handleReject(request.id)}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      Reject
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Stack spacing={2}>
          <Typography variant="h6">Active teams</Typography>
          {teams.length === 0 ? (
            <Paper sx={{ p: 3 }}>
              <Typography color="text.secondary">No teams created yet.</Typography>
            </Paper>
          ) : null}
          {teams.map((team) => {
            const memberIds = team.memberIds || [];
            const memberStats = teamContributionMap.get(team.id) || new Map();
            const stageList = teamStageMap.get(team.id) || [];
            const completedStages = stageList.filter((stage) => stage.status === 'complete').length;
            const totalStages = stageList.length || stages.length || 0;
            const activeStage = stageList.find((stage) => stage.status === 'active');
            const averageProgress = totalStages
              ? Math.round(
                  stageList.reduce((sum, stage) => sum + (stage.progress || 0), 0) / totalStages
                )
              : 0;
            const brandKitSubmission = brandKitByTeam.get(team.id);

            return (
              <Paper key={team.id} sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                    <Stack spacing={0.5}>
                      <Typography variant="h6">{team.companyName}</Typography>
                      <Typography color="text.secondary">
                        {team.teamName || 'Team'} • {memberIds.length} members
                      </Typography>
                    </Stack>
                    <Stack spacing={0.5} alignItems={{ md: 'flex-end' }}>
                      <Typography variant="subtitle2">Stage completion</Typography>
                      <Typography variant="h6">{averageProgress}%</Typography>
                    </Stack>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={averageProgress}
                    sx={{
                      height: 8,
                      borderRadius: 999,
                      bgcolor: 'rgba(108, 99, 255, 0.15)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 999,
                        background: 'linear-gradient(90deg, #6c63ff 0%, #9a94ff 100%)'
                      }
                    }}
                  />

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                      label={`${completedStages}/${totalStages || 0} stages complete`}
                      variant="outlined"
                    />
                    {activeStage ? (
                      <Chip
                        label={`Active: ${stageTitleMap.get(activeStage.stageId) || 'Stage'}`}
                        color="secondary"
                      />
                    ) : null}
                  </Stack>

                  <Divider />

                  <Stack spacing={1}>
                    <Typography variant="subtitle2">Member contributions</Typography>
                    {memberIds.length === 0 ? (
                      <Typography color="text.secondary">No members assigned yet.</Typography>
                    ) : (
                      memberIds.map((memberId) => {
                        const member = userMap.get(memberId);
                        const stats = memberStats.get(memberId) || {
                          approved: 0,
                          pending: 0,
                          needsChanges: 0,
                          points: 0
                        };
                        return (
                          <Stack
                            key={memberId}
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            alignItems={{ sm: 'center' }}
                            justifyContent="space-between"
                          >
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar src={member?.photoURL || ''} alt={member?.fullName || 'Student'}>
                                {(member?.preferredName ||
                                  member?.fullName ||
                                  member?.email ||
                                  'B')[0]?.toUpperCase?.()}
                              </Avatar>
                              <Stack spacing={0.2}>
                                <Typography variant="subtitle2">
                                  {member?.preferredName ||
                                    member?.fullName ||
                                    member?.email ||
                                    'Student'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {member?.email || memberId}
                                </Typography>
                              </Stack>
                            </Stack>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              <Chip size="small" color="success" label={`${stats.approved} approved`} />
                              <Chip size="small" label={`${stats.pending} pending`} variant="outlined" />
                              {stats.needsChanges > 0 ? (
                                <Chip size="small" color="warning" label={`${stats.needsChanges} edits`} />
                              ) : null}
                              <Chip size="small" label={`${stats.points} BB`} variant="outlined" />
                            </Stack>
                          </Stack>
                        );
                      })
                    )}
                  </Stack>

                  <Divider />

                  <Stack spacing={1}>
                    <Typography variant="subtitle2">Add team member</Typography>
                    {addMemberErrorByTeam[team.id] ? (
                      <Alert severity="error">{addMemberErrorByTeam[team.id]}</Alert>
                    ) : null}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                      <TextField
                        label="Student email"
                        value={addMemberByTeam[team.id] || ''}
                        onChange={(event) =>
                          setAddMemberByTeam((prev) => ({
                            ...prev,
                            [team.id]: event.target.value
                          }))
                        }
                        sx={{ flex: 1 }}
                      />
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => handleAddMember(team)}
                      >
                        Add to team
                      </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Student must have already logged in once so their account exists.
                    </Typography>
                  </Stack>

                  {brandKitSubmission ? (
                    <>
                      <Divider />
                      <Stack spacing={1.5}>
                        <Typography variant="subtitle2">Brand kit review</Typography>
                        <Typography color="text.secondary">
                          Status: {brandKitSubmission.status}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Company name: {brandKitSubmission.content?.companyName || '—'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Mission: {brandKitSubmission.content?.mission || '—'}
                        </Typography>
                        {brandKitSubmission.content?.logoUrl ? (
                          <Typography variant="caption" color="text.secondary">
                            Logo link provided
                          </Typography>
                        ) : null}

                        {brandKitSubmission.status === 'submitted' ? (
                          <>
                            <TextField
                              label="Brand kit feedback"
                              multiline
                              minRows={2}
                              value={brandFeedbackById[brandKitSubmission.id] || ''}
                              onChange={(event) =>
                                setBrandFeedbackById((prev) => ({
                                  ...prev,
                                  [brandKitSubmission.id]: event.target.value
                                }))
                              }
                            />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                              <Button
                                variant="contained"
                                color="secondary"
                                onClick={() =>
                                  handleBrandKitDecision(brandKitSubmission, team, 'approved')
                                }
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                              >
                                Approve brand kit
                              </Button>
                              <Button
                                variant="outlined"
                                color="secondary"
                                onClick={() =>
                                  handleBrandKitDecision(brandKitSubmission, team, 'needs_changes')
                                }
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                              >
                                Needs changes
                              </Button>
                            </Stack>
                          </>
                        ) : null}
                      </Stack>
                    </>
                  ) : null}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Stack>
    </AppShell>
  );
}
