import { Button, Paper, Stack, Typography } from '@mui/material';
import AppShell from '../components/AppShell.jsx';
import { useAuth } from '../lib/auth-context.jsx';

export default function PendingAccess() {
  const { signOut, role } = useAuth();
  const isTeacher = role === 'teacher';
  const title = isTeacher ? 'Waiting for super admin approval' : 'Access is pending';
  const subtitle = isTeacher
    ? 'Your teacher account is pending activation. A super admin must approve access before teacher tools unlock.'
    : 'Your account is in a pending state. We will unlock tools as soon as approval is complete.';
  const details = isTeacher
    ? 'You can sign out and return later. If approval is delayed, contact your super admin.'
    : 'If you expected immediate access, contact your teacher or super admin for next steps.';

  return (
    <AppShell
      kicker="PENDING"
      title={title}
      subtitle={subtitle}
    >
      <Paper sx={{ p: 3, maxWidth: 640 }}>
        <Stack spacing={2}>
          <Typography variant="h6">You are in the approval queue</Typography>
          <Typography color="text.secondary">{details}</Typography>
          <Button variant="outlined" color="secondary" onClick={signOut}>
            Sign out
          </Button>
        </Stack>
      </Paper>
    </AppShell>
  );
}
