import { Button, Grid, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import StatCard from '../components/StatCard.jsx';
import { DASHBOARD_BY_ROLE, useAuth } from '../lib/auth-context.jsx';

export default function Landing() {
  const { user, role } = useAuth();
  const dashboardPath = DASHBOARD_BY_ROLE[role] || '/onboarding';

  return (
    <AppShell
      kicker="BEARTANK 2026"
      title="Build it fast. Pitch it fearless."
      subtitle="A four-day sprint from idea to prototype to fabrication, with approvals, points, and a Shark Tank-inspired finale."
      actions={
        <>
          {user ? (
            <Button variant="contained" color="secondary" component={RouterLink} to={dashboardPath}>
              Go to dashboard
            </Button>
          ) : (
            <Button variant="contained" color="secondary" component={RouterLink} to="/login">
              Enter BEARTANK
            </Button>
          )}
          <Button variant="outlined" color="secondary" component={RouterLink} to="/onboarding">
            Start onboarding
          </Button>
        </>
      }
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <StatCard label="Stages" value="7" helper="Ideation to Pitch" />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard label="Bear Bucks" value="0 - 100M" helper="Company valuation range" />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard label="Approvals" value="Always" helper="Every stage is reviewed" />
        </Grid>
      </Grid>
      <Stack spacing={2} sx={{ mt: 5 }}>
        <Typography variant="h5">What makes BEARTANK different</Typography>
        <Typography color="text.secondary">
          Students move through structured stages, collect Bear Bucks, and unlock next steps only after
          approval. Side hustle sprints boost their valuation and keep momentum high.
        </Typography>
      </Stack>
    </AppShell>
  );
}
