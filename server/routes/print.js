const express = require('express');
const snapshotStore = require('../services/printSnapshotStore');

const router = express.Router();

// POST /api/print/snapshots
router.post('/snapshots', (req, res) => {
    try {
        const { poNumber, category, printMode, order } = req.body || {};

        if (!order || typeof order !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: order'
            });
        }

        const payload = {
            poNumber: String(poNumber || order.order_no || order.code || 'order').trim(),
            category: String(category || order.category || '').trim(),
            printMode: String(printMode || order.printMode || 'signature').trim() || 'signature',
            order
        };

        const snapshot = snapshotStore.createSnapshot(payload);

        return res.json({
            success: true,
            data: {
                ...snapshot,
                poNumber: payload.poNumber,
                category: payload.category,
                printMode: payload.printMode
            }
        });
    } catch (error) {
        console.error('Create print snapshot failed', error);
        if (error?.code === 'SNAPSHOT_PAYLOAD_TOO_LARGE') {
            return res.status(413).json({
                success: false,
                error: 'Snapshot payload too large',
                maxBytes: snapshotStore.MAX_SNAPSHOT_PAYLOAD_BYTES
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Create print snapshot failed',
            message: error.message
        });
    }
});

// GET /api/print/snapshots/:snapshotId
router.get('/snapshots/:snapshotId', (req, res) => {
    try {
        const { snapshotId } = req.params;
        const snapshot = snapshotStore.getSnapshot(snapshotId);

        if (!snapshot) {
            return res.status(404).json({
                success: false,
                error: 'Snapshot not found or expired'
            });
        }

        return res.json({
            success: true,
            data: {
                snapshotId,
                ...snapshot
            }
        });
    } catch (error) {
        console.error('Get print snapshot failed', error);
        return res.status(500).json({
            success: false,
            error: 'Get print snapshot failed',
            message: error.message
        });
    }
});

module.exports = router;
