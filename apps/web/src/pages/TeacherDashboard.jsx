import {
  Box,
  Button,
  ButtonBase,
  Grid,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import { Link as RouterLink } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { collection, query, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { useCollection } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';
import { useAuth } from '../lib/auth-context.jsx';

function ProgressRing({ value = 0 }) {
  const angle = Math.min(100, Math.max(0, value)) * 3.6;
  return (
    <Box
      sx={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: `conic-gradient(#6c63ff 0deg, #9a94ff ${angle}deg, #e6e3ff ${angle}deg)`,
        display: 'grid',
        placeItems: 'center'
      }}
    >
      <Box
        sx={{
          width: '72%',
          height: '72%',
          borderRadius: '50%',
          bgcolor: '#ffffff',
          display: 'grid',
          placeItems: 'center',
          boxShadow: 'inset 0 0 0 1px rgba(31, 37, 82, 0.08)'
        }}
      >
        <Typography variant="h6">{Math.round(value)}%</Typography>
      </Box>
    </Box>
  );
}

export default function TeacherDashboard() {
  const { user, profile } = useAuth();
  const pendingSubmissionsQuery = useMemo(
    () => query(collection(db, 'submissions'), where('status', '==', 'submitted')),
    []
  );
  const { data: pendingSubmissions } = useCollection(pendingSubmissionsQuery);

  const submissionsQuery = useMemo(() => query(collection(db, 'submissions')), []);
  const { data: submissions } = useCollection(submissionsQuery);

  const teamsQuery = useMemo(() => query(collection(db, 'teams')), []);
  const { data: teams } = useCollection(teamsQuery);

  const announcementsQuery = useMemo(() => query(collection(db, 'announcements')), []);
  const { data: announcements } = useCollection(announcementsQuery);

  const sideHustlesQuery = useMemo(
    () => query(collection(db, 'tasks'), where('category', '==', 'side_hustle')),
    []
  );
  const { data: sideHustles } = useCollection(sideHustlesQuery);

  const weekStart = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }, []);
  const pointsQuery = useMemo(
    () => query(collection(db, 'pointsLedger'), where('createdAt', '>=', weekStart)),
    [weekStart]
  );
  const { data: pointsLedger } = useCollection(pointsQuery);

  const pendingCount = pendingSubmissions.length;
  const totalSubmissions = submissions.length;
  const approvedCount = submissions.filter((item) => item.status === 'approved').length;
  const approvalProgress = totalSubmissions
    ? Math.round((approvedCount / totalSubmissions) * 100)
    : 0;
  const activeTeams = teams.length;
  const now = Date.now();
  const scheduledAnnouncements = announcements.filter(
    (item) => item.scheduledFor?.toDate?.() > now
  ).length;
  const nextSideHustle = [...sideHustles]
    .filter((task) => task.schedule?.startAt)
    .sort((a, b) => {
      const aTime = a.schedule?.startAt?.toDate?.()?.getTime?.() || 0;
      const bTime = b.schedule?.startAt?.toDate?.()?.getTime?.() || 0;
      return aTime - bTime;
    })[0];

  const categories = [
    {
      label: 'Approvals',
      helper: `${pendingCount} pending`,
      icon: AssignmentTurnedInRoundedIcon,
      to: '/teacher/approvals'
    },
    {
      label: 'Teams',
      helper: `${activeTeams} active`,
      icon: GroupsRoundedIcon,
      to: '/teacher/teams'
    },
    {
      label: 'Announcements',
      helper: scheduledAnnouncements ? `${scheduledAnnouncements} scheduled` : 'Post now',
      icon: CampaignRoundedIcon,
      to: '/teacher/announcements'
    },
    {
      label: 'Side Hustles',
      helper: nextSideHustle?.title ? 'Next scheduled' : 'Schedule one',
      icon: BoltRoundedIcon,
      to: '/teacher/side-hustles'
    }
  ];

  const scheduleItems = [];
  if (pendingCount > 0) {
    scheduleItems.push({
      id: 'approve-queue',
      day: 'Now',
      title: `Review ${pendingCount} submissions`,
      time: 'ASAP'
    });
  }
  if (nextSideHustle?.schedule?.startAt) {
    const startAt = nextSideHustle.schedule.startAt.toDate
      ? nextSideHustle.schedule.startAt.toDate()
      : new Date(nextSideHustle.schedule.startAt);
    scheduleItems.push({
      id: nextSideHustle.id,
      day: String(startAt.getDate()).padStart(2, '0'),
      title: nextSideHustle.title,
      time: startAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    });
  }
  if (scheduleItems.length === 0) {
    scheduleItems.push({
      id: 'clear',
      day: '✓',
      title: 'No urgent items',
      time: 'All caught up'
    });
  }

  const weeklyTotals = new Array(7).fill(0);
  pointsLedger.forEach((entry) => {
    const date = entry.createdAt?.toDate?.();
    if (!date || date < weekStart) return;
    const diff = Math.floor((date - weekStart) / (24 * 60 * 60 * 1000));
    if (diff >= 0 && diff < 7) weeklyTotals[diff] += entry.amount || 0;
  });
  const weeklyMax = Math.max(...weeklyTotals, 1);
  const weeklySeries = weeklyTotals.map((value) => Math.round((value / weeklyMax) * 100));
  const totalIssued = weeklyTotals.reduce((sum, value) => sum + value, 0);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const coachName =
    profile?.preferredName ||
    profile?.fullName?.split(' ')?.[0] ||
    user?.displayName?.split(' ')?.[0] ||
    'Coach';

  return (
    <AppShell
      kicker="TEACHER"
      title="Teacher Command Center"
      subtitle="Move every team forward with approvals, side hustles, and polished guidance."
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper
            sx={{
              p: 4,
              background: 'linear-gradient(135deg, #f6f5ff 0%, #fff1e7 100%)'
            }}
          >
            <Stack spacing={2}>
              <Typography variant="overline" sx={{ letterSpacing: '0.3em' }}>
                SUPERCHARGE THE TANK
              </Typography>
              <Typography variant="h3">
                {greeting}, {coachName}.
              </Typography>
              <Typography color="text.secondary">
                {pendingCount > 0
                  ? `You have ${pendingCount} submissions waiting for review.`
                  : 'All approvals are clear. Launch the next side hustle.'}
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ sm: 'center' }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  component={RouterLink}
                  to="/teacher/approvals"
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Review approvals
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  component={RouterLink}
                  to="/teacher/side-hustles"
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Launch side hustle
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Key control panels</Typography>
              <Grid container spacing={2}>
                {categories.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Grid item xs={6} sm={3} key={item.label}>
                      <ButtonBase
                        component={RouterLink}
                        to={item.to}
                        sx={{
                          width: '100%',
                          height: 96,
                          borderRadius: 6,
                          p: 2,
                          textAlign: 'center',
                          bgcolor: '#ffffff',
                          border: '1px solid #f1f2f6',
                          position: 'relative',
                          overflow: 'visible',
                          display: 'grid',
                          placeItems: 'center',
                          '&:hover .panel-label': {
                            opacity: 1,
                            transform: 'translate(-50%, -140%)'
                          }
                        }}
                      >
                        <Box
                          sx={{
                            display: 'grid',
                            placeItems: 'center',
                            color: 'secondary.main'
                          }}
                        >
                          <Icon fontSize="small" />
                        </Box>
                        <Box
                          className="panel-label"
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: '50%',
                            transform: 'translate(-50%, -160%)',
                            bgcolor: 'rgba(31, 37, 82, 0.92)',
                            color: '#fff',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            opacity: 0,
                            transition: 'all 0.2s ease',
                            zIndex: 2
                          }}
                        >
                          {item.label}
                        </Box>
                      </ButtonBase>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Today’s schedule</Typography>
              <Stack spacing={2}>
                {scheduleItems.map((item) => (
                  <Stack key={item.id} direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        bgcolor: 'var(--beartank-lavender)',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 600
                      }}
                    >
                      {item.day}
                    </Box>
                    <Stack spacing={0.3}>
                      <Typography variant="subtitle1">{item.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.time}
                      </Typography>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            <Paper sx={{ p: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Stack spacing={0.5}>
                  <Typography variant="overline" sx={{ letterSpacing: '0.2em' }}>
                    APPROVALS CLEARED
                  </Typography>
                  <Typography variant="h5">Approval momentum</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {approvedCount} of {totalSubmissions} approved
                  </Typography>
                </Stack>
                <ProgressRing value={approvalProgress} />
              </Stack>
            </Paper>

            <Paper sx={{ p: 3, bgcolor: 'var(--beartank-peach)' }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">Announcement drop</Typography>
                <Typography color="text.secondary">
                  Post a rally message to keep students building momentum into the afternoon.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  component={RouterLink}
                  to="/teacher/announcements"
                >
                  Draft announcement
                </Button>
              </Stack>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6">Bear Bucks issued</Typography>
                <Typography variant="body2" color="text.secondary">
                  {totalIssued.toLocaleString()} this week
                </Typography>
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
          </Stack>
        </Grid>
      </Grid>
    </AppShell>
  );
}
