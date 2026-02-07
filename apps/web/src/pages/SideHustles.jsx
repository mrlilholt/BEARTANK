import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { useMemo, useState } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AppShell from '../components/AppShell.jsx';
import { useCollection } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';

export default function SideHustles() {
  const sideHustleQuery = useMemo(
    () => query(collection(db, 'tasks'), orderBy('createdAt', 'desc')),
    []
  );
  const { data: tasks } = useCollection(sideHustleQuery);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagline, setTagline] = useState('');
  const [summary, setSummary] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [points, setPoints] = useState(750000);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({
    title: '',
    description: '',
    tagline: '',
    summary: '',
    imageUrl: '',
    imageDataUrl: '',
    points: 0,
    startAt: '',
    endAt: ''
  });

  const sideHustles = tasks.filter((task) => task.category === 'side_hustle');

  const toInputDateTime = (dateValue) => {
    if (!dateValue) return '';
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const handleCreate = async () => {
    setError('');
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!startAt || !endAt) {
      setError('Start and end time are required.');
      return;
    }

    await addDoc(collection(db, 'tasks'), {
      category: 'side_hustle',
      title: title.trim(),
      description: description.trim(),
      tagline: tagline.trim(),
      summary: summary.trim(),
      imageUrl: imageUrl.trim(),
      imageDataUrl: imageDataUrl || '',
      points: Number(points || 0),
      type: 'team',
      isBonus: true,
      schedule: {
        startAt: new Date(startAt),
        endAt: new Date(endAt)
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    setTitle('');
    setDescription('');
    setTagline('');
    setSummary('');
    setImageUrl('');
    setImageDataUrl('');
    setPoints(points);
    setStartAt('');
    setEndAt('');
  };

  const startEdit = (task) => {
    setEditingId(task.id);
    setEditDraft({
      title: task.title || '',
      description: task.description || '',
      tagline: task.tagline || '',
      summary: task.summary || '',
      imageUrl: task.imageUrl || '',
      imageDataUrl: task.imageDataUrl || '',
      points: task.points || 0,
      startAt: toInputDateTime(task.schedule?.startAt),
      endAt: toInputDateTime(task.schedule?.endAt)
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({
      title: '',
      description: '',
      tagline: '',
      summary: '',
      imageUrl: '',
      imageDataUrl: '',
      points: 0,
      startAt: '',
      endAt: ''
    });
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 350 * 1024) {
      setError('Image is too large. Keep it under 350KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(String(reader.result || ''));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleEditImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 350 * 1024) {
      setError('Image is too large. Keep it under 350KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditDraft((prev) => ({ ...prev, imageDataUrl: String(reader.result || '') }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const saveEdit = async (task) => {
    await updateDoc(doc(db, 'tasks', task.id), {
      title: editDraft.title.trim(),
      description: editDraft.description.trim(),
      tagline: editDraft.tagline.trim(),
      summary: editDraft.summary.trim(),
      imageUrl: editDraft.imageUrl.trim(),
      imageDataUrl: editDraft.imageDataUrl || '',
      points: Number(editDraft.points || 0),
      schedule: {
        startAt: editDraft.startAt ? new Date(editDraft.startAt) : null,
        endAt: editDraft.endAt ? new Date(editDraft.endAt) : null
      },
      updatedAt: serverTimestamp()
    });
    cancelEdit();
  };

  const deleteSideHustle = async (taskId) => {
    if (!window.confirm('Delete this side hustle?')) return;
    await deleteDoc(doc(db, 'tasks', taskId));
  };

  return (
    <AppShell
      kicker="SIDE HUSTLES"
      title="Schedule morning sprints"
      subtitle="Recurring mini projects boost Bear Bucks and keep energy high."
    >
      <Stack spacing={2}>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Create side hustle</Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Brand Name Blitz"
            />
            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              multiline
              minRows={2}
            />
            <TextField
              label="Tagline"
              value={tagline}
              onChange={(event) => setTagline(event.target.value)}
              placeholder="ALWAYS ON"
            />
            <TextField
              label="Card summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Short teaser for the card"
            />
            <TextField
              label="Image URL (optional)"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Button component="label" variant="outlined" color="secondary">
                Upload card image
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  hidden
                  onChange={handleImageUpload}
                />
              </Button>
              <Typography variant="caption" color="text.secondary">
                600×300 PNG, under 350KB.
              </Typography>
              {imageDataUrl ? (
                <Box
                  component="img"
                  src={imageDataUrl}
                  alt="Side hustle preview"
                  sx={{
                    width: 120,
                    height: 60,
                    objectFit: 'cover',
                    borderRadius: 2,
                    border: '1px solid #e5e9f5'
                  }}
                />
              ) : null}
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Start time"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
              />
              <TextField
                label="End time"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
              />
            </Stack>
            <TextField
              label="Bear Bucks"
              type="number"
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              sx={{ maxWidth: 200 }}
            />
            <Button variant="contained" color="secondary" onClick={handleCreate}>
              Schedule side hustle
            </Button>
          </Stack>
        </Paper>

        {sideHustles.map((task) => (
          <Paper key={task.id} sx={{ p: 3 }}>
            {editingId === task.id ? (
              <Stack spacing={2}>
                <TextField
                  label="Title"
                  value={editDraft.title}
                  onChange={(event) =>
                    setEditDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
                <TextField
                  label="Description"
                  value={editDraft.description}
                  onChange={(event) =>
                    setEditDraft((prev) => ({ ...prev, description: event.target.value }))
                  }
                  multiline
                  minRows={2}
                />
                <TextField
                  label="Tagline"
                  value={editDraft.tagline}
                  onChange={(event) =>
                    setEditDraft((prev) => ({ ...prev, tagline: event.target.value }))
                  }
                />
                <TextField
                  label="Card summary"
                  value={editDraft.summary}
                  onChange={(event) =>
                    setEditDraft((prev) => ({ ...prev, summary: event.target.value }))
                  }
                />
                <TextField
                  label="Image URL (optional)"
                  value={editDraft.imageUrl}
                  onChange={(event) =>
                    setEditDraft((prev) => ({ ...prev, imageUrl: event.target.value }))
                  }
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <Button component="label" variant="outlined" color="secondary">
                    Upload card image
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      hidden
                      onChange={handleEditImageUpload}
                    />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    600×300 PNG, under 350KB.
                  </Typography>
                  {editDraft.imageDataUrl ? (
                    <Box
                      component="img"
                      src={editDraft.imageDataUrl}
                      alt="Side hustle preview"
                      sx={{
                        width: 120,
                        height: 60,
                        objectFit: 'cover',
                        borderRadius: 2,
                        border: '1px solid #e5e9f5'
                      }}
                    />
                  ) : null}
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Start time"
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                    value={editDraft.startAt}
                    onChange={(event) =>
                      setEditDraft((prev) => ({ ...prev, startAt: event.target.value }))
                    }
                  />
                  <TextField
                    label="End time"
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                    value={editDraft.endAt}
                    onChange={(event) =>
                      setEditDraft((prev) => ({ ...prev, endAt: event.target.value }))
                    }
                  />
                </Stack>
                <TextField
                  label="Bear Bucks"
                  type="number"
                  value={editDraft.points}
                  onChange={(event) =>
                    setEditDraft((prev) => ({ ...prev, points: event.target.value }))
                  }
                  sx={{ maxWidth: 200 }}
                />
                <Stack direction="row" spacing={2}>
                  <Button variant="contained" color="secondary" onClick={() => saveEdit(task)}>
                    Save
                  </Button>
                  <Button variant="outlined" color="secondary" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">{task.title}</Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton onClick={() => startEdit(task)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => deleteSideHustle(task.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Stack>
                  <Box
                    sx={{
                      minHeight: 170,
                      borderRadius: 2,
                      overflow: 'hidden',
                      position: 'relative',
                      border: '1px solid #eef1f7',
                      boxShadow: '0 12px 24px rgba(31, 37, 82, 0.08)',
                      backgroundImage: task.imageDataUrl
                        ? `url(${task.imageDataUrl})`
                        : task.imageUrl
                        ? `url(${task.imageUrl})`
                        : 'linear-gradient(135deg, #6c63ff 0%, #ff8a7a 100%)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
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
                      p: 2.5,
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
                          bgcolor: 'rgba(255, 255, 255, 0.85)',
                          color: '#1f2552',
                          px: 1.5,
                          py: 0.4,
                          borderRadius: 4
                        }}
                      >
                        {(task.tagline || 'Always On').toUpperCase()}
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
                        {task.schedule?.startAt?.toDate?.() ? (
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
                            {task.schedule.startAt.toDate().toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </Box>
                        ) : null}
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
                <Typography color="text.secondary">
                  {task.schedule?.startAt?.toDate?.().toLocaleString?.() || 'Start'} -{' '}
                  {task.schedule?.endAt?.toDate?.().toLocaleString?.() || 'End'}
                </Typography>
              </Stack>
            )}
          </Paper>
        ))}
        {sideHustles.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary">No side hustles scheduled yet.</Typography>
          </Paper>
        ) : null}
      </Stack>
    </AppShell>
  );
}
