import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  MenuItem
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AppShell from '../components/AppShell.jsx';
import { useAuth } from '../lib/auth-context.jsx';
import { useCollection } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { useMemo, useState } from 'react';

const RESOURCE_TYPES = [
  { value: 'link', label: 'Link' },
  { value: 'embed', label: 'Embed' }
];

const toPreviewUrl = (input) => {
  if (!input) return '';
  const url = input.trim();
  if (!url.includes('docs.google.com')) return url;
  if (url.includes('/preview') || url.includes('/pub') || url.includes('pub?')) return url;
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return `https://docs.google.com/document/d/${docMatch[1]}/preview`;
  const slidesMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slidesMatch) return `https://docs.google.com/presentation/d/${slidesMatch[1]}/preview`;
  const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetsMatch) return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/preview`;
  return url;
};

export default function Resources() {
  const { role, user } = useAuth();
  const canEdit = role === 'teacher' || role === 'super_admin';

  const resourcesQuery = useMemo(
    () => query(collection(db, 'resources'), orderBy('createdAt', 'desc')),
    []
  );
  const { data: resources } = useCollection(resourcesQuery);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('link');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({
    title: '',
    description: '',
    url: '',
    type: 'link',
    category: ''
  });

  const handleCreate = async () => {
    setError('');
    if (!title.trim() || !url.trim()) {
      setError('Title and URL are required.');
      return;
    }
    const finalUrl = type === 'embed' ? toPreviewUrl(url) : url.trim();
    await addDoc(collection(db, 'resources'), {
      title: title.trim(),
      description: description.trim(),
      url: finalUrl,
      type,
      category: category.trim(),
      createdBy: user?.uid || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    setTitle('');
    setDescription('');
    setUrl('');
    setType('link');
    setCategory('');
  };

  const startEdit = (resource) => {
    setEditingId(resource.id);
    setEditDraft({
      title: resource.title || '',
      description: resource.description || '',
      url: resource.url || '',
      type: resource.type || 'link',
      category: resource.category || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({ title: '', description: '', url: '', type: 'link', category: '' });
  };

  const saveEdit = async (resource) => {
    if (!editDraft.title.trim() || !editDraft.url.trim()) {
      setError('Title and URL are required.');
      return;
    }
    const finalUrl = editDraft.type === 'embed' ? toPreviewUrl(editDraft.url) : editDraft.url.trim();
    await updateDoc(doc(db, 'resources', resource.id), {
      title: editDraft.title.trim(),
      description: editDraft.description.trim(),
      url: finalUrl,
      type: editDraft.type,
      category: editDraft.category.trim(),
      updatedAt: serverTimestamp()
    });
    cancelEdit();
  };

  const deleteResource = async (resourceId) => {
    if (!window.confirm('Delete this resource?')) return;
    await deleteDoc(doc(db, 'resources', resourceId));
  };

  return (
    <AppShell
      kicker="RESOURCES"
      title="Resources"
      subtitle="Share docs, slides, links, and inspiration for your teams."
    >
      <Stack spacing={3}>
        {canEdit ? (
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Add resource</Typography>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <TextField
                label="Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Company naming guide"
              />
              <TextField
                label="Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                multiline
                minRows={2}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="URL or Embed link"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  sx={{ flex: 1 }}
                  placeholder="https://docs.google.com/..."
                />
                <TextField
                  select
                  label="Display"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  sx={{ minWidth: 140 }}
                >
                  {RESOURCE_TYPES.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <TextField
                label="Category (optional)"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Branding"
              />
              <Typography variant="caption" color="text.secondary">
                For Google Docs/Slides, use the share link or an embed/preview link.
              </Typography>
              <Button variant="contained" color="secondary" onClick={handleCreate}>
                Post resource
              </Button>
            </Stack>
          </Paper>
        ) : null}

        {resources.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary">No resources shared yet.</Typography>
          </Paper>
        ) : null}

        <Stack spacing={2}>
          {resources.map((resource) => (
            <Card key={resource.id}>
              <CardContent>
                {editingId === resource.id ? (
                  <Stack spacing={2}>
                    <TextField
                      label="Title"
                      value={editDraft.title}
                      onChange={(event) =>
                        setEditDraft((prev) => ({ ...prev, title: event.target.value }))
                      }
                    />
                    <TextField
                      label="Description"
                      value={editDraft.description}
                      onChange={(event) =>
                        setEditDraft((prev) => ({ ...prev, description: event.target.value }))
                      }
                      multiline
                      minRows={2}
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="URL or Embed link"
                        value={editDraft.url}
                        onChange={(event) =>
                          setEditDraft((prev) => ({ ...prev, url: event.target.value }))
                        }
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        select
                        label="Display"
                        value={editDraft.type}
                        onChange={(event) =>
                          setEditDraft((prev) => ({ ...prev, type: event.target.value }))
                        }
                        sx={{ minWidth: 140 }}
                      >
                        {RESOURCE_TYPES.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Stack>
                    <TextField
                      label="Category (optional)"
                      value={editDraft.category}
                      onChange={(event) =>
                        setEditDraft((prev) => ({ ...prev, category: event.target.value }))
                      }
                    />
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => saveEdit(resource)}
                      >
                        Save
                      </Button>
                      <Button variant="outlined" color="secondary" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack spacing={0.4}>
                        <Typography variant="h6">{resource.title}</Typography>
                        {resource.category ? (
                          <Chip label={resource.category} size="small" variant="outlined" />
                        ) : null}
                      </Stack>
                      {canEdit ? (
                        <Stack direction="row" spacing={1}>
                          <IconButton onClick={() => startEdit(resource)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => deleteResource(resource.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      ) : null}
                    </Stack>
                    {resource.description ? (
                      <Typography color="text.secondary">{resource.description}</Typography>
                    ) : null}
                    {resource.type === 'embed' ? (
                      <Box
                        sx={{
                          position: 'relative',
                          paddingTop: '56.25%',
                          borderRadius: 6,
                          overflow: 'hidden',
                          border: '1px solid #eef1f7'
                        }}
                      >
                        <Box
                          component="iframe"
                          src={resource.url}
                          title={resource.title}
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            border: 0
                          }}
                          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                          allowFullScreen
                        />
                      </Box>
                    ) : (
                      <Button
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        variant="outlined"
                        color="secondary"
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        Open resource
                      </Button>
                    )}
                  </Stack>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Stack>
    </AppShell>
  );
}
