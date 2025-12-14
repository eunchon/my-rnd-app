import { Router } from 'express';

const router = Router();

// Placeholder admin routes (extend as needed)
router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

export default router;
