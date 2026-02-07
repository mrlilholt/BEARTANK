import {
  Alert,
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
  doc,
  deleteDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { useMemo, useState } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AppShell from '../components/AppShell.jsx';
import { useAuth } from '../lib/auth-context.jsx';
import { useCollection } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';

export default function Announcements() {
  const { role } = useAuth();
  const announcementsQuery = useMemo(
    () => query(collection(db, 'announcements'), orderBy('createdAt', 'desc')),
    []
  );
  const { data: announcements } = useCollection(announcementsQuery);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editScheduledFor, setEditScheduledFor] = useState('');

  const toInputDateTime = (dateValue) => {
    if (!dateValue) return '';
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const notifyStudents = async (announcementId, announcementTitle, announcementBody) => {
    const usersSnapshot = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'student'))
    );

    const writes = [];
    usersSnapshot.forEach((docSnap) => {
      const userData = docSnap.data();
      if (userData.status !== 'active') return;
      writes.push(
        addDoc(collection(db, 'notifications'), {
          userId: docSnap.id,
          title: announcementTitle,
          message: announcementBody,
          link: '/student/announcements',
          type: 'announcement',
          sourceId: announcementId,
          read: false,
          createdAt: serverTimestamp()
        })
      );
    });

    await Promise.all(writes);
  };

  const handleCreate = async () => {
    setError('');
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    const scheduledAt = scheduledFor ? new Date(scheduledFor) : null;

    const announcementRef = await addDoc(collection(db, 'announcements'), {
      title: title.trim(),
      body: body.trim(),
      scheduledFor: scheduledAt || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    if (!scheduledAt || scheduledAt.getTime() <= Date.now()) {
      await notifyStudents(announcementRef.id, title.trim(), body.trim());
    }

    setTitle('');
    setBody('');
    setScheduledFor('');
  };

  const startEdit = (announcement) => {
    setEditingId(announcement.id);
    setEditTitle(announcement.title || '');
    setEditBody(announcement.body || '');
    setEditScheduledFor(toInputDateTime(announcement.scheduledFor));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditBody('');
    setEditScheduledFor('');
  };

  const saveEdit = async (announcement) => {
    const scheduledAt = editScheduledFor ? new Date(editScheduledFor) : null;
    await updateDoc(doc(db, 'announcements', announcement.id), {
      title: editTitle.trim(),
      body: editBody.trim(),
      scheduledFor: scheduledAt || null,
      updatedAt: serverTimestamp()
    });
    cancelEdit();
  };

  const deleteAnnouncement = async (announcementId) => {
    if (!window.confirm('Delete this announcement?')) return;
    await deleteDoc(doc(db, 'announcements', announcementId));
  };

  const now = Date.now();
  const visibleAnnouncements =
    role === 'student'
      ? announcements.filter((item) => !item.scheduledFor || item.scheduledFor.toDate?.() <= now)
      : announcements;

  return (
    <AppShell
      kicker="ANNOUNCEMENTS"
      title="Tank updates"
      subtitle="Scheduled announcements and immediate alerts live here."
    >
      <Stack spacing={2}>
        {role !== 'student' ? (
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Create announcement</Typography>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <TextField
                label="Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <TextField
                label="Message"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                multiline
                minRows={3}
              />
              <TextField
                label="Schedule (optional)"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
              />
              <Button variant="contained" color="secondary" onClick={handleCreate}>
                Post announcement
              </Button>
            </Stack>
          </Paper>
        ) : null}

        {visibleAnnouncements.map((item) => (
          <Paper key={item.id} sx={{ p: 3 }}>
            {role !== 'student' && editingId === item.id ? (
              <Stack spacing={2}>
                <TextField
                  label="Title"
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                />
                <TextField
                  label="Message"
                  value={editBody}
                  onChange={(event) => setEditBody(event.target.value)}
                  multiline
                  minRows={3}
                />
                <TextField
                  label="Schedule (optional)"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={editScheduledFor}
                  onChange={(event) => setEditScheduledFor(event.target.value)}
                />
                <Stack direction="row" spacing={2}>
                  <Button variant="contained" color="secondary" onClick={() => saveEdit(item)}>
                    Save
                  </Button>
                  <Button variant="outlined" color="secondary" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">{item.title}</Typography>
                  {role !== 'student' ? (
                    <Stack direction="row" spacing={1}>
                      <IconButton onClick={() => startEdit(item)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => deleteAnnouncement(item.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  ) : null}
                </Stack>
                <Typography color="text.secondary">{item.body}</Typography>
                {item.scheduledFor ? (
                  <Typography variant="caption" color="text.secondary">
                    Scheduled for {item.scheduledFor.toDate?.().toLocaleString?.()}
                  </Typography>
                ) : null}
              </Stack>
            )}
          </Paper>
        ))}
        {visibleAnnouncements.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary">No announcements yet.</Typography>
          </Paper>
        ) : null}
      </Stack>
    </AppShell>
  );
}
