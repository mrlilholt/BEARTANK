import {
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography
} from '@mui/material';

export default function StageCard({ title, status, progress, points, tasks }) {
  const normalizedStatus = (status || '').toLowerCase();
  const chipColor =
    normalizedStatus === 'complete' ? 'success' : normalizedStatus === 'active' ? 'secondary' : 'default';

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{title}</Typography>
            <Chip label={status} color={chipColor} />
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 999,
              bgcolor: 'rgba(108, 99, 255, 0.15)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 999,
                background: 'linear-gradient(90deg, #6c63ff 0%, #9a94ff 100%)'
              }
            }}
          />
          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              {tasks} tasks
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {points} BB
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
