import { Request, Response, Router } from 'express';
import * as snapshotStore from '../services/printSnapshotStore';

const router: Router = Router();

// POST /api/print/snapshots
router.post('/snapshots', (req: Request, res: Response) => {
    try {
        const { poNumber, category, printMode, order } = req.body || {};

        if (!order || typeof order !== 'object') {
            res.status(400).json({
                success: false,
                error: 'Missing required field: order'
            });
            return;
        }

        const payload = {
            poNumber: String(poNumber || order.order_no || order.code || 'order').trim(),
            category: String(category || order.category || '').trim(),
            printMode: String(printMode || order.printMode || 'signature').trim() || 'signature',
            order
        };

        const snapshot = snapshotStore.createSnapshot(payload);

        res.json({
            success: true,
            data: {
                ...snapshot,
                poNumber: payload.poNumber,
                category: payload.category,
                printMode: payload.printMode
            }
        });
    } catch (error: any) {
        console.error('Create print snapshot failed', error);
        if (error?.code === 'SNAPSHOT_PAYLOAD_TOO_LARGE') {
            res.status(413).json({
                success: false,
                error: 'Snapshot payload too large',
                maxBytes: snapshotStore.MAX_SNAPSHOT_PAYLOAD_BYTES
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: 'Create print snapshot failed',
            message: error.message
        });
    }
});

// GET /api/print/snapshots/:snapshotId
router.get('/snapshots/:snapshotId', (req: Request, res: Response) => {
    try {
        const { snapshotId } = req.params;
        const snapshot = snapshotStore.getSnapshot(snapshotId);

        if (!snapshot) {
            res.status(404).json({
                success: false,
                error: 'Snapshot not found or expired'
            });
            return;
        }

        res.json({
            success: true,
            data: {
                snapshotId,
                ...snapshot
            }
        });
    } catch (error: any) {
        console.error('Get print snapshot failed', error);
        res.status(500).json({
            success: false,
            error: 'Get print snapshot failed',
            message: error.message
        });
    }
});

export default router;

// CJS interop: ensure require() returns the router directly
module.exports = router;
