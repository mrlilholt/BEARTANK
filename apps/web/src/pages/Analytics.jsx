import {
  Box,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import { collection, orderBy, query } from 'firebase/firestore';
import { useMemo } from 'react';
import AppShell from '../components/AppShell.jsx';
import StatCard from '../components/StatCard.jsx';
import { useCollection } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';

export default function Analytics() {
  const stagesQuery = useMemo(
    () => query(collection(db, 'stages'), orderBy('order', 'asc')),
    []
  );
  const { data: stages } = useCollection(stagesQuery);

  const teamStagesQuery = useMemo(() => query(collection(db, 'teamStages')), []);
  const { data: teamStages } = useCollection(teamStagesQuery);

  const teamsQuery = useMemo(() => query(collection(db, 'teams')), []);
  const { data: teams } = useCollection(teamsQuery);

  const submissionsQuery = useMemo(() => query(collection(db, 'submissions')), []);
  const { data: submissions } = useCollection(submissionsQuery);

  const todayStart = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start;
  }, []);
  const weekStart = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }, []);

  const submissionsToday = submissions.filter((submission) => {
    const created = submission.createdAt?.toDate?.();
    return created && created >= todayStart;
  }).length;

  const pendingByTeam = submissions.reduce((acc, submission) => {
    if (submission.status !== 'submitted' || !submission.teamId) return acc;
    acc.add(submission.teamId);
    return acc;
  }, new Set());
  const teamsBlocked = pendingByTeam.size;

  const stageTotals = useMemo(() => {
    const map = new Map();
    stages.forEach((stage) => {
      map.set(stage.id, { complete: 0, active: 0, locked: 0, progress: 0 });
    });
    teamStages.forEach((teamStage) => {
      if (!map.has(teamStage.stageId)) return;
      const entry = map.get(teamStage.stageId);
      entry.progress += teamStage.progress || 0;
      if (teamStage.status === 'complete') entry.complete += 1;
      else if (teamStage.status === 'active') entry.active += 1;
      else entry.locked += 1;
    });
    return map;
  }, [stages, teamStages]);

  const stageCompletionAvg = useMemo(() => {
    if (!teams.length || !stages.length) return 0;
    const totalProgress = teamStages.reduce((sum, stage) => sum + (stage.progress || 0), 0);
    const totalSlots = teams.length * stages.length;
    return totalSlots ? Math.round(totalProgress / totalSlots) : 0;
  }, [teams.length, stages.length, teamStages]);

  const stageCompletionList = stages.map((stage) => {
    const totals = stageTotals.get(stage.id) || {
      complete: 0,
      active: 0,
      locked: 0,
      progress: 0
    };
    const totalTeams = teams.length || 1;
    const progress = Math.round(totals.progress / totalTeams);
    return {
      id: stage.id,
      title: stage.title || 'Stage',
      progress,
      complete: totals.complete,
      active: totals.active,
      locked: totals.locked
    };
  });

  const weeklyCounts = useMemo(() => {
    const counts = new Array(7).fill(0);
    submissions.forEach((submission) => {
      const date = submission.createdAt?.toDate?.();
      if (!date || date < weekStart) return;
      const diff = Math.floor((date - weekStart) / (24 * 60 * 60 * 1000));
      if (diff >= 0 && diff < 7) counts[diff] += 1;
    });
    return counts;
  }, [submissions, weekStart]);
  const weeklyMax = Math.max(...weeklyCounts, 1);
  const weeklySeries = weeklyCounts.map((value) => Math.round((value / weeklyMax) * 100));

  const mostDelayedStage = stageCompletionList
    .filter((stage) => stage.progress > 0)
    .sort((a, b) => a.progress - b.progress)[0];

  return (
    <AppShell
      kicker="ANALYTICS"
      title="Progress snapshots"
      subtitle="Track stage completion, submission counts, and bottlenecks."
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <StatCard label="Stage Completion" value={`${stageCompletionAvg}%`} helper="Class average" />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard label="Submissions" value={`${submissionsToday}`} helper="Today" />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard label="Teams Blocked" value={`${teamsBlocked}`} helper="Need approval" />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Stage completion</Typography>
              {stageCompletionList.length === 0 ? (
                <Typography color="text.secondary">No stages yet.</Typography>
              ) : (
                stageCompletionList.map((stage) => (
                  <Stack key={stage.id} spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="subtitle2">{stage.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stage.progress}% average
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={stage.progress}
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
                      <Chip size="small" label={`${stage.complete} complete`} color="success" />
                      <Chip size="small" label={`${stage.active} active`} variant="outlined" />
                      <Chip size="small" label={`${stage.locked} locked`} variant="outlined" />
                    </Stack>
                  </Stack>
                ))
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            <Paper sx={{ p: 3 }}>
              <Stack spacing={1}>
                <Typography variant="h6">Weekly submissions</Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    alignItems: 'end',
                    gap: 1,
                    height: 120
                  }}
                >
                  {weeklySeries.map((value, index) => (
                    <Box
                      key={`bar-${index}`}
                      sx={{
                        height: `${value}%`,
                        borderRadius: 999,
                        background: 'linear-gradient(180deg, #6c63ff 0%, #9a94ff 100%)'
                      }}
                    />
                  ))}
                </Box>
                <Stack direction="row" justifyContent="space-between">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day) => (
                    <Typography key={day} variant="caption" color="text.secondary">
                      {day}
                    </Typography>
                  ))}
                </Stack>
              </Stack>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Stack spacing={1}>
                <Typography variant="h6">Most delayed stage</Typography>
                <Typography color="text.secondary">
                  {mostDelayedStage
                    ? `${mostDelayedStage.title} (${mostDelayedStage.progress}% complete)`
                    : 'No data yet.'}
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </AppShell>
  );
}
