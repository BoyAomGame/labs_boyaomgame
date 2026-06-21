import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import { listPosts, getPost, createPost, updatePost, deletePost } from './store';
import { upload, saveUploadedImage } from './upload';
import { isValidSlug } from './slug';

const router = Router();

// All routes require auth
router.use(requireAuth);

// GET /posts
router.get('/posts', async (req, res) => {
  try {
    const posts = await listPosts();
    res.json(posts);
  } catch (err) {
    console.error('[blog] listPosts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /posts/:slug
router.get('/posts/:slug', async (req, res) => {
  const { slug } = req.params;
  if (!isValidSlug(slug)) {
    res.status(400).json({ error: 'Invalid slug' });
    return;
  }
  try {
    const post = await getPost(slug);
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json(post);
  } catch (err) {
    console.error('[blog] getPost error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /posts
router.post('/posts', async (req, res) => {
  const { title, date, slug, tags, draft, cover, body } = req.body as {
    title?: string;
    date?: string;
    slug?: string;
    tags?: string[];
    draft?: boolean;
    cover?: string;
    body?: string;
  };

  if (!title || typeof title !== 'string') {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  if (!date || typeof date !== 'string') {
    res.status(400).json({ error: 'date is required' });
    return;
  }

  try {
    const post = await createPost({ title, date, slug, tags, draft, cover, body });
    res.status(201).json({ slug: post.slug });
  } catch (err: any) {
    if (err.code === 'EXISTS') {
      res.status(409).json({ error: 'Post already exists' });
      return;
    }
    if (err.code === 'INVALID_SLUG') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('[blog] createPost error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /posts/:slug
router.put('/posts/:slug', async (req, res) => {
  const { slug } = req.params;
  if (!isValidSlug(slug)) {
    res.status(400).json({ error: 'Invalid slug' });
    return;
  }
  try {
    const post = await updatePost(slug, req.body);
    res.json({ slug: post.slug });
  } catch (err: any) {
    if (err.code === 'NOT_FOUND') {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    console.error('[blog] updatePost error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /posts/:slug
router.delete('/posts/:slug', async (req, res) => {
  const { slug } = req.params;
  if (!isValidSlug(slug)) {
    res.status(400).json({ error: 'Invalid slug' });
    return;
  }
  try {
    await deletePost(slug);
    res.json({ ok: true });
  } catch (err) {
    console.error('[blog] deletePost error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /posts/:slug/images
router.post('/posts/:slug/images', upload.single('image'), async (req, res) => {
  const { slug } = req.params;
  if (!isValidSlug(slug)) {
    res.status(400).json({ error: 'Invalid slug' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'No image file provided' });
    return;
  }
  try {
    const filename = await saveUploadedImage(slug, req.file);
    res.json({
      filename,
      url: `/blog/images/${slug}/${filename}`,
    });
  } catch (err: any) {
    console.error('[blog] image upload error:', err);
    res.status(400).json({ error: err.message || 'Upload failed' });
  }
});

export default router;
