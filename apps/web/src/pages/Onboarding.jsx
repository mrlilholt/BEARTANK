import {
  Alert,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { DASHBOARD_BY_ROLE, useAuth } from '../lib/auth-context.jsx';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, status, role, completeOnboarding, isSuperAdmin } = useAuth();
  const [fullName, setFullName] = useState(profile?.profile?.fullName || user?.displayName || '');
  const [preferredName, setPreferredName] = useState(profile?.profile?.preferredName || '');
  const [pronouns, setPronouns] = useState(profile?.profile?.pronouns || '');
  const [classCode, setClassCode] = useState(profile?.classCode || '');
  const [roleChoice, setRoleChoice] = useState(profile?.role || 'student');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const expectedCode = import.meta.env.VITE_CLASS_CODE || '';
  const showClassCode = roleChoice === 'student' && !isSuperAdmin;

  const roleLocked = useMemo(() => {
    if (isSuperAdmin) return true;
    if (profile?.role && profile?.role !== 'student') return true;
    return false;
  }, [isSuperAdmin, profile]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    if (showClassCode && expectedCode && classCode.trim() !== expectedCode.trim()) {
      setError('Class code is incorrect.');
      return;
    }

    setSaving(true);
    try {
      await completeOnboarding({
        fullName: fullName.trim(),
        preferredName: preferredName.trim(),
        pronouns: pronouns.trim(),
        role: roleChoice,
        classCode: showClassCode ? classCode.trim() : null
      });

      const destination =
        roleChoice === 'teacher' && !isSuperAdmin
          ? '/pending'
          : DASHBOARD_BY_ROLE[isSuperAdmin ? 'super_admin' : roleChoice] || '/student';

      navigate(destination);
    } catch (err) {
      setError(err.message || 'Could not complete onboarding.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (!profile?.onboarded) return;
    if (status === 'pending') {
      navigate('/pending');
      return;
    }
    navigate(DASHBOARD_BY_ROLE[role] || '/student');
  }, [user, profile, status, role, navigate]);

  return (
    <AppShell
      kicker="ONBOARDING"
      title="Set up your Bear Tank identity"
      subtitle="Students enter with a class code. Teams and company names are approved by the teacher."
    >
      <Paper sx={{ p: 4, maxWidth: 620 }}>
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            label="Full name"
            placeholder="Alex Morgan"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
          <TextField
            label="Preferred name"
            placeholder="Alex"
            value={preferredName}
            onChange={(event) => setPreferredName(event.target.value)}
          />
          <TextField
            label="Pronouns"
            placeholder="they/them"
            value={pronouns}
            onChange={(event) => setPronouns(event.target.value)}
          />

          <FormControl component="fieldset">
            <FormLabel component="legend">I am a...</FormLabel>
            <RadioGroup
              row
              value={isSuperAdmin ? 'super_admin' : roleChoice}
              onChange={(event) => setRoleChoice(event.target.value)}
            >
              <FormControlLabel
                value="student"
                control={<Radio />}
                label="Student"
                disabled={roleLocked}
              />
              <FormControlLabel
                value="teacher"
                control={<Radio />}
                label="Teacher"
                disabled={roleLocked}
              />
              {isSuperAdmin ? (
                <FormControlLabel value="super_admin" control={<Radio />} label="Super Admin" />
              ) : null}
            </RadioGroup>
          </FormControl>

          {showClassCode ? (
            <TextField
              label="Class code"
              placeholder="BEAR-2026"
              value={classCode}
              onChange={(event) => setClassCode(event.target.value)}
              required={!!expectedCode}
            />
          ) : null}

          {roleChoice === 'teacher' && !isSuperAdmin ? (
            <Alert severity="info">
              Teacher accounts need Super Admin approval before accessing the dashboard.
            </Alert>
          ) : null}

          <Button variant="contained" color="secondary" type="submit" disabled={saving}>
            {saving ? 'Setting up...' : 'Enter the Tank'}
          </Button>
        </Stack>
      </Paper>
    </AppShell>
  );
}
