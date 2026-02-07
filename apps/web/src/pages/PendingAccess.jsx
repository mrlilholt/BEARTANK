import { Button, Paper, Stack, Typography } from '@mui/material';
import AppShell from '../components/AppShell.jsx';
import { useAuth } from '../lib/auth-context.jsx';

export default function PendingAccess() {
  const { signOut } = useAuth();

  return (
    <AppShell
      kicker="PENDING"
      title="Waiting on teacher approval"
      subtitle="Your teacher will approve your account soon. We'll unlock the tools as soon as you're in."
    >
      <Paper sx={{ p: 3, maxWidth: 640 }}>
        <Stack spacing={2}>
          <Typography variant="h6">You're in the queue</Typography>
          <Typography color="text.secondary">
            If you're a teacher, the Super Admin needs to approve your access. Students can sign out and
            rejoin with a class code.
          </Typography>
          <Button variant="outlined" color="secondary" onClick={signOut}>
            Sign out
          </Button>
        </Stack>
      </Paper>
    </AppShell>
  );
}
