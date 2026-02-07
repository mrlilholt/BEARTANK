import {
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useCollection } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';

const STAGE_STATUSES = ['locked', 'active', 'complete'];

export default function TeacherStages() {
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

  const [stageForm, setStageForm] = useState({
    title: '',
    description: '',
    order: 1,
    pointsTotal: 100000,
    status: 'locked',
    unlockStageIds: []
  });
  const [taskForm, setTaskForm] = useState({
    stageId: '',
    title: '',
    description: '',
    type: 'team',
    points: 20000,
    order: 1,
    isBonus: false
  });
  const [editingStageId, setEditingStageId] = useState(null);
  const [editingStage, setEditingStage] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [error, setError] = useState('');

  const tasksByStage = useMemo(() => {
    const grouped = {};
    tasks.forEach((task) => {
      if (task.category === 'side_hustle') return;
      const key = task.stageId || 'unassigned';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(task);
    });
    return grouped;
  }, [tasks]);

  const handleStageChange = (field) => (event) => {
    setStageForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleTaskChange = (field) => (event) => {
    const value = field === 'isBonus' ? event.target.value === 'yes' : event.target.value;
    setTaskForm((prev) => ({ ...prev, [field]: value }));
  };

  const createStage = async () => {
    setError('');
    if (!stageForm.title.trim()) {
      setError('Stage title is required.');
      return;
    }

    const stageRef = await addDoc(collection(db, 'stages'), {
      title: stageForm.title.trim(),
      description: stageForm.description.trim(),
      order: Number(stageForm.order || 0),
      pointsTotal: Number(stageForm.pointsTotal || 0),
      status: stageForm.status,
      unlockStageIds: stageForm.unlockStageIds || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const teamsSnapshot = await getDocs(collection(db, 'teams'));
    const initPromises = [];
    teamsSnapshot.forEach((teamDoc) => {
      const teamId = teamDoc.id;
      const teamStageId = `${teamId}_${stageRef.id}`;
      const teamStageRef = doc(db, 'teamStages', teamStageId);
      initPromises.push(
        getDoc(teamStageRef).then((snap) => {
          if (snap.exists()) return null;
          return setDoc(teamStageRef, {
            teamId,
            stageId: stageRef.id,
            order: Number(stageForm.order || 0),
            status: 'locked',
            progress: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        })
      );
    });
    await Promise.all(initPromises);

    setStageForm({
      title: '',
      description: '',
      order: (Number(stageForm.order || 0) || 0) + 1,
      pointsTotal: stageForm.pointsTotal,
      status: 'locked',
      unlockStageIds: []
    });
  };

  const createTask = async () => {
    setError('');
    if (!taskForm.title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!taskForm.stageId) {
      setError('Select a stage for this task.');
      return;
    }

    await addDoc(collection(db, 'tasks'), {
      stageId: taskForm.stageId,
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      type: taskForm.type,
      points: Number(taskForm.points || 0),
      order: Number(taskForm.order || 0),
      isBonus: taskForm.isBonus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    setTaskForm((prev) => ({
      ...prev,
      title: '',
      description: '',
      points: prev.points,
      order: (Number(prev.order || 0) || 0) + 1
    }));
  };

  const startEditStage = (stage) => {
    setEditingStageId(stage.id);
    setEditingStage({
      title: stage.title || '',
      description: stage.description || '',
      order: stage.order || 0,
      pointsTotal: stage.pointsTotal || 0,
      status: stage.status || 'locked',
      unlockStageIds: stage.unlockStageIds || []
    });
  };

  const cancelEditStage = () => {
    setEditingStageId(null);
    setEditingStage(null);
  };

  const saveStage = async (stage) => {
    if (!editingStage?.title?.trim()) {
      setError('Stage title is required.');
      return;
    }
    await updateDoc(doc(db, 'stages', stage.id), {
      title: editingStage.title.trim(),
      description: editingStage.description.trim(),
      order: Number(editingStage.order || 0),
      pointsTotal: Number(editingStage.pointsTotal || 0),
      status: editingStage.status || 'locked',
      unlockStageIds: editingStage.unlockStageIds || [],
      updatedAt: serverTimestamp()
    });
    if (editingStage.status === 'complete') {
      const nextStage = stages
        .filter((item) => Number(item.order) > Number(editingStage.order || stage.order))
        .sort((a, b) => Number(a.order) - Number(b.order))[0];
      if (nextStage && nextStage.status === 'locked') {
        await updateDoc(doc(db, 'stages', nextStage.id), {
          status: 'active',
          updatedAt: serverTimestamp()
        });
      }
    }
    cancelEditStage();
  };

  const deleteStage = async (stageId) => {
    if (!window.confirm('Delete this stage? Tasks under it will remain but be unassigned.')) return;
    await deleteDoc(doc(db, 'stages', stageId));
  };

  const startEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditingTask({
      title: task.title || '',
      description: task.description || '',
      type: task.type || 'team',
      points: task.points || 0,
      order: task.order || 0,
      isBonus: !!task.isBonus
    });
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTask(null);
  };

  const saveTask = async (task) => {
    if (!editingTask?.title?.trim()) {
      setError('Task title is required.');
      return;
    }
    await updateDoc(doc(db, 'tasks', task.id), {
      title: editingTask.title.trim(),
      description: editingTask.description.trim(),
      type: editingTask.type,
      points: Number(editingTask.points || 0),
      order: Number(editingTask.order || 0),
      isBonus: !!editingTask.isBonus,
      updatedAt: serverTimestamp()
    });
    cancelEditTask();
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    await deleteDoc(doc(db, 'tasks', taskId));
  };

  const updateStageStatusWithUnlock = async (stage, status) => {
    await updateDoc(doc(db, 'stages', stage.id), {
      status,
      updatedAt: serverTimestamp()
    });

    if (status === 'complete') {
      const unlockIds = stage.unlockStageIds || [];
      const unlockTargets = unlockIds.length
        ? stages.filter((item) => unlockIds.includes(item.id))
        : [
            stages
              .filter((item) => Number(item.order) > Number(stage.order))
              .sort((a, b) => Number(a.order) - Number(b.order))[0]
          ].filter(Boolean);

      await Promise.all(
        unlockTargets.map((target) =>
          target && target.status === 'locked'
            ? updateDoc(doc(db, 'stages', target.id), {
                status: 'active',
                updatedAt: serverTimestamp()
              })
            : null
        )
      );
    }
  };

  return (
    <AppShell
      kicker="STAGES"
      title="Design the BEARTANK roadmap"
      subtitle="Create stages and tasks. Everything here shows up on the student dashboard."
    >
      <Stack spacing={4}>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5">Create a stage</Typography>
            {error ? <Typography color="error">{error}</Typography> : null}
            <TextField
              label="Stage title"
              value={stageForm.title}
              onChange={handleStageChange('title')}
              placeholder="Ideation"
            />
            <TextField
              label="Stage description"
              value={stageForm.description}
              onChange={handleStageChange('description')}
              placeholder="Define the problem and the product idea."
              multiline
              minRows={2}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Order"
                type="number"
                value={stageForm.order}
                onChange={handleStageChange('order')}
                sx={{ maxWidth: 140 }}
              />
              <TextField
                label="Total Bear Bucks"
                type="number"
                value={stageForm.pointsTotal}
                onChange={handleStageChange('pointsTotal')}
                sx={{ maxWidth: 200 }}
              />
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={stageForm.status}
                  onChange={handleStageChange('status')}
                >
                  {STAGE_STATUSES.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <FormControl>
              <InputLabel>Unlocks (optional)</InputLabel>
              <Select
                multiple
                label="Unlocks (optional)"
                value={stageForm.unlockStageIds}
                onChange={(event) =>
                  setStageForm((prev) => ({
                    ...prev,
                    unlockStageIds: event.target.value
                  }))
                }
                renderValue={(selected) =>
                  stages
                    .filter((stage) => selected.includes(stage.id))
                    .map((stage) => stage.title)
                    .join(', ')
                }
              >
                {stages
                  .filter((stage) => stage.id !== undefined)
                  .map((stage) => (
                    <MenuItem key={stage.id} value={stage.id}>
                      {stage.title}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <Button variant="contained" color="secondary" onClick={createStage}>
              Add stage
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5">Create a task</Typography>
            <FormControl>
              <InputLabel>Stage</InputLabel>
              <Select
                label="Stage"
                value={taskForm.stageId}
                onChange={handleTaskChange('stageId')}
              >
                {stages.map((stage) => (
                  <MenuItem key={stage.id} value={stage.id}>
                    {stage.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Task title"
              value={taskForm.title}
              onChange={handleTaskChange('title')}
              placeholder="Company Incorporation Brief"
            />
            <TextField
              label="Task description"
              value={taskForm.description}
              onChange={handleTaskChange('description')}
              multiline
              minRows={2}
            />
            <Stack direction="row" spacing={2}>
              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel>Type</InputLabel>
                <Select label="Type" value={taskForm.type} onChange={handleTaskChange('type')}>
                  <MenuItem value="team">Team</MenuItem>
                  <MenuItem value="individual">Individual</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Bear Bucks"
                type="number"
                value={taskForm.points}
                onChange={handleTaskChange('points')}
                sx={{ maxWidth: 160 }}
              />
              <TextField
                label="Order"
                type="number"
                value={taskForm.order}
                onChange={handleTaskChange('order')}
                sx={{ maxWidth: 120 }}
              />
              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel>Bonus</InputLabel>
                <Select
                  label="Bonus"
                  value={taskForm.isBonus ? 'yes' : 'no'}
                  onChange={handleTaskChange('isBonus')}
                >
                  <MenuItem value="no">Core</MenuItem>
                  <MenuItem value="yes">Bonus</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Button variant="contained" color="secondary" onClick={createTask}>
              Add task
            </Button>
          </Stack>
        </Paper>

        <Stack spacing={2}>
          <Typography variant="h5">Stages overview</Typography>
          {stages.map((stage) => (
            <Card key={stage.id}>
              <CardContent>
                <Stack spacing={1.5}>
                  {editingStageId === stage.id ? (
                    <Stack spacing={2}>
                      <TextField
                        label="Stage title"
                        value={editingStage?.title || ''}
                        onChange={(event) =>
                          setEditingStage((prev) => ({ ...prev, title: event.target.value }))
                        }
                      />
                      <TextField
                        label="Stage description"
                        value={editingStage?.description || ''}
                        onChange={(event) =>
                          setEditingStage((prev) => ({ ...prev, description: event.target.value }))
                        }
                        multiline
                        minRows={2}
                      />
                      <Stack direction="row" spacing={2}>
                        <TextField
                          label="Order"
                          type="number"
                          value={editingStage?.order || 0}
                          onChange={(event) =>
                            setEditingStage((prev) => ({ ...prev, order: event.target.value }))
                          }
                          sx={{ maxWidth: 120 }}
                        />
                        <TextField
                          label="Total Bear Bucks"
                          type="number"
                          value={editingStage?.pointsTotal || 0}
                          onChange={(event) =>
                            setEditingStage((prev) => ({
                              ...prev,
                              pointsTotal: event.target.value
                            }))
                          }
                          sx={{ maxWidth: 180 }}
                        />
                        <FormControl sx={{ minWidth: 160 }}>
                          <InputLabel>Status</InputLabel>
                          <Select
                            label="Status"
                            value={editingStage?.status || 'locked'}
                            onChange={(event) =>
                              setEditingStage((prev) => ({ ...prev, status: event.target.value }))
                            }
                          >
                            {STAGE_STATUSES.map((status) => (
                              <MenuItem key={status} value={status}>
                                {status}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Stack>
                      <FormControl>
                        <InputLabel>Unlocks (optional)</InputLabel>
                        <Select
                          multiple
                          label="Unlocks (optional)"
                          value={editingStage?.unlockStageIds || []}
                          onChange={(event) =>
                            setEditingStage((prev) => ({
                              ...prev,
                              unlockStageIds: event.target.value
                            }))
                          }
                          renderValue={(selected) =>
                            stages
                              .filter((stage) => selected.includes(stage.id))
                              .map((stage) => stage.title)
                              .join(', ')
                          }
                        >
                          {stages
                            .filter((item) => item.id !== stage.id)
                            .map((item) => (
                              <MenuItem key={item.id} value={item.id}>
                                {item.title}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                      <Stack direction="row" spacing={2}>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() => saveStage(stage)}
                        >
                          Save stage
                        </Button>
                        <Button variant="outlined" color="secondary" onClick={cancelEditStage}>
                          Cancel
                        </Button>
                        <Button variant="outlined" color="error" onClick={() => deleteStage(stage.id)}>
                          Delete stage
                        </Button>
                      </Stack>
                    </Stack>
                  ) : (
                    <>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6">{stage.title}</Typography>
                        <Chip label={stage.status || 'locked'} color="secondary" size="small" />
                        <Chip label={`${stage.pointsTotal || 0} BB`} size="small" variant="outlined" />
                      </Stack>
                      {stage.description ? (
                        <Typography color="text.secondary">{stage.description}</Typography>
                      ) : null}
                      <Stack direction="row" spacing={1}>
                        {STAGE_STATUSES.map((status) => (
                          <Button
                            key={status}
                            size="small"
                            variant={stage.status === status ? 'contained' : 'outlined'}
                            color="secondary"
                            onClick={() => updateStageStatusWithUnlock(stage, status)}
                          >
                            {status}
                          </Button>
                        ))}
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          onClick={() => startEditStage(stage)}
                        >
                          Edit
                        </Button>
                      </Stack>
                    </>
                  )}
                  <Divider />
                  <Typography variant="subtitle2">Tasks</Typography>
                  <Stack spacing={1}>
                    {(tasksByStage[stage.id] || []).map((task) =>
                      editingTaskId === task.id ? (
                        <Stack key={task.id} spacing={1.5}>
                          <TextField
                            label="Task title"
                            value={editingTask?.title || ''}
                            onChange={(event) =>
                              setEditingTask((prev) => ({ ...prev, title: event.target.value }))
                            }
                          />
                          <TextField
                            label="Task description"
                            value={editingTask?.description || ''}
                            onChange={(event) =>
                              setEditingTask((prev) => ({
                                ...prev,
                                description: event.target.value
                              }))
                            }
                            multiline
                            minRows={2}
                          />
                          <Stack direction="row" spacing={2}>
                            <FormControl sx={{ minWidth: 140 }}>
                              <InputLabel>Type</InputLabel>
                              <Select
                                label="Type"
                                value={editingTask?.type || 'team'}
                                onChange={(event) =>
                                  setEditingTask((prev) => ({ ...prev, type: event.target.value }))
                                }
                              >
                                <MenuItem value="team">Team</MenuItem>
                                <MenuItem value="individual">Individual</MenuItem>
                              </Select>
                            </FormControl>
                            <TextField
                              label="Bear Bucks"
                              type="number"
                              value={editingTask?.points || 0}
                              onChange={(event) =>
                                setEditingTask((prev) => ({
                                  ...prev,
                                  points: event.target.value
                                }))
                              }
                              sx={{ maxWidth: 160 }}
                            />
                            <TextField
                              label="Order"
                              type="number"
                              value={editingTask?.order || 0}
                              onChange={(event) =>
                                setEditingTask((prev) => ({ ...prev, order: event.target.value }))
                              }
                              sx={{ maxWidth: 120 }}
                            />
                            <FormControl sx={{ minWidth: 140 }}>
                              <InputLabel>Bonus</InputLabel>
                              <Select
                                label="Bonus"
                                value={editingTask?.isBonus ? 'yes' : 'no'}
                                onChange={(event) =>
                                  setEditingTask((prev) => ({
                                    ...prev,
                                    isBonus: event.target.value === 'yes'
                                  }))
                                }
                              >
                                <MenuItem value="no">Core</MenuItem>
                                <MenuItem value="yes">Bonus</MenuItem>
                              </Select>
                            </FormControl>
                          </Stack>
                          <Stack direction="row" spacing={2}>
                            <Button
                              size="small"
                              variant="contained"
                              color="secondary"
                              onClick={() => saveTask(task)}
                            >
                              Save task
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="secondary"
                              onClick={cancelEditTask}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => deleteTask(task.id)}
                            >
                              Delete task
                            </Button>
                          </Stack>
                        </Stack>
                      ) : (
                        <Stack key={task.id} direction="row" spacing={1} alignItems="center">
                          <Typography>{task.title}</Typography>
                          {task.isBonus ? <Chip label="Bonus" size="small" /> : null}
                          <Chip label={`${task.points || 0} BB`} size="small" variant="outlined" />
                          <Button
                            size="small"
                            variant="text"
                            color="secondary"
                            onClick={() => startEditTask(task)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            color="error"
                            onClick={() => deleteTask(task.id)}
                          >
                            Delete
                          </Button>
                        </Stack>
                      )
                    )}
                    {(!tasksByStage[stage.id] || tasksByStage[stage.id].length === 0) ? (
                      <Typography color="text.secondary">No tasks yet.</Typography>
                    ) : null}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Stack>
    </AppShell>
  );
}
