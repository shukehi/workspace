/**
 * PDF Generation Routes
 * Handles PDF export requests through the unified /print-document renderer.
 */

const express = require('express');
const config = require('../config');
const { generatePurchaseOrderPDF } = require('../services/pdfGenerator');
const snapshotStore = require('../services/printSnapshotStore');

const router = express.Router();

function normalizeUrlBase(urlRaw) {
    const parsed = new URL(String(urlRaw).trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Only http/https render base url is allowed');
    }

    return parsed.toString().replace(/\/$/, '');
}

function resolveTrustedRenderBaseUrl(req) {
    const configured = String(process.env.PDF_RENDER_BASE_URL || '').trim();
    if (configured) {
        return normalizeUrlBase(configured);
    }

    const socketPort = Number(req?.socket?.localPort || 0);
    const fallbackPort = Number(config?.server?.port || 3000);
    const port = socketPort > 0 ? socketPort : fallbackPort;
    return `http://127.0.0.1:${port}`;
}

function createSnapshotFromOrder({ poNumber, category, printMode, order }) {
    if (!order || typeof order !== 'object') return null;

    const payload = {
        poNumber: String(poNumber || order.order_no || order.code || 'order').trim(),
        category: String(category || order.category || '').trim(),
        printMode: String(printMode || order.printMode || 'signature').trim() || 'signature',
        order,
    };

    const snapshot = snapshotStore.createSnapshot(payload);
    return {
        snapshotId: snapshot.snapshotId,
        payload,
    };
}

/**
 * POST /api/pdf/generate
 * Request body (v2):
 * {
 *   poNumber?: string,
 *   printMode?: 'signature'|'compact',
 *   snapshotId?: string,
 *   orderId?: string,
 *   order?: Object,
 *   category?: string
 * }
 */
router.post('/generate', async (req, res) => {
    let transientSnapshotId = '';
    try {
        const {
            poNumber,
            order,
            category,
            printMode,
            snapshotId: snapshotIdRaw,
            orderId,
        } = req.body || {};

        let snapshotId = String(snapshotIdRaw || '').trim();
        let snapshotPayload = null;

        if (snapshotId) {
            const snapshot = snapshotStore.getSnapshot(snapshotId);
            if (!snapshot) {
                return res.status(400).json({
                    success: false,
                    error: 'Snapshot not found or expired',
                });
            }
            snapshotPayload = snapshot.payload;
        } else if (order && typeof order === 'object') {
            let created = null;
            try {
                created = createSnapshotFromOrder({ poNumber, category, printMode, order });
            } catch (error) {
                if (error?.code === 'SNAPSHOT_PAYLOAD_TOO_LARGE') {
                    return res.status(413).json({
                        success: false,
                        error: 'Snapshot payload too large',
                        maxBytes: snapshotStore.MAX_SNAPSHOT_PAYLOAD_BYTES
                    });
                }
                throw error;
            }
            if (!created) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: snapshotId/orderId/order'
                });
            }
            snapshotId = created.snapshotId;
            snapshotPayload = created.payload;
            transientSnapshotId = created.snapshotId;
        }

        if (!snapshotId && !orderId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: snapshotId/orderId/order'
            });
        }

        const resolvedPoNumber = String(
            poNumber
            || snapshotPayload?.poNumber
            || order?.order_no
            || order?.code
            || 'order'
        ).trim() || 'order';

        const mode = String(printMode || snapshotPayload?.printMode || 'signature').trim() || 'signature';
        const baseUrl = resolveTrustedRenderBaseUrl(req);

        const params = new URLSearchParams();
        params.set('printMode', mode);
        params.set('embedded', '1');
        params.set('pdf', '1');
        params.set('t', String(Date.now()));

        if (snapshotId) {
            params.set('snapshotId', snapshotId);
        } else if (orderId) {
            params.set('orderId', String(orderId));
        }

        const renderUrl = `${baseUrl}/print-document?${params.toString()}`;

        console.log(`📄 Received PDF generation request for ${resolvedPoNumber}`);

        const pdfBuffer = await generatePurchaseOrderPDF({
            poNumber: resolvedPoNumber,
            renderUrl,
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(resolvedPoNumber)}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer, 'binary');

        console.log(`✅ PDF sent successfully for ${resolvedPoNumber}`);
    } catch (error) {
        console.error('❌ PDF generation error:', error);
        res.status(500).json({
            success: false,
            error: 'PDF generation failed',
            message: error.message
        });
    } finally {
        if (transientSnapshotId) {
            snapshotStore.deleteSnapshot(transientSnapshotId);
        }
    }
});

module.exports = router;
