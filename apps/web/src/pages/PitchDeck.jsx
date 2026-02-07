import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import {
  addDoc,
  collection,
  doc,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useAuth } from '../lib/auth-context.jsx';
import { useCollection } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';

export default function PitchDeck() {
  const { profile } = useAuth();
  const pitchQuery = useMemo(() => {
    if (!profile?.teamId) return null;
    return query(collection(db, 'pitchDecks'), where('teamId', '==', profile.teamId));
  }, [profile?.teamId]);
  const { data: pitchDecks } = useCollection(pitchQuery);
  const existing = pitchDecks[0];

  const [slidesLink, setSlidesLink] = useState(existing?.slidesLink || '');
  const [canvaLink, setCanvaLink] = useState(existing?.canvaLink || '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!existing) return;
    setSlidesLink(existing.slidesLink || '');
    setCanvaLink(existing.canvaLink || '');
  }, [existing?.id]);

  const handleSave = async () => {
    setError('');
    setSaved(false);
    if (!profile?.teamId) {
      setError('Your team needs to be approved before saving a pitch deck.');
      return;
    }

    const payload = {
      teamId: profile.teamId,
      slidesLink: slidesLink.trim(),
      canvaLink: canvaLink.trim(),
      updatedAt: serverTimestamp()
    };

    if (existing?.id) {
      await updateDoc(doc(db, 'pitchDecks', existing.id), payload);
    } else {
      await addDoc(collection(db, 'pitchDecks'), payload);
    }
    setSaved(true);
  };

  return (
    <AppShell
      kicker="PITCH DECK"
      title="Your Bear Tank pitch"
      subtitle="Use the Google Slides template or Canva. Paste your final link here."
    >
      <Paper sx={{ p: 3, maxWidth: 720 }}>
        <Stack spacing={2}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {saved ? <Alert severity="success">Pitch deck saved.</Alert> : null}
          <TextField
            label="Google Slides link"
            placeholder="https://docs.google.com/presentation/..."
            value={slidesLink}
            onChange={(event) => setSlidesLink(event.target.value)}
          />
          <TextField
            label="Canva link (optional)"
            placeholder="https://www.canva.com/..."
            value={canvaLink}
            onChange={(event) => setCanvaLink(event.target.value)}
          />
          <Button variant="contained" color="secondary" onClick={handleSave}>
            Save pitch link
          </Button>
        </Stack>
      </Paper>
    </AppShell>
  );
}
