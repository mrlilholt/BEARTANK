import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import {
  addDoc,
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useAuth } from '../lib/auth-context.jsx';
import { useCollection, useDocument } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';
import html2canvas from 'html2canvas';

const emptyArray = [];

export default function CompanyProfile() {
  const { profile, user } = useAuth();
  const teamRef = useMemo(() => (profile?.teamId ? doc(db, 'teams', profile.teamId) : null), [profile?.teamId]);
  const { data: team } = useDocument(teamRef);

  const teamProfileRef = useMemo(
    () => (profile?.teamId ? doc(db, 'teamProfiles', profile.teamId) : null),
    [profile?.teamId]
  );
  const { data: teamProfile } = useDocument(teamProfileRef);

  const stagesQuery = useMemo(
    () => query(collection(db, 'stages'), orderBy('order', 'asc')),
    []
  );
  const { data: stages } = useCollection(stagesQuery);

  const tasksQuery = useMemo(
    () => query(collection(db, 'tasks'), orderBy('order', 'asc')),
    []
  );
  const { data: tasks } = useCollection(tasksQuery);

  const teamStagesQuery = useMemo(() => {
    if (!profile?.teamId) return null;
    return query(
      collection(db, 'teamStages'),
      where('teamId', '==', profile.teamId),
      orderBy('order', 'asc')
    );
  }, [profile?.teamId]);
  const { data: teamStages } = useCollection(teamStagesQuery);

  const submissionsQuery = useMemo(() => {
    if (!profile?.teamId) return null;
    return query(collection(db, 'submissions'), where('teamId', '==', profile.teamId));
  }, [profile?.teamId]);
  const { data: submissions } = useCollection(submissionsQuery);

  const brandKitQuery = useMemo(() => {
    if (!user) return null;
    if (profile?.teamId) {
      return query(
        collection(db, 'submissions'),
        where('teamId', '==', profile.teamId),
        where('taskType', '==', 'brand_kit')
      );
    }
    return query(
      collection(db, 'submissions'),
      where('userId', '==', user.uid),
      where('taskType', '==', 'brand_kit')
    );
  }, [profile?.teamId, user?.uid]);
  const { data: brandKitSubmissions } = useCollection(brandKitQuery);

  const membersQuery = useMemo(() => {
    const memberIds = team?.memberIds || emptyArray;
    if (memberIds.length === 0 || memberIds.length > 10) return null;
    return query(collection(db, 'users'), where('__name__', 'in', memberIds));
  }, [team?.memberIds]);
  const { data: memberProfiles } = useCollection(membersQuery);

  const pitchQuery = useMemo(() => {
    if (!profile?.teamId) return null;
    return query(collection(db, 'pitchDecks'), where('teamId', '==', profile.teamId));
  }, [profile?.teamId]);
  const { data: pitchDecks } = useCollection(pitchQuery);
  const pitch = pitchDecks[0];

  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [mission, setMission] = useState('');
  const [brandNotice, setBrandNotice] = useState('');
  const [brandError, setBrandError] = useState('');
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [timelineLayout, setTimelineLayout] = useState('vertical');
  const [timelineStyle, setTimelineStyle] = useState('soft');
  const timelineRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const latestBrandKit = useMemo(() => {
    if (!brandKitSubmissions.length) return null;
    return [...brandKitSubmissions].sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const bTime = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    })[0];
  }, [brandKitSubmissions]);
  const brandStatus = latestBrandKit?.status || null;
  const brandFeedback = latestBrandKit?.feedback?.note || '';
  const brandStatusLabel = brandStatus === 'submitted'
    ? 'In review'
    : brandStatus === 'needs_changes'
    ? 'Needs edits'
    : brandStatus === 'approved'
    ? 'Approved'
    : 'Not submitted';
  const brandStatusColor =
    brandStatus === 'approved'
      ? 'success'
      : brandStatus === 'needs_changes'
      ? 'warning'
      : brandStatus === 'submitted'
      ? 'info'
      : 'default';

  useEffect(() => {
    if (latestBrandKit && latestBrandKit.status !== 'approved') {
      setBrandName(latestBrandKit.content?.companyName || '');
      setLogoUrl(latestBrandKit.content?.logoUrl || '');
      setLogoDataUrl(latestBrandKit.content?.logoDataUrl || '');
      setMission(latestBrandKit.content?.mission || '');
      return;
    }
    if (!teamProfile) return;
    setBrandName(teamProfile.companyName || '');
    setLogoUrl(teamProfile.logoUrl || '');
    setLogoDataUrl(teamProfile.logoDataUrl || '');
    setMission(teamProfile.mission || '');
  }, [teamProfile?.id, latestBrandKit?.id, latestBrandKit?.status]);

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 350 * 1024) {
      setBrandError('Logo file is too large. Please keep it under 350KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(String(reader.result || ''));
      setBrandError('');
    };
    reader.readAsDataURL(file);
  };

  const handleBrandSave = async () => {
    if (!user) return;
    setBrandError('');
    setBrandNotice('');
    if (brandStatus === 'submitted') {
      setBrandError('Your brand kit is already in review.');
      return;
    }
    const payload = {
      taskTitle: 'Brand kit',
      taskType: 'brand_kit',
      taskPoints: 0,
      stageId: null,
      teamId: profile?.teamId || null,
      userId: user.uid,
      submittedBy: user.uid,
      status: 'submitted',
      content: {
        companyName: brandName.trim(),
        logoUrl: logoUrl.trim(),
        logoDataUrl: logoDataUrl || '',
        mission: mission.trim()
      },
      updatedAt: serverTimestamp()
    };

    if (latestBrandKit && brandStatus === 'needs_changes') {
      await updateDoc(doc(db, 'submissions', latestBrandKit.id), payload);
    } else {
      await addDoc(collection(db, 'submissions'), {
        ...payload,
        createdAt: serverTimestamp()
      });
    }
    setBrandNotice(
      profile?.teamId
        ? 'Submitted for approval.'
        : 'Submitted for approval. A solo team will be created once approved.'
    );
  };

  const stageMap = useMemo(() => {
    const map = new Map();
    stages.forEach((stage) => map.set(stage.id, stage));
    return map;
  }, [stages]);

  const tasksByStage = useMemo(() => {
    const grouped = {};
    tasks
      .filter((task) => task.category !== 'side_hustle')
      .forEach((task) => {
        if (!grouped[task.stageId]) grouped[task.stageId] = [];
        grouped[task.stageId].push(task);
      });
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    });
    return grouped;
  }, [tasks]);

  const approvedSubmissions = submissions.filter((submission) => submission.status === 'approved');

  const submissionsByTask = useMemo(() => {
    const grouped = {};
    approvedSubmissions.forEach((submission) => {
      if (!grouped[submission.taskId]) grouped[submission.taskId] = [];
      grouped[submission.taskId].push(submission);
    });
    return grouped;
  }, [approvedSubmissions]);

  const memberIdSet = new Set(team?.memberIds || []);

  const stageChecklist = stages.map((stage) => {
    const teamStage = teamStages.find((item) => item.stageId === stage.id);
    const stageTasks = tasksByStage[stage.id] || [];
    const totalTasks = stageTasks.filter((task) => !task.isBonus).length;
    let completed = 0;
    stageTasks.forEach((task) => {
      if (task.isBonus) return;
      const taskSubs = submissionsByTask[task.id] || [];
      if (task.type === 'team') {
        if (taskSubs.length > 0) completed += 1;
      } else {
        const approvedIds = new Set(taskSubs.map((sub) => sub.userId).filter(Boolean));
        if (memberIdSet.size > 0 && Array.from(memberIdSet).every((id) => approvedIds.has(id))) {
          completed += 1;
        }
      }
    });
    const progress = totalTasks === 0 ? 0 : Math.round((completed / totalTasks) * 100);
    return {
      stage,
      teamStage,
      progress,
      completed,
      totalTasks,
      tasks: stageTasks
    };
  });

  const timelineEntries = useMemo(() => {
    const entries = approvedSubmissions
      .map((submission) => {
        const stage = stageMap.get(submission.stageId);
        const task = tasks.find((item) => item.id === submission.taskId);
        const date = submission.reviewedAt?.toDate?.() || submission.updatedAt?.toDate?.() || submission.createdAt?.toDate?.();
        const author = memberProfiles.find((member) => member.id === submission.userId);
        const stageId = submission.stageId || stage?.id || null;
        return {
          id: submission.id,
          stageId,
          stageTitle: stage?.title || 'Stage',
          taskTitle: task?.title || submission.taskTitle || 'Task',
          note: submission.content?.timelineNote || submission.content?.reflection || '',
          date,
          points: submission.pointsAwarded ?? submission.taskPoints ?? 0,
          author: author?.profile?.preferredName || author?.profile?.fullName || author?.email || null
        };
      })
      .filter((entry) => entry.note)
      .sort((a, b) => (a.date?.getTime?.() || 0) - (b.date?.getTime?.() || 0));
    return entries;
  }, [approvedSubmissions, stageMap, tasks, memberProfiles]);

  const displayCompanyName = teamProfile?.companyName || team?.companyName || 'Your Company';

  const orderedStages = useMemo(() => {
    return [...stages].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }, [stages]);

  const stageOrderMap = useMemo(() => {
    const map = new Map();
    orderedStages.forEach((stage, index) => {
      map.set(stage.id, index);
    });
    return map;
  }, [orderedStages]);

  const stageCount = orderedStages.length;
  const startColor = '#34d399';
  const midColor = '#6c63ff';
  const finishColor = '#ff6f61';
  const lineGradient = `linear-gradient(180deg, ${startColor} 0%, ${finishColor} 100%)`;
  const lineGradientHorizontal = `linear-gradient(90deg, ${startColor} 0%, ${finishColor} 100%)`;

  const getStageStyle = (stageId) => {
    if (!stageCount) {
      return { dot: midColor, label: 'Milestone' };
    }
    const index = stageOrderMap.get(stageId) ?? 0;
    const isStart = index === 0;
    const isFinish = index === stageCount - 1;
    return {
      dot: isStart ? startColor : isFinish ? finishColor : midColor,
      label: isStart ? 'Start' : isFinish ? 'Finish' : `Stage ${index + 1}`
    };
  };

  const timelineStyles = {
    soft: {
      line: '#e0e5f2',
      dot: '#6c63ff',
      cardBg: '#ffffff',
      cardBorder: '#eef1f7',
      chipVariant: 'outlined'
    },
    bold: {
      line: '#1f2552',
      dot: '#ff6f61',
      cardBg: '#fff5f1',
      cardBorder: '#f6d7cf',
      chipVariant: 'filled'
    },
    clean: {
      line: '#dfe6f5',
      dot: '#5b6cff',
      cardBg: '#ffffff',
      cardBorder: '#e9ecf5',
      chipVariant: 'outlined'
    }
  };
  const timelineTheme = timelineStyles[timelineStyle] || timelineStyles.soft;

  const handleExportTimeline = async () => {
    if (!timelineRef.current) return;
    setExporting(true);
    try {
      const element = timelineRef.current;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        width: element.scrollWidth || element.offsetWidth,
        height: element.scrollHeight || element.offsetHeight,
        windowWidth: element.scrollWidth || element.offsetWidth,
        windowHeight: element.scrollHeight || element.offsetHeight
      });
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      link.download = `${displayCompanyName.replace(/\s+/g, '-').toLowerCase()}-timeline-${date}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell
      kicker="COMPANY PROFILE"
      title={displayCompanyName}
      subtitle="Everything your team builds will show up here. Use this page as your business plan hub."
    >
      {!team ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            Your team hasn’t been approved yet. Once approved, you’ll see your company profile and timeline here.
          </Typography>
        </Paper>
      ) : null}
      <Stack spacing={3}>
        <Paper sx={{ p: 3 }}>
          <Stack
            spacing={2}
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ md: 'center' }}
            sx={{ position: 'relative' }}
          >
            <IconButton
              onClick={() => setBrandModalOpen(true)}
              aria-label="Edit brand kit"
              sx={{ position: 'absolute', top: 0, right: 0 }}
            >
              <EditRoundedIcon />
            </IconButton>
            <Avatar
              src={logoDataUrl || logoUrl || teamProfile?.logoDataUrl || teamProfile?.logoUrl || undefined}
              alt={displayCompanyName}
              variant="rounded"
              sx={{ width: 120, height: 120, bgcolor: 'secondary.main', color: '#0f1b2d' }}
            >
              {displayCompanyName.slice(0, 2).toUpperCase()}
            </Avatar>
            <Stack spacing={1} sx={{ flex: 1 }}>
              <Typography variant="overline" sx={{ letterSpacing: '0.3em' }}>
                BUSINESS IDENTITY
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <Typography variant="h3">{displayCompanyName}</Typography>
                <Chip label={brandStatusLabel} color={brandStatusColor} size="small" />
              </Stack>
              {teamProfile?.mission ? (
                <Typography color="text.secondary">{teamProfile.mission}</Typography>
              ) : null}
              <Typography color="text.secondary">
                {team?.memberIds?.length || 1} team members • Bear Bucks powered
              </Typography>
            </Stack>
          </Stack>
        </Paper>
        <Dialog
          open={brandModalOpen}
          onClose={() => setBrandModalOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Brand kit</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {!profile?.teamId ? (
                <Alert severity="info">
                  You do not have a team yet. Submitting a brand kit will create a solo team after
                  approval.
                </Alert>
              ) : null}
              {brandNotice ? <Alert severity="info">{brandNotice}</Alert> : null}
              {brandStatus === 'submitted' ? (
                <Alert severity="warning">Brand kit is in review.</Alert>
              ) : null}
              {brandStatus === 'needs_changes' ? (
                <Alert severity="error">
                  Needs changes{brandFeedback ? `: ${brandFeedback}` : '.'}
                </Alert>
              ) : null}
              {brandError ? <Alert severity="error">{brandError}</Alert> : null}
              <TextField
                label="Company name"
                value={brandName}
                onChange={(event) => setBrandName(event.target.value)}
                placeholder={displayCompanyName}
              />
              <TextField
                label="Mission statement"
                value={mission}
                onChange={(event) => setMission(event.target.value)}
                placeholder="What is your company building and why does it matter?"
                multiline
                minRows={2}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <Avatar
                  src={logoDataUrl || logoUrl || undefined}
                  alt={brandName || displayCompanyName}
                  variant="rounded"
                  sx={{ width: 88, height: 88, bgcolor: 'secondary.main', color: '#0f1b2d' }}
                >
                  {(brandName || displayCompanyName).slice(0, 2).toUpperCase()}
                </Avatar>
                <Stack spacing={0.5} alignItems={{ xs: 'flex-start', sm: 'flex-start' }}>
                  <Button component="label" variant="outlined" color="secondary">
                    Upload logo (PNG/JPG)
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      hidden
                      onChange={handleLogoUpload}
                    />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Create a 500px × 500px PNG in Canva, download it, and keep it under 350KB.
                  </Typography>
                </Stack>
              </Stack>
              <TextField
                label="Company logo link (optional)"
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                placeholder="https://drive.google.com/..."
              />
              <Typography variant="caption" color="text.secondary">
                Tip: You can also paste a shareable Drive/Canva link.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setBrandModalOpen(false)} variant="outlined" color="secondary">
              Close
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleBrandSave}
              disabled={brandStatus === 'submitted'}
            >
              {brandStatus === 'needs_changes' ? 'Resubmit brand kit' : 'Submit for approval'}
            </Button>
          </DialogActions>
        </Dialog>

        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5">Pitch deck</Typography>
            {pitch?.slidesLink ? (
              <Stack spacing={1}>
                <Typography color="text.secondary">Slides: {pitch.slidesLink}</Typography>
                {pitch.canvaLink ? (
                  <Typography color="text.secondary">Canva: {pitch.canvaLink}</Typography>
                ) : null}
              </Stack>
            ) : (
              <Typography color="text.secondary">No pitch deck link yet.</Typography>
            )}
          </Stack>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5">Phase checklist</Typography>
            {stageChecklist.map((item) => (
              <Card key={item.stage.id} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6">{item.stage.title}</Typography>
                      <Chip label={item.teamStage?.status || 'locked'} color="secondary" />
                    </Stack>
                    <LinearProgress variant="determinate" value={item.progress} />
                    <Typography variant="caption" color="text.secondary">
                      {item.completed}/{item.totalTasks} core tasks complete
                    </Typography>
                    <Divider />
                    <Stack spacing={1}>
                      {item.tasks.map((task) => {
                        const taskSubs = submissionsByTask[task.id] || [];
                        const isComplete = task.type === 'team'
                          ? taskSubs.length > 0
                          : memberIdSet.size > 0 && Array.from(memberIdSet).every((id) =>
                              taskSubs.some((sub) => sub.userId === id)
                            );
                        return (
                          <Stack key={task.id} direction="row" justifyContent="space-between" alignItems="center">
                            <Typography>{task.title}</Typography>
                            <Chip
                              label={isComplete ? 'Complete' : task.isBonus ? 'Bonus' : 'Pending'}
                              color={isComplete ? 'success' : 'default'}
                              size="small"
                            />
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5">Company timeline</Typography>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ md: 'center' }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <ToggleButtonGroup
                  value={timelineLayout}
                  exclusive
                  size="small"
                  onChange={(_, next) => {
                    if (next) setTimelineLayout(next);
                  }}
                >
                  <ToggleButton value="vertical">Vertical</ToggleButton>
                  <ToggleButton value="horizontal">Horizontal</ToggleButton>
                </ToggleButtonGroup>
                <ToggleButtonGroup
                  value={timelineStyle}
                  exclusive
                  size="small"
                  onChange={(_, next) => {
                    if (next) setTimelineStyle(next);
                  }}
                >
                  <ToggleButton value="soft">Soft</ToggleButton>
                  <ToggleButton value="clean">Clean</ToggleButton>
                  <ToggleButton value="bold">Bold</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleExportTimeline}
                disabled={exporting || timelineEntries.length === 0}
              >
                {exporting ? 'Exporting...' : 'Export PNG'}
              </Button>
            </Stack>
            {timelineEntries.length === 0 ? (
              <Typography color="text.secondary">No timeline entries yet. Add a task summary to build your timeline.</Typography>
            ) : (
              timelineLayout === 'vertical' ? (
                <Box ref={timelineRef} sx={{ position: 'relative', pl: 4, pr: 2 }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 18,
                      top: 12,
                      bottom: 12,
                      width: 2,
                      background: lineGradient
                    }}
                  />
                  <Stack spacing={3}>
                    {timelineEntries.map((entry) => (
                      (() => {
                        const stageStyle = getStageStyle(entry.stageId);
                        return (
                      <Stack
                        key={entry.id}
                        direction="row"
                        spacing={2}
                        alignItems="flex-start"
                      >
                        <Box sx={{ width: 36, display: 'flex', justifyContent: 'center' }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: stageStyle.dot,
                              boxShadow: '0 0 0 4px #f6f7fb'
                            }}
                          />
                        </Box>
                        <Paper
                          sx={{
                            p: 2.5,
                            flex: 1,
                            bgcolor: timelineTheme.cardBg,
                            border: `1px solid ${timelineTheme.cardBorder}`
                          }}
                        >
                          <Stack spacing={1}>
                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              spacing={1}
                              justifyContent="space-between"
                              alignItems={{ sm: 'center' }}
                            >
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {entry.stageTitle} • {entry.taskTitle}
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  size="small"
                                  label={stageStyle.label}
                                  sx={{
                                    bgcolor: stageStyle.dot,
                                    color: '#fff',
                                    fontWeight: 600
                                  }}
                                />
                                <Chip
                                  size="small"
                                  label={`+${entry.points} BB`}
                                  color="secondary"
                                  variant={timelineTheme.chipVariant}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {entry.date
                                    ? entry.date.toLocaleString([], {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit'
                                      })
                                    : ''}
                                </Typography>
                              </Stack>
                            </Stack>
                            <Typography color="text.secondary">{entry.note}</Typography>
                            {entry.author ? (
                              <Typography variant="caption" color="text.secondary">
                                By {entry.author}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Paper>
                      </Stack>
                        );
                      })()
                    ))}
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ position: 'relative', overflowX: 'auto', pb: 2 }}>
                  <Box
                    ref={timelineRef}
                    sx={{
                      position: 'relative',
                      pr: 2,
                      minWidth: timelineEntries.length * 260
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 20,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: lineGradientHorizontal
                      }}
                    />
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 2,
                        pt: 4
                      }}
                    >
                    {timelineEntries.map((entry) => {
                      const stageStyle = getStageStyle(entry.stageId);
                      return (
                      <Box key={entry.id} sx={{ width: 250 }}>
                        <Stack spacing={1.5} alignItems="flex-start">
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: stageStyle.dot,
                              boxShadow: '0 0 0 4px #f6f7fb'
                            }}
                          />
                          <Paper
                            sx={{
                              p: 2,
                              bgcolor: timelineTheme.cardBg,
                              border: `1px solid ${timelineTheme.cardBorder}`
                            }}
                          >
                            <Stack spacing={1}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {entry.stageTitle} • {entry.taskTitle}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {entry.date
                                  ? entry.date.toLocaleString([], {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit'
                                    })
                                  : ''}
                              </Typography>
                              <Typography color="text.secondary">{entry.note}</Typography>
                              <Chip
                                size="small"
                                label={stageStyle.label}
                                sx={{
                                  bgcolor: stageStyle.dot,
                                  color: '#fff',
                                  fontWeight: 600
                                }}
                              />
                              <Chip
                                size="small"
                                label={`+${entry.points} BB`}
                                color="secondary"
                                variant={timelineTheme.chipVariant}
                              />
                            </Stack>
                          </Paper>
                        </Stack>
                      </Box>
                      );
                    })}
                    </Box>
                  </Box>
                </Box>
              )
            )}
          </Stack>
        </Paper>
      </Stack>
    </AppShell>
  );
}
