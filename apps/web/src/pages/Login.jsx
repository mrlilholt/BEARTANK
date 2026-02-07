import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { DASHBOARD_BY_ROLE, useAuth } from '../lib/auth-context.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, error, user, profile, role, status } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!profile?.onboarded) {
      navigate('/onboarding');
      return;
    }
    if (status === 'pending') {
      navigate('/pending');
      return;
    }
    navigate(DASHBOARD_BY_ROLE[role] || '/student');
  }, [user, profile, role, status, navigate]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signIn();
      navigate('/onboarding');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <AppShell
      kicker="ACCESS"
      title="Sign in with Google"
      subtitle="Teachers are approved by the Super Admin. Students enter with a class code after onboarding."
    >
      <Paper sx={{ p: 4, maxWidth: 520 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Welcome to BEARTANK</Typography>
          <Typography color="text.secondary">
            We only use Google sign-in. No passwords, no extra accounts.
          </Typography>
          {error ? (
            <Alert severity="error">
              {error.message || 'Sign in failed. Try again.'}
            </Alert>
          ) : null}
          <Button
            variant="contained"
            color="secondary"
            startIcon={<GoogleIcon />}
            onClick={handleSignIn}
            disabled={isSigningIn}
          >
            {isSigningIn ? 'Signing in...' : 'Continue with Google'}
          </Button>
        </Stack>
      </Paper>
    </AppShell>
  );
}
