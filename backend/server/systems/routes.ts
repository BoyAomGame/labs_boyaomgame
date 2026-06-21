import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import { getStatuses, setMaintenance, processControl } from './controller';
import { Pm2UnavailableError } from './pm2';
import { isControllable } from './registry';

const router = Router();

router.use(requireAuth);

// GET /systems
router.get('/systems', async (req, res) => {
  try {
    const statuses = await getStatuses();
    res.json(statuses);
  } catch (err) {
    console.error('[systems] getStatuses error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /systems/:id/maintenance
router.post('/systems/:id/maintenance', async (req, res) => {
  const { id } = req.params;
  const { on } = req.body as { on?: boolean };

  if (typeof on !== 'boolean') {
    res.status(400).json({ error: '"on" must be a boolean' });
    return;
  }

  if (!isControllable(id)) {
    res.status(400).json({ error: `System not controllable: ${id}` });
    return;
  }

  try {
    const result = await setMaintenance(id, on);
    res.json(result);
  } catch (err: any) {
    if (err.code === 'NOT_CONTROLLABLE') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('[systems] setMaintenance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /systems/:id/process
router.post('/systems/:id/process', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body as { action?: string };

  if (!action || typeof action !== 'string') {
    res.status(400).json({ error: '"action" is required' });
    return;
  }

  if (!isControllable(id)) {
    res.status(400).json({ error: `System not controllable: ${id}` });
    return;
  }

  try {
    await processControl(id, action);
    res.json({ ok: true });
  } catch (err: any) {
    if (err instanceof Pm2UnavailableError || err.name === 'Pm2UnavailableError') {
      res.status(503).json({ error: err.message });
      return;
    }
    if (err.code === 'NOT_CONTROLLABLE' || err.code === 'NOT_FOUND') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('[systems] processControl error:', err);
    res.status(503).json({ error: 'Process control failed' });
  }
});

export default router;
