import { Router } from 'express';
import { loginRateLimit } from '../lib/ratelimit';
import { verifyPassword } from './password';
import { setSession, clearSession, isAuthed } from './session';
import { ADMIN_PASSWORD_HASH } from '../config';
import { requireAuth } from './middleware';

const router = Router();

router.post('/login', loginRateLimit, async (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Password required' });
    return;
  }

  const ok = await verifyPassword(password, ADMIN_PASSWORD_HASH);
  if (!ok) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  setSession(res);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({ authed: true });
});

export default router;
