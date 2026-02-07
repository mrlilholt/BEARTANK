import { Paper, Stack, Typography } from '@mui/material';
import { collection, doc, orderBy, query, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import TaskList from '../components/TaskList.jsx';
import { useDocument, useCollection } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';

export default function StageDetail() {
  const { stageId } = useParams();
  const stageRef = useMemo(() => (stageId ? doc(db, 'stages', stageId) : null), [stageId]);
  const { data: stage } = useDocument(stageRef);
  const tasksQuery = useMemo(() => {
    if (!stageId) return null;
    return query(collection(db, 'tasks'), where('stageId', '==', stageId), orderBy('order', 'asc'));
  }, [stageId]);
  const { data: tasks } = useCollection(tasksQuery);

  return (
    <AppShell
      kicker="STAGE"
      title={stage?.title || 'Stage detail'}
      subtitle={
        stage?.description ||
        'Complete the core tasks to unlock the next stage. Bonus tasks earn extra Bear Bucks.'
      }
    >
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Stage tasks</Typography>
          <TaskList tasks={tasks} linkBase="/student/task" />
        </Stack>
      </Paper>
    </AppShell>
  );
}
