import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import { collection, doc, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { useMemo } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useAuth } from '../lib/auth-context.jsx';
import { useCollection } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';

export default function Notifications() {
  const { user } = useAuth();
  const notificationsQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [user?.uid]);
  const { data: notifications } = useCollection(notificationsQuery);

  const markRead = async (notificationId) => {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  };

  const markAllRead = async () => {
    const unread = notifications.filter((item) => !item.read);
    await Promise.all(unread.map((item) => updateDoc(doc(db, 'notifications', item.id), { read: true })));
  };

  return (
    <AppShell
      kicker="NOTIFICATIONS"
      title="Your updates"
      subtitle="Approvals, announcements, and progress alerts show up here."
    >
      <Stack spacing={2}>
        {notifications.length > 0 ? (
          <Button variant="outlined" color="secondary" onClick={markAllRead}>
            Mark all as read
          </Button>
        ) : null}
        {notifications.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary">No notifications yet.</Typography>
          </Paper>
        ) : null}
        {notifications.map((item) => (
          <Paper key={item.id} sx={{ p: 3 }}>
            <Stack spacing={1.5}>
              {!item.read ? <Alert severity="info">New</Alert> : null}
              <Typography variant="h6">{item.title || 'Update'}</Typography>
              <Typography color="text.secondary">{item.message}</Typography>
              <Stack direction="row" spacing={2}>
                {item.link ? (
                  <Button variant="text" color="secondary" href={item.link}>
                    Open
                  </Button>
                ) : null}
                {!item.read ? (
                  <Button variant="outlined" color="secondary" onClick={() => markRead(item.id)}>
                    Mark as read
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </AppShell>
  );
}
