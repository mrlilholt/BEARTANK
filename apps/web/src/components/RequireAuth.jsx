import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { CircularProgress, Stack, Typography } from '@mui/material';
import AppShell from './AppShell.jsx';
import { useAuth } from '../lib/auth-context.jsx';

export default function RequireAuth() {
  const location = useLocation();
  const { user, profile, status, loading } = useAuth();

  if (loading) {
    return (
      <AppShell title="Loading BEARTANK" subtitle="Checking your access." kicker="LOADING">
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress color="secondary" />
          <Typography color="text.secondary">Connecting to the tank...</Typography>
        </Stack>
      </AppShell>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile || !profile.onboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  if (status === 'pending') {
    return <Navigate to="/pending" replace />;
  }

  return <Outlet />;
}
