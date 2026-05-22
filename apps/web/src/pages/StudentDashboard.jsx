import {
  Alert,
  Avatar,
  Box,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import DesignServicesRoundedIcon from '@mui/icons-material/DesignServicesRounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import {
  addDoc,
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import StageCard from '../components/StageCard.jsx';
import { useAuth } from '../lib/auth-context.jsx';
import { useCollection, useDocument } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';

const sampleTasks = [
  {
    id: 'sample-1',
    title: 'Company Incorporation Brief',
    description: 'Link your Google Doc with your company name, mission, and roles.',
    points: 20000,
    type: 'team',
    isBonus: false
  },
  {
    id: 'sample-2',
    title: 'Logo Concept Sprint',
    description: 'Add three logo sketches or mockups to your doc.',
    points: 15000,
    type: 'individual',
    isBonus: false
  },
  {
    id: 'sample-3',
    title: 'Prototype Play Test',
    description: 'Capture one photo and list three improvements.',
    points: 25000,
    type: 'team',
    isBonus: true
  }
];

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

function CelebrationConfetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        id: index,
        left: `${(index * 13) % 100}%`,
        delay: `${(index % 7) * 0.12}s`,
        duration: `${2.6 + (index % 5) * 0.18}s`,
        color: ['#6c63ff', '#ff6f61', '#34d399', '#fbbf24'][index % 4],
        rotate: `${(index % 2 === 0 ? 1 : -1) * (10 + index * 7)}deg`
      })),
    []
  );

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 1600
      }}
    >
      {pieces.map((piece) => (
        <Box
          key={piece.id}
          sx={{
            position: 'absolute',
            top: -24,
            left: piece.left,
            width: 12,
            height: 20,
            borderRadius: piece.id % 3 === 0 ? '50%' : 1,
            bgcolor: piece.color,
            opacity: 0.92,
            transform: `rotate(${piece.rotate})`,
            animation: `confetti-fall ${piece.duration} ease-in ${piece.delay} forwards`,
            '@keyframes confetti-fall': {
              '0%': { transform: `translate3d(0,0,0) rotate(${piece.rotate})`, opacity: 1 },
              '100%': {
                transform: `translate3d(${piece.id % 2 === 0 ? '-120px' : '120px'}, 110vh, 0) rotate(${Number.parseInt(piece.rotate, 10) * 4}deg)`,
                opacity: 0
              }
            }
          }}
        />
      ))}
    </Box>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const stagesQuery = useMemo(
    () => query(collection(db, 'stages'), orderBy('order', 'asc')),
    []
  );
  const { data: stages } = useCollection(stagesQuery);
  const tasksQuery = useMemo(() => query(collection(db, 'tasks'), orderBy('order', 'asc')), []);
  const { data: allTasks } = useCollection(tasksQuery);
  const teamStagesQuery = useMemo(() => {
    if (!profile?.teamId) return null;
    return query(
      collection(db, 'teamStages'),
      where('teamId', '==', profile.teamId),
      orderBy('order', 'asc')
    );
  }, [profile?.teamId]);
  const { data: teamStages } = useCollection(teamStagesQuery);

  const activeTeamStage =
    teamStages.find((stage) => stage.status === 'active') || teamStages[0];
  const activeStage =
    stages.find((stage) => stage.id === activeTeamStage?.stageId) || stages[0];
  const [selectedStageId, setSelectedStageId] = useState('');
  const selectedStage =
    stages.find((stage) => stage.id === selectedStageId) || activeStage;

  useEffect(() => {
    if (!selectedStageId && activeStage?.id) {
      setSelectedStageId(activeStage.id);
    }
  }, [activeStage?.id, selectedStageId]);

  const teamRef = useMemo(() => {
    if (!profile?.teamId) return null;
    return doc(db, 'teams', profile.teamId);
  }, [profile?.teamId]);
  const { data: team } = useDocument(teamRef);

  const teamProfileRef = useMemo(() => {
    if (!profile?.teamId) return null;
    return doc(db, 'teamProfiles', profile.teamId);
  }, [profile?.teamId]);
  const { data: teamProfile } = useDocument(teamProfileRef);

  const teamRequestQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'teamRequests'), where('requestedBy', '==', user.uid));
  }, [user?.uid]);
  const { data: teamRequests } = useCollection(teamRequestQuery);
  const pendingRequest = teamRequests.find((request) => request.status === 'pending');

  const sideHustleQuery = useMemo(
    () => query(collection(db, 'tasks'), where('category', '==', 'side_hustle')),
    []
  );
  const { data: sideHustles } = useCollection(sideHustleQuery);

  const teamSubmissionsQuery = useMemo(() => {
    if (!profile?.teamId) return null;
    return query(collection(db, 'submissions'), where('teamId', '==', profile.teamId));
  }, [profile?.teamId]);
  const { data: teamSubmissions } = useCollection(teamSubmissionsQuery);

  const userSubmissionsQuery = useMemo(() => {
    if (!user) return null;
    if (profile?.teamId) {
      return query(
        collection(db, 'submissions'),
        where('userId', '==', user.uid),
        where('teamId', '==', profile.teamId)
      );
    }
    return query(collection(db, 'submissions'), where('userId', '==', user.uid));
  }, [user?.uid, profile?.teamId]);
  const { data: userSubmissions } = useCollection(userSubmissionsQuery);

  const [companyName, setCompanyName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [memberEmails, setMemberEmails] = useState('');
  const [requestError, setRequestError] = useState('');
  const [animatedValue, setAnimatedValue] = useState(0);
  const [celebration, setCelebration] = useState(null);
  const [celebrationAmount, setCelebrationAmount] = useState(0);
  const [sideHustlePopup, setSideHustlePopup] = useState(null);

  const userPointsQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(db, 'pointsLedger'),
      where('entityType', '==', 'user'),
      where('entityId', '==', user.uid)
    );
  }, [user?.uid]);
  const { data: userPoints } = useCollection(userPointsQuery);

  const teamPointsQuery = useMemo(() => {
    if (!profile?.teamId) return null;
    return query(
      collection(db, 'pointsLedger'),
      where('entityType', '==', 'team'),
      where('entityId', '==', profile.teamId)
    );
  }, [profile?.teamId]);
  const { data: teamPoints } = useCollection(teamPointsQuery);

  const totalPoints =
    (userPoints || []).reduce((sum, entry) => sum + (entry.amount || 0), 0) +
    (teamPoints || []).reduce((sum, entry) => sum + (entry.amount || 0), 0);

  useEffect(() => {
    let frameId;
    let startTime = null;
    const duration = 1600;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(Math.floor(eased * totalPoints));
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };
    setAnimatedValue(0);
    frameId = requestAnimationFrame(animate);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [totalPoints]);

  const submissions = useMemo(() => {
    const deduped = new Map();
    [...(teamSubmissions || []), ...(userSubmissions || [])].forEach((submission) => {
      if (!submission?.id) return;
      const existing = deduped.get(submission.id);
      const submissionTime =
        submission.reviewedAt?.toMillis?.() ||
        submission.updatedAt?.toMillis?.() ||
        submission.createdAt?.toMillis?.() ||
        0;
      const existingTime =
        existing?.reviewedAt?.toMillis?.() ||
        existing?.updatedAt?.toMillis?.() ||
        existing?.createdAt?.toMillis?.() ||
        0;
      if (!existing || submissionTime >= existingTime) {
        deduped.set(submission.id, submission);
      }
    });
    return [...deduped.values()];
  }, [teamSubmissions, userSubmissions]);
  const pendingCount = submissions.filter((item) => item.status === 'submitted').length;
  const approvedCount = submissions.filter((item) => item.status === 'approved').length;
  const needsChangesCount = submissions.filter((item) => item.status === 'needs_changes').length;

  const submissionsByTask = submissions.reduce((acc, submission) => {
    if (!submission.taskId) return acc;
    const existing = acc.get(submission.taskId);
    const submissionTime =
      submission.updatedAt?.toMillis?.() || submission.createdAt?.toMillis?.() || 0;
    const existingTime =
      existing?.updatedAt?.toMillis?.() || existing?.createdAt?.toMillis?.() || 0;
    if (!existing || submissionTime >= existingTime) {
      acc.set(submission.taskId, submission);
    }
    return acc;
  }, new Map());

  const stageTasks = useMemo(
    () =>
      allTasks
        .filter((task) => task.stageId === selectedStage?.id && task.category !== 'side_hustle')
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [allTasks, selectedStage?.id]
  );
  const tasksToShow = stageTasks.length ? stageTasks : sampleTasks;
  const hasTeamStages = teamStages.length > 0;
  const stageCards = stages.length
    ? stages.map((stage) => {
        const teamStage = teamStages.find((item) => item.stageId === stage.id);
        return {
          id: stage.id,
          title: stage.title,
          status:
            teamStage?.status ||
            (!hasTeamStages && stages[0]?.id === stage.id ? 'active' : 'locked'),
          progress: teamStage?.progress || 0,
          points: stage.pointsTotal || 0,
          tasks: stage.taskCount || 0
        };
      })
    : [
        {
          id: 'stage-1',
          title: 'Ideation',
          status: 'active',
          progress: 48,
          points: 100000,
          tasks: 4
        },
        {
          id: 'stage-2',
          title: 'Research',
          status: 'locked',
          progress: 0,
          points: 100000,
          tasks: 3
        }
      ];

  const displayCompanyName =
    teamProfile?.companyName || team?.companyName || 'Solo Team';
  const teamMemberNames = useMemo(
    () =>
      (team?.memberNames?.length
        ? team.memberNames
        : (team?.memberEmails || []).map((email) => {
            const rawName = email?.split('@')?.[0] || 'student';
            const firstSegment = rawName.split(/[._-]/)[0] || rawName;
            return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
          }))
        .sort((a, b) => a.localeCompare(b)),
    [team?.memberEmails, team?.memberNames]
  );

  const handleTeamRequest = async () => {
    setRequestError('');
    if (!companyName.trim()) {
      setRequestError('Company name is required.');
      return;
    }

    const emails = memberEmails
      .split(/[,\\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    await addDoc(collection(db, 'teamRequests'), {
      companyName: companyName.trim(),
      teamName: teamName.trim() || companyName.trim(),
      memberEmails: emails,
      requestedBy: user.uid,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    setCompanyName('');
    setTeamName('');
    setMemberEmails('');
  };

  const logoUrl = teamProfile?.logoDataUrl || teamProfile?.logoUrl || '';
  const greetingName =
    profile?.preferredName ||
    profile?.fullName?.split(' ')?.[0] ||
    user?.displayName?.split(' ')?.[0] ||
    'Bear';
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);
  const progressValue = activeTeamStage?.progress || 0;
  const categoryIcons = [
    LightbulbRoundedIcon,
    DesignServicesRoundedIcon,
    PrecisionManufacturingRoundedIcon,
    RocketLaunchRoundedIcon
  ];
  const categoryTiles = stageCards.slice(0, 4).map((stage, index) => ({
    ...stage,
    icon: categoryIcons[index % categoryIcons.length]
  }));
  const stageOrderMap = useMemo(
    () => new Map(stageCards.map((stage, index) => [stage.id, index])),
    [stageCards]
  );
  const scheduleItems = tasksToShow.slice(0, 3).map((task, index) => {
    const submission = submissionsByTask.get(task.id);
    return {
      id: task.id || `task-${index}`,
      title: task.title,
      points: task.points,
      status: submission?.status || 'pending',
      day: index + 1,
      time: '9:00 AM'
    };
  });

  const getOrderedStageTasks = (stageId) =>
    allTasks
      .filter((task) => task.stageId === stageId && task.category !== 'side_hustle')
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  const getStageMissionTarget = (stageId) => {
    const candidateTasks = getOrderedStageTasks(stageId);
    if (candidateTasks.length === 0) return null;
    const nextTask = candidateTasks.find((task) => {
      const status = submissionsByTask.get(task.id)?.status;
      return status !== 'approved';
    });
    if (nextTask) return nextTask;

    const currentOrder = stageOrderMap.get(stageId) ?? -1;
    const nextUnlockedStage = stageCards.find(
      (stage) => (stageOrderMap.get(stage.id) ?? -1) > currentOrder && stage.status !== 'locked'
    );
    if (nextUnlockedStage) {
      const nextStageTasks = getOrderedStageTasks(nextUnlockedStage.id);
      if (nextStageTasks.length > 0) return nextStageTasks[0];
    }

    return candidateTasks[0];
  };

  const approvedSubmissions = useMemo(
    () =>
      submissions
        .filter((submission) => submission.status === 'approved')
        .sort((a, b) => {
          const aTime = a.reviewedAt?.toMillis?.() || a.updatedAt?.toMillis?.() || 0;
          const bTime = b.reviewedAt?.toMillis?.() || b.updatedAt?.toMillis?.() || 0;
          return bTime - aTime;
        }),
    [submissions]
  );

  useEffect(() => {
    if (!user || celebration) return;

    const pendingMissionCelebrations = approvedSubmissions
      .filter((submission) => {
        const key = `beartank:mission-celebration:${submission.id}`;
        return typeof window !== 'undefined' && !window.localStorage.getItem(key);
      })
      .map((submission) => ({
        type: 'mission',
        key: `beartank:mission-celebration:${submission.id}`,
        title: 'Mission complete',
        body: `${submission.taskTitle || 'Your mission'} was approved.`,
        amount: submission.pointsAwarded ?? submission.taskPoints ?? 0
      }));

    if (pendingMissionCelebrations.length > 0) {
      setCelebration(pendingMissionCelebrations[0]);
      return;
    }

    const pendingPhaseCelebrations = teamStages
      .filter((stage) => stage.status === 'complete')
      .sort((a, b) => Number(b.order || 0) - Number(a.order || 0))
      .map((stage) => {
        const stageMeta = stages.find((item) => item.id === stage.stageId);
        const stageEarned = approvedSubmissions
          .filter((submission) => submission.stageId === stage.stageId)
          .reduce(
            (sum, submission) =>
              sum + Number(submission.pointsAwarded ?? submission.taskPoints ?? 0),
            0
          );

        return {
          type: 'phase',
          key: `beartank:phase-celebration:${profile?.teamId}:${stage.stageId}`,
          title: `${stageMeta?.title || 'Phase'} complete`,
          body: 'During this phase you earned a total of',
          amount: stageEarned
        };
      })
      .filter(
        (item) => typeof window !== 'undefined' && !window.localStorage.getItem(item.key)
      );

    if (pendingPhaseCelebrations.length > 0) {
      setCelebration(pendingPhaseCelebrations[0]);
    }
  }, [approvedSubmissions, celebration, profile?.teamId, stages, teamStages, user]);

  useEffect(() => {
    if (!location.state?.sideHustleCelebration || sideHustlePopup) return;
    setSideHustlePopup({
      title: 'Way to keep HUSTLING!',
      taskTitle: location.state.sideHustleTaskTitle || ''
    });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, sideHustlePopup]);

  useEffect(() => {
    if (!celebration) {
      setCelebrationAmount(0);
      return;
    }
    let frameId;
    let startTime = null;
    const finalAmount = Number(celebration.amount || 0);
    const duration = celebration.type === 'phase' ? 1800 : 1200;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCelebrationAmount(Math.floor(eased * finalAmount));
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    setCelebrationAmount(0);
    frameId = requestAnimationFrame(animate);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [celebration]);

  const closeCelebration = () => {
    if (celebration?.key && typeof window !== 'undefined') {
      window.localStorage.setItem(celebration.key, '1');
    }
    setCelebration(null);
  };

  const weeklyCounts = useMemo(() => {
    const counts = new Array(7).fill(0);
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    submissions.forEach((submission) => {
      const date = submission.createdAt?.toDate?.();
      if (!date || date < start) return;
      const diff = Math.floor((date - start) / (24 * 60 * 60 * 1000));
      if (diff >= 0 && diff < 7) counts[diff] += 1;
    });
    return counts;
  }, [submissions]);

  const weeklySeries = useMemo(() => {
    const max = Math.max(...weeklyCounts, 1);
    return weeklyCounts.map((value) => Math.round((value / max) * 100));
  }, [weeklyCounts]);

  const missionControlPanel = (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h5">Mission control</Typography>
        {tasksToShow.length === 0 ? (
          <Typography color="text.secondary">No missions available yet.</Typography>
        ) : (
          <Stack spacing={1}>
            {tasksToShow.map((task) => {
              const submission = submissionsByTask.get(task.id);
              const status = submission?.status || 'pending';
              return (
                <Accordion
                  key={task.id}
                  disableGutters
                  sx={{
                    borderRadius: 6,
                    '&:before': { display: 'none' },
                    boxShadow: '0 10px 24px rgba(31, 37, 82, 0.08)'
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ width: '100%', gap: 2 }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {task.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={status.replace('_', ' ')}
                        color={status === 'approved' ? 'success' : status === 'submitted' ? 'info' : 'default'}
                      />
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1}>
                      <Typography color="text.secondary">
                        {task.description || 'Add your work details and submit for approval.'}
                      </Typography>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          {task.points || 0} BB • {task.type || 'team'} task
                        </Typography>
                      </Stack>
                      <Button
                        component={RouterLink}
                        to={`/student/task/${task.id}`}
                        variant="outlined"
                        color="secondary"
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        Open mission
                      </Button>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Paper>
  );

  return (
    <AppShell
      kicker="STUDENT"
      title="Company HQ"
      subtitle="Run your company like a modern startup, collect Bear Bucks, and unlock each stage with clean approvals."
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Typography
          color="text.secondary"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            fontSize: { xs: '1rem', md: '1.1rem' }
          }}
        >
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {displayCompanyName}
          </Box>
          <Box component="span">is valued at</Box>
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 2.2,
              py: 0.7,
              borderRadius: 999,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              background: 'linear-gradient(135deg, #fff4e9 0%, #ffe1d6 100%)',
              color: '#1f2552',
              boxShadow: '0 12px 26px rgba(255, 111, 97, 0.25)',
              position: 'relative',
              overflow: 'hidden',
              '@keyframes shine': {
                '0%': { transform: 'translateX(-120%)' },
                '60%': { transform: 'translateX(120%)' },
                '100%': { transform: 'translateX(120%)' }
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
                transform: 'translateX(-120%)',
                animation: 'shine 2.6s ease-in-out infinite'
              }
            }}
          >
            {animatedValue.toLocaleString()} BB
          </Box>
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper
            sx={{
              p: 4,
              background: 'linear-gradient(135deg, #f6f5ff 0%, #fff1e7 100%)'
            }}
          >
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <Avatar
                  src={logoUrl || teamProfile?.logoDataUrl || undefined}
                  alt={displayCompanyName}
                  variant="rounded"
                  sx={{ width: 96, height: 96, bgcolor: 'secondary.main', color: '#0f1b2d' }}
                >
                  {displayCompanyName.slice(0, 2).toUpperCase()}
                </Avatar>
                <Stack spacing={0.5}>
                  <Typography variant="overline" sx={{ letterSpacing: '0.3em' }}>
                    COMPANY HQ
                  </Typography>
                  <Typography variant="h3">
                    {greeting}, {greetingName}
                  </Typography>
                  <Typography color="text.secondary">
                    Track your company value as approvals come in.
                  </Typography>
                </Stack>
              </Stack>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ sm: 'center' }}
                justifyContent={{ sm: 'center' }}
              >
                <Button
                  component={RouterLink}
                  to="/student/company"
                  variant="contained"
                  color="primary"
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Open company profile
                </Button>
                <Button
                  component={RouterLink}
                  to={tasksToShow[0]?.id ? `/student/task/${tasksToShow[0].id}` : '/student'}
                  variant="outlined"
                  color="secondary"
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Review next task
                </Button>
              </Stack>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                  <Chip label={`Phase: ${activeStage?.title || 'Pending'}`} color="secondary" />
                  <Chip label={`Team: ${displayCompanyName}`} variant="outlined" />
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                  <Chip label={`${tasksToShow.length} tasks in play`} variant="outlined" />
                  <Chip label={`${pendingCount} awaiting approval`} variant="outlined" />
                  <Chip label={`${approvedCount} approved`} variant="outlined" />
                  {needsChangesCount > 0 ? (
                    <Chip label={`${needsChangesCount} need edits`} color="warning" />
                  ) : null}
                </Stack>
              </Stack>
            </Stack>
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Choose a phase</Typography>
              <Grid container spacing={2}>
                {categoryTiles.map((stage) => {
                  const Icon = stage.icon;
                  const isSelected = stage.id === selectedStageId;
                  const isActive = stage.status === 'active';
                  const isLocked = stage.status === 'locked';
                  const isComplete = stage.status === 'complete';
                  const isInteractive = !isLocked && !isComplete;
                  return (
                    <Grid item xs={6} sm={3} key={stage.id}>
                      <ButtonBase
                        onClick={() => {
                          setSelectedStageId(stage.id);
                          if (!isInteractive) return;
                          const mission = getStageMissionTarget(stage.id);
                          if (mission?.id) navigate(`/student/task/${mission.id}`);
                        }}
                        disabled={!isInteractive}
                        sx={{
                          width: '100%',
                          height: 140,
                          borderRadius: 6,
                          p: 2,
                          textAlign: 'center',
                          bgcolor: isComplete
                            ? 'rgba(34, 197, 94, 0.12)'
                            : isActive
                            ? 'rgba(108, 99, 255, 0.12)'
                            : '#ffffff',
                          border: isComplete
                            ? '1px solid rgba(34, 197, 94, 0.45)'
                            : isActive
                            ? '1px solid rgba(108, 99, 255, 0.4)'
                            : '1px solid #f1f2f6',
                          opacity: isLocked ? 0.5 : 1,
                          cursor: isInteractive ? 'pointer' : 'default',
                          boxShadow: isSelected
                            ? '0 14px 28px rgba(108, 99, 255, 0.12)'
                            : 'none'
                        }}
                      >
                        <Stack spacing={1} alignItems="center">
                          <Box
                            sx={{
                              width: 42,
                              height: 42,
                              borderRadius: 6,
                              display: 'grid',
                              placeItems: 'center',
                              bgcolor: isComplete
                                ? 'rgba(34, 197, 94, 0.2)'
                                : isActive
                                ? 'rgba(108, 99, 255, 0.2)'
                                : 'rgba(108, 99, 255, 0.08)',
                              color: isComplete ? 'success.main' : 'secondary.main'
                            }}
                          >
                            <Icon fontSize="small" />
                          </Box>
                          <Typography variant="subtitle2" sx={{ textAlign: 'center' }}>
                            {stage.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                            {isLocked ? 'locked' : isComplete ? 'complete' : `${stage.progress}% complete`}
                          </Typography>
                        </Stack>
                      </ButtonBase>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6">Today’s runway</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedStage?.title || activeStage?.title || 'Stage'} focus
                </Typography>
              </Stack>
              {scheduleItems.length === 0 ? (
                <Typography color="text.secondary">No tasks queued yet.</Typography>
              ) : (
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
                        {String(item.day).padStart(2, '0')}
                      </Box>
                      <Stack spacing={0.3}>
                        <Typography variant="subtitle1">{item.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.points || 0} BB • {item.time} • {item.status.replace('_', ' ')}
                        </Typography>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h5">Phase checklist</Typography>
              <Grid container spacing={2}>
                {stageCards.map((stage) => (
                  <Grid item xs={12} md={6} key={stage.id}>
                    <StageCard
                      title={stage.title}
                      status={stage.status}
                      progress={stage.progress}
                      points={stage.points}
                      tasks={stage.tasks}
                    />
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            {missionControlPanel}
            <Paper sx={{ p: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Stack spacing={0.5}>
                  <Typography variant="overline" sx={{ letterSpacing: '0.2em' }}>
                    DAY PROGRESS
                  </Typography>
                  <Typography variant="h5">{activeStage?.title || 'Stage progress'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {progressValue}% complete
                  </Typography>
                </Stack>
                <ProgressRing value={progressValue} />
              </Stack>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="h5">Side hustles</Typography>
                  <Chip label="Always On" size="small" variant="outlined" />
                </Stack>
                {sideHustles.length === 0 ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      borderStyle: 'dashed',
                      color: 'text.secondary'
                    }}
                  >
                    No side hustles active for your class yet.
                  </Paper>
                ) : (
                  <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1, px: 1, mx: -1 }}>
                    {sideHustles.map((task) => {
                      const startAt = task.schedule?.startAt?.toDate?.();
                      const endAt = task.schedule?.endAt?.toDate?.();
                      const isUpcoming = startAt ? startAt.getTime() > Date.now() : false;
                      const cardImage = task.imageDataUrl
                        ? `url(${task.imageDataUrl})`
                        : task.imageUrl
                        ? `url(${task.imageUrl})`
                        : 'linear-gradient(135deg, #6c63ff 0%, #ff8a7a 100%)';
                      return (
                        <ButtonBase
                          key={task.id}
                          component={RouterLink}
                          to={`/student/task/${task.id}`}
                          sx={{
                            minWidth: { xs: 240, sm: 300 },
                            height: 170,
                            borderRadius: 2,
                            overflow: 'hidden',
                            position: 'relative',
                            border: '1px solid #eef1f7',
                            boxShadow: '0 12px 24px rgba(31, 37, 82, 0.08)',
                            backgroundImage: cardImage,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            textAlign: 'left'
                          }}
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              background:
                                'linear-gradient(115deg, rgba(15, 23, 42, 0.2) 0%, rgba(15, 23, 42, 0.65) 100%)'
                            }}
                          />
                          <Stack
                            spacing={1.5}
                            sx={{
                              position: 'relative',
                              zIndex: 1,
                              height: '100%',
                              p: 2,
                              color: '#fff',
                              justifyContent: 'space-between'
                            }}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography
                                variant="caption"
                                sx={{
                                  letterSpacing: '0.2em',
                                  textTransform: 'uppercase',
                                  bgcolor: 'rgba(0,0,0,0.35)',
                                  px: 1.5,
                                  py: 0.4,
                                  borderRadius: 4
                                }}
                              >
                                Side Hustle
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  letterSpacing: '0.15em',
                                  textTransform: 'uppercase',
                                  bgcolor: isUpcoming ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0,0,0,0.35)',
                                  color: isUpcoming ? '#1f2552' : '#fff',
                                  px: 1.5,
                                  py: 0.4,
                                  borderRadius: 4
                                }}
                              >
                                {isUpcoming ? 'Scheduled' : 'Live'}
                              </Typography>
                            </Stack>

                            <Box sx={{ textAlign: 'right' }}>
                              <Typography
                                variant="caption"
                                sx={{ letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.8 }}
                              >
                                {task.tagline || 'Always On'}
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {task.title}
                              </Typography>
                              {task.summary || task.description ? (
                                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                                  {task.summary || task.description}
                                </Typography>
                              ) : null}
                              <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
                                <Box
                                  sx={{
                                    bgcolor: 'rgba(34, 197, 94, 0.9)',
                                    px: 1.4,
                                    py: 0.4,
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontWeight: 600
                                  }}
                                >
                                  {task.points || 0} BB
                                </Box>
                                {startAt && endAt ? (
                                  <Box
                                    sx={{
                                      bgcolor: 'rgba(99, 102, 241, 0.9)',
                                      px: 1.4,
                                      py: 0.4,
                                      borderRadius: 4,
                                      fontSize: 12,
                                      fontWeight: 600
                                    }}
                                  >
                                    {startAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                  </Box>
                                ) : null}
                              </Stack>
                            </Box>
                          </Stack>
                        </ButtonBase>
                      );
                    })}
                  </Box>
                )}
              </Stack>
            </Paper>

            <Paper sx={{ p: 3, bgcolor: 'var(--beartank-peach)' }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">Pitch polish sprint</Typography>
                <Typography color="text.secondary">
                  Capture a highlight update so your company timeline tells a clear story in the final deck.
                </Typography>
                <Button
                  component={RouterLink}
                  to="/student/pitch-deck"
                  variant="contained"
                  color="primary"
                >
                  Open pitch deck builder
                </Button>
              </Stack>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6">Weekly momentum</Typography>
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

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            <Paper sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h5">Team & company</Typography>
                {team ? (
                  <Stack spacing={1.5}>
                    <Alert severity="success">
                      {displayCompanyName} • {(team.memberIds || []).length} members
                    </Alert>
                    {teamMemberNames.length > 0 ? (
                      <Stack spacing={0.75}>
                        <Typography variant="subtitle2">Team members</Typography>
                        <Typography color="text.secondary">
                          {teamMemberNames.join(', ')}
                        </Typography>
                      </Stack>
                    ) : null}
                  </Stack>
                ) : pendingRequest ? (
                  <Alert severity="info">Your team request is pending approval.</Alert>
                ) : (
                  <Stack spacing={2}>
                    {requestError ? <Alert severity="error">{requestError}</Alert> : null}
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
                      label="Teammate emails (comma or newline)"
                      value={memberEmails}
                      onChange={(event) => setMemberEmails(event.target.value)}
                      multiline
                      minRows={2}
                    />
                    <Button variant="contained" color="secondary" onClick={handleTeamRequest}>
                      Request team approval
                    </Button>
                  </Stack>
                )}
              </Stack>
            </Paper>

          </Stack>
        </Grid>
      </Grid>
      {celebration ? <CelebrationConfetti /> : null}
      <Dialog open={Boolean(celebration)} onClose={closeCelebration} maxWidth="xs" fullWidth>
        <DialogTitle>{celebration?.title || 'Celebration'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography color="text.secondary">{celebration?.body}</Typography>
            {celebration?.type === 'phase' ? (
              <Typography
                variant="h3"
                sx={{ fontWeight: 800, color: 'secondary.main', fontVariantNumeric: 'tabular-nums' }}
              >
                {celebrationAmount.toLocaleString()} BB
              </Typography>
            ) : (
              <Chip
                color="secondary"
                label={`${celebrationAmount.toLocaleString()} BB earned`}
                sx={{ alignSelf: 'flex-start' }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCelebration} variant="contained" color="secondary">
            Keep building
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(sideHustlePopup)}
        onClose={() => setSideHustlePopup(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{sideHustlePopup?.title || 'Way to keep HUSTLING!'}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ pt: 1 }}>
            {sideHustlePopup?.taskTitle
              ? `${sideHustlePopup.taskTitle} is in and ready for review.`
              : 'Your side hustle is in and ready for review.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSideHustlePopup(null)} variant="contained" color="secondary">
            Keep going
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
