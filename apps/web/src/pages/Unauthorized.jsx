import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { DASHBOARD_BY_ROLE, ROLE_LABELS, useAuth } from '../lib/auth-context.jsx';
import { PATHS } from '../lib/paths.js';

function formatAllowedRoles(roles = []) {
  if (roles.length === 0) return 'this area';
  return roles.map((role) => ROLE_LABELS[role] || role).join(', ');
}

export default function Unauthorized() {
  const location = useLocation();
  const { role, signOut } = useAuth();
  const allow = Array.isArray(location.state?.allow) ? location.state.allow : [];
  const destination = DASHBOARD_BY_ROLE[role] || PATHS.home;
  const roleLabel = role ? ROLE_LABELS[role] || role : 'Guest';

  return (
    <AppShell
      kicker="UNAUTHORIZED"
      title="You do not have access to this page"
      subtitle={`Signed in as ${roleLabel}. This page is available to ${formatAllowedRoles(allow)}.`}
    >
      <Paper sx={{ p: 3, maxWidth: 720 }}>
        <Stack spacing={2}>
          <Alert severity="warning">
            Your account can still use the areas available for your current role.
          </Alert>
          <Typography color="text.secondary">
            If your permissions should be different, contact your teacher or super admin.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="contained" color="secondary" component={RouterLink} to={destination}>
              Go to my dashboard
            </Button>
            <Button variant="outlined" color="secondary" onClick={signOut}>
              Sign out
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </AppShell>
  );
}
