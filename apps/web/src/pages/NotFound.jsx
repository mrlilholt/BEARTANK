import { Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';

export default function NotFound() {
  return (
    <AppShell
      kicker="404"
      title="This page is out of the tank"
      subtitle="Let’s get you back to the action."
      actions={
        <Button variant="contained" color="secondary" component={RouterLink} to="/">
          Back to home
        </Button>
      }
    />
  );
}
