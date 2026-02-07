import {
  Alert,
  Button,
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
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useAuth } from '../lib/auth-context.jsx';
import { useCollection } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';

export default function HelpDesk() {
  const { user, role } = useAuth();
  const ticketsQuery = useMemo(() => {
    if (!user) return null;
    if (role === 'student') {
      return query(collection(db, 'helpTickets'), where('createdBy', '==', user.uid));
    }
    return query(collection(db, 'helpTickets'), orderBy('createdAt', 'desc'));
  }, [user?.uid, role]);
  const { data: tickets } = useCollection(ticketsQuery);

  const [stage, setStage] = useState('');
  const [task, setTask] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [replyById, setReplyById] = useState({});

  const createTicket = async () => {
    setError('');
    if (!message.trim()) {
      setError('Please add a message.');
      return;
    }
    await addDoc(collection(db, 'helpTickets'), {
      createdBy: user.uid,
      stage: stage.trim(),
      task: task.trim(),
      status: 'open',
      messages: [
        {
          body: message.trim(),
          senderId: user.uid,
          createdAt: serverTimestamp()
        }
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    setStage('');
    setTask('');
    setMessage('');
  };

  const sendReply = async (ticketId) => {
    const reply = replyById[ticketId];
    if (!reply || !reply.trim()) return;
    await updateDoc(doc(db, 'helpTickets', ticketId), {
      messages: arrayUnion({
        body: reply.trim(),
        senderId: user.uid,
        createdAt: serverTimestamp()
      }),
      updatedAt: serverTimestamp()
    });
    setReplyById((prev) => ({ ...prev, [ticketId]: '' }));
  };

  return (
    <AppShell
      kicker="HELP DESK"
      title="Ask for help"
      subtitle="Open a ticket tied to your current stage or task. Teachers respond in-app."
    >
      <Stack spacing={3}>
        {role === 'student' ? (
          <Paper sx={{ p: 3, maxWidth: 720 }}>
            <Stack spacing={2}>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <TextField
                label="Stage"
                placeholder="Prototype"
                value={stage}
                onChange={(event) => setStage(event.target.value)}
              />
              <TextField
                label="Task"
                placeholder="Prototype Play Test"
                value={task}
                onChange={(event) => setTask(event.target.value)}
              />
              <TextField
                label="What do you need?"
                multiline
                minRows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <Button variant="contained" color="secondary" onClick={createTicket}>
                Send request
              </Button>
            </Stack>
          </Paper>
        ) : null}

        <Stack spacing={2}>
          {tickets.length === 0 ? (
            <Paper sx={{ p: 3 }}>
              <Typography color="text.secondary">No help tickets yet.</Typography>
            </Paper>
          ) : null}
          {tickets.map((ticket) => (
            <Paper key={ticket.id} sx={{ p: 3 }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">Help request</Typography>
                <Typography color="text.secondary">
                  Stage: {ticket.stage || '—'} • Task: {ticket.task || '—'}
                </Typography>
                <Typography color="text.secondary">Status: {ticket.status}</Typography>
                {(ticket.messages || []).map((msg, index) => (
                  <Typography key={index} variant="body2" color="text.secondary">
                    {msg.body}
                  </Typography>
                ))}
                <TextField
                  label="Reply"
                  value={replyById[ticket.id] || ''}
                  onChange={(event) =>
                    setReplyById((prev) => ({ ...prev, [ticket.id]: event.target.value }))
                  }
                  multiline
                  minRows={2}
                />
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => sendReply(ticket.id)}
                >
                  Send reply
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </AppShell>
  );
}
