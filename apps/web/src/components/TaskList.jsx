import { Chip, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function TaskList({ tasks = [], linkBase }) {
  return (
    <Stack spacing={2}>
      {tasks.map((task) => (
        <Paper
          key={task.id || task.title}
          component={linkBase ? RouterLink : 'div'}
          to={linkBase ? `${linkBase}/${task.id}` : undefined}
          sx={{
            p: 2,
            textDecoration: 'none',
            color: 'inherit',
            transition: 'transform 0.2s ease',
            '&:hover': linkBase ? { transform: 'translateY(-2px)' } : undefined
          }}
        >
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle1">{task.title}</Typography>
              {task.isBonus ? <Chip label="Bonus" size="small" color="secondary" /> : null}
              <Chip label={task.type} size="small" variant="outlined" />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {task.description}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {task.points} Bear Bucks
            </Typography>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
