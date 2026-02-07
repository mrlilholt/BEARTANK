import { Button, Paper, Stack, Typography } from '@mui/material';
import { collection, doc, query, updateDoc, where } from 'firebase/firestore';
import { useMemo } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useAuth } from '../lib/auth-context.jsx';
import { useCollection } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';

export default function AdminDashboard() {
  const { user } = useAuth();
  const teachersQuery = useMemo(
    () => query(collection(db, 'users'), where('role', '==', 'teacher')),
    []
  );
  const { data: teachers } = useCollection(teachersQuery);
  const pendingTeachers = teachers.filter((teacher) => teacher.status === 'pending');

  const approveTeacher = async (teacherId) => {
    await updateDoc(doc(db, 'users', teacherId), {
      status: 'active',
      approvedBy: user?.uid || null
    });
  };

  return (
    <AppShell
      kicker="SUPER ADMIN"
      title="Approve Teachers & Cohorts"
      subtitle="You control admin access and archive cohorts when the week is done."
    >
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Teacher Requests</Typography>
          {pendingTeachers.length === 0 ? (
            <Typography color="text.secondary">No pending requests right now.</Typography>
          ) : null}
          {pendingTeachers.map((teacher) => (
            <Stack
              key={teacher.id}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ sm: 'center' }}
            >
              <Stack spacing={0.5}>
                <Typography>{teacher.email || teacher.profile?.fullName || 'Teacher'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Status: {teacher.status}
                </Typography>
              </Stack>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => approveTeacher(teacher.id)}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Approve
              </Button>
            </Stack>
          ))}
        </Stack>
      </Paper>
    </AppShell>
  );
}
