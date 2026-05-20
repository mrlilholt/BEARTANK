import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  collection,
  doc,
  query,
  serverTimestamp,
  where,
  writeBatch
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/auth-context.jsx';
import { useCollection } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';

const BONUS_MESSAGE_PRESETS = [
  {
    key: 'teamwork',
    label: 'Great teamwork',
    message: 'Outstanding teamwork and collaboration during work time.'
  },
  {
    key: 'initiative',
    label: 'Strong initiative',
    message: 'Strong initiative and hustle beyond the core assignment.'
  },
  {
    key: 'leadership',
    label: 'Leadership',
    message: 'Excellent leadership and support for classmates.'
  },
  {
    key: 'creativity',
    label: 'Creative problem-solving',
    message: 'Creative problem-solving that moved the work forward.'
  },
  {
    key: 'professionalism',
    label: 'Professionalism',
    message: 'Professional focus, preparation, and follow-through.'
  },
  {
    key: 'custom',
    label: 'Custom message',
    message: ''
  }
];

function getOptionLabel(option) {
  if (!option) return '';
  if (option.companyName || option.teamName) {
    return option.companyName || option.teamName || 'Team';
  }
  return option.profile?.preferredName || option.profile?.fullName || option.email || 'Student';
}

function getAwardErrorMessage(err) {
  const code = typeof err?.code === 'string' ? err.code : '';
  const message = typeof err?.message === 'string' ? err.message : '';

  if (code === 'permission-denied') {
    return 'Your Firestore rules are blocking bonus awards for this account.';
  }

  if (code === 'unauthenticated') {
    return 'You need to be signed in again before awarding bonus Bear Bucks.';
  }

  return message || 'Could not award bonus Bear Bucks.';
}

export default function BonusAwardDialog({ open, onClose }) {
  const { user } = useAuth();
  const studentQuery = useMemo(
    () => query(collection(db, 'users'), where('role', '==', 'student')),
    []
  );
  const teamQuery = useMemo(() => query(collection(db, 'teams')), []);
  const { data: students } = useCollection(studentQuery);
  const { data: teams } = useCollection(teamQuery);

  const [targetType, setTargetType] = useState('user');
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [amount, setAmount] = useState('');
  const [presetKey, setPresetKey] = useState(BONUS_MESSAGE_PRESETS[0].key);
  const [message, setMessage] = useState(BONUS_MESSAGE_PRESETS[0].message);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const availableStudents = useMemo(
    () => students.filter((student) => student.status === 'active'),
    [students]
  );
  const availableTeams = useMemo(
    () => teams.filter((team) => team.status !== 'archived'),
    [teams]
  );
  const targetOptions = targetType === 'team' ? availableTeams : availableStudents;

  useEffect(() => {
    if (!open) {
      setTargetType('user');
      setSelectedTarget(null);
      setAmount('');
      setPresetKey(BONUS_MESSAGE_PRESETS[0].key);
      setMessage(BONUS_MESSAGE_PRESETS[0].message);
      setError('');
      setSuccess('');
      setSaving(false);
    }
  }, [open]);

  const handlePresetChange = (nextPresetKey) => {
    setPresetKey(nextPresetKey);
    const preset = BONUS_MESSAGE_PRESETS.find((option) => option.key === nextPresetKey);
    setMessage(preset?.message || '');
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!selectedTarget) {
      setError(targetType === 'team' ? 'Choose a team.' : 'Choose a student.');
      return;
    }

    const nextAmount = Number(amount);
    if (!Number.isInteger(nextAmount) || nextAmount <= 0) {
      setError('Enter a whole-number Bear Bucks amount greater than 0.');
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError('Add a bonus message.');
      return;
    }
    if (!user?.uid) {
      setError('You need to be signed in before awarding a bonus.');
      return;
    }

    setSaving(true);
    try {
      const targetId = selectedTarget.id;
      const recipientIds =
        targetType === 'team'
          ? (selectedTarget.memberIds || []).filter(Boolean)
          : [targetId];

      const batch = writeBatch(db);
      const ledgerRef = doc(collection(db, 'pointsLedger'));
      batch.set(ledgerRef, {
        entityType: targetType,
        entityId: targetId,
        amount: nextAmount,
        message: trimmedMessage,
        reason: 'manual-bonus',
        presetKey: presetKey === 'custom' ? null : presetKey,
        awardedBy: user.uid,
        createdAt: serverTimestamp()
      });

      recipientIds.forEach((recipientId) => {
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, {
          userId: recipientId,
          title: `Bonus Bear Bucks: +${nextAmount} BB`,
          message: trimmedMessage,
          link: '/student/notifications',
          type: 'bonus-award',
          sourceId: ledgerRef.id,
          read: false,
          createdAt: serverTimestamp()
        });
      });

      const auditRef = doc(collection(db, 'auditLogs'));
      batch.set(auditRef, {
        type: 'bonus-award',
        entityType: targetType,
        entityId: targetId,
        entityLabel: getOptionLabel(selectedTarget),
        amount: nextAmount,
        message: trimmedMessage,
        presetKey: presetKey === 'custom' ? null : presetKey,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });

      await batch.commit();
      setSuccess('Bonus awarded.');
      setSelectedTarget(null);
      setAmount('');
      setPresetKey(BONUS_MESSAGE_PRESETS[0].key);
      setMessage(BONUS_MESSAGE_PRESETS[0].message);
    } catch (err) {
      setError(getAwardErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Award Bonus Bear Bucks</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography color="text.secondary">
            Award a one-off bonus to a student or team and send a reason with it.
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}
          <TextField
            select
            label="Award to"
            value={targetType}
            onChange={(event) => {
              setTargetType(event.target.value);
              setSelectedTarget(null);
            }}
          >
            <MenuItem value="user">Student</MenuItem>
            <MenuItem value="team">Team</MenuItem>
          </TextField>
          <Autocomplete
            options={targetOptions}
            value={selectedTarget}
            onChange={(_, value) => setSelectedTarget(value)}
            getOptionLabel={getOptionLabel}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label={targetType === 'team' ? 'Choose team' : 'Choose student'}
                placeholder={targetType === 'team' ? 'Select a team' : 'Select a student'}
              />
            )}
          />
          <TextField
            label="Bear Bucks amount"
            type="number"
            inputProps={{ min: 1, step: 1 }}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <TextField
            select
            label="Bonus reason template"
            value={presetKey}
            onChange={(event) => handlePresetChange(event.target.value)}
          >
            {BONUS_MESSAGE_PRESETS.map((preset) => (
              <MenuItem key={preset.key} value={preset.key}>
                {preset.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            multiline
            minRows={3}
            placeholder="Tell them why they earned the bonus."
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" color="secondary" onClick={handleSubmit} disabled={saving}>
          Award bonus
        </Button>
      </DialogActions>
    </Dialog>
  );
}
