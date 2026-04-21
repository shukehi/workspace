import { Router, Request, Response } from 'express';
import { buildRuntimeConfigSnapshot } from '../services/config-platform/profile.snapshot';

const router: Router = Router();

router.get('/config-snapshot', async (_req: Request, res: Response) => {
  try {
    const snapshot = await buildRuntimeConfigSnapshot();
    res.json(snapshot);
  } catch (error) {
    console.error('Error building runtime config snapshot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to build runtime config snapshot',
      message: error instanceof Error ? error.message : String(error || 'Unknown error'),
    });
  }
});

export default router;
