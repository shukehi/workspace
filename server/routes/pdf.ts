/**
 * PDF Generation Routes
 * Handles PDF export requests through the unified /print-document renderer.
 */

import { Request, Response, Router } from 'express';
import { generatePurchaseOrderPDF, generatePurchaseOrderScreenshot } from '../services/pdfGenerator';
import * as snapshotStore from '../services/printSnapshotStore';
import { resolveRenderBaseUrl } from '../services/renderBaseUrl';

const router: Router = Router();
const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]+/g;
const SPACE_PATTERN = /\s+/g;

function normalizeCategoryLabel(category: unknown): string {
    const raw = String(category || '').toLowerCase();
    if (!raw) return '未分类';
    if (raw === 'packaging' || raw.includes('包装')) return '包装';
    if (raw === 'cylinder' || raw.includes('锁芯')) return '锁芯';
    if (raw === 'lockset' || raw.includes('锁具')) return '锁具';
    if (raw === 'handle' || raw.includes('拉手')) return '拉手';
    if (raw === 'lock' || raw.includes('锁叉')) return '锁叉';
    if (raw === 'hardware' || raw.includes('五金') || raw.includes('配件')) return '五金';
    return '未分类';
}

function cleanFilenamePart(value: unknown, fallback: string): string {
    const normalized = String(value || '')
        .replace(INVALID_FILENAME_CHARS, ' ')
        .replace(SPACE_PATTERN, ' ')
        .trim();
    return normalized || fallback;
}

function buildPdfFilename({ supplier, category, poNumber }: { supplier: unknown; category: unknown; poNumber: unknown }): string {
    const safeSupplier = cleanFilenamePart(supplier, '未知供应商');
    const safeCategory = cleanFilenamePart(normalizeCategoryLabel(category), '未分类');
    const safePoNumber = cleanFilenamePart(poNumber, 'order');
    return `${safeSupplier} ${safeCategory} ${safePoNumber} 颐家采购订单.pdf`;
}

function buildScreenshotFilename({ supplier, category, poNumber }: { supplier: unknown; category: unknown; poNumber: unknown }): string {
    const safeSupplier = cleanFilenamePart(supplier, '未知供应商');
    const safeCategory = cleanFilenamePart(normalizeCategoryLabel(category), '未分类');
    const safePoNumber = cleanFilenamePart(poNumber, 'order');
    return `${safeSupplier} ${safeCategory} ${safePoNumber} 颐家采购订单截图.png`;
}

function createSnapshotFromOrder({ poNumber, category, printMode, order }: { poNumber?: unknown; category?: unknown; printMode?: unknown; order: any }): { snapshotId: string; payload: any } | null {
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
router.post('/generate', async (req: Request, res: Response) => {
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
        let snapshotPayload: any = null;

        if (snapshotId) {
            const snapshot = snapshotStore.getSnapshot(snapshotId);
            if (!snapshot) {
                res.status(400).json({
                    success: false,
                    error: 'Snapshot not found or expired',
                });
                return;
            }
            snapshotPayload = snapshot.payload;
        } else if (order && typeof order === 'object') {
            let created: { snapshotId: string; payload: any } | null = null;
            try {
                created = createSnapshotFromOrder({ poNumber, category, printMode, order });
            } catch (error: any) {
                if (error?.code === 'SNAPSHOT_PAYLOAD_TOO_LARGE') {
                    res.status(413).json({
                        success: false,
                        error: 'Snapshot payload too large',
                        maxBytes: snapshotStore.MAX_SNAPSHOT_PAYLOAD_BYTES
                    });
                    return;
                }
                throw error;
            }
            if (!created) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: snapshotId/orderId/order'
                });
                return;
            }
            snapshotId = created.snapshotId;
            snapshotPayload = created.payload;
            transientSnapshotId = created.snapshotId;
        }

        if (!snapshotId && !orderId) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: snapshotId/orderId/order'
            });
            return;
        }

        const resolvedPoNumber = String(
            poNumber
            || snapshotPayload?.poNumber
            || order?.order_no
            || order?.code
            || 'order'
        ).trim() || 'order';
        const resolvedCategory = String(
            category
            || snapshotPayload?.category
            || order?.category
            || ''
        ).trim();
        const resolvedSupplier = String(
            order?.supplier
            || snapshotPayload?.order?.supplier
            || order?.metadata?.supplier
            || order?.items?.[0]?.supplier
            || ''
        ).trim();
        const filename = buildPdfFilename({
            supplier: resolvedSupplier,
            category: resolvedCategory,
            poNumber: resolvedPoNumber,
        });

        const mode = String(printMode || snapshotPayload?.printMode || 'signature').trim() || 'signature';
        const baseUrl = resolveRenderBaseUrl(req);

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
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer, 'binary');

        console.log(`✅ PDF sent successfully for ${resolvedPoNumber}`);
    } catch (error: any) {
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

/**
 * POST /api/pdf/screenshot
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
router.post('/screenshot', async (req: Request, res: Response) => {
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
        let snapshotPayload: any = null;

        if (snapshotId) {
            const snapshot = snapshotStore.getSnapshot(snapshotId);
            if (!snapshot) {
                res.status(400).json({
                    success: false,
                    error: 'Snapshot not found or expired',
                });
                return;
            }
            snapshotPayload = snapshot.payload;
        } else if (order && typeof order === 'object') {
            let created: { snapshotId: string; payload: any } | null = null;
            try {
                created = createSnapshotFromOrder({ poNumber, category, printMode, order });
            } catch (error: any) {
                if (error?.code === 'SNAPSHOT_PAYLOAD_TOO_LARGE') {
                    res.status(413).json({
                        success: false,
                        error: 'Snapshot payload too large',
                        maxBytes: snapshotStore.MAX_SNAPSHOT_PAYLOAD_BYTES
                    });
                    return;
                }
                throw error;
            }
            if (!created) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: snapshotId/orderId/order'
                });
                return;
            }
            snapshotId = created.snapshotId;
            snapshotPayload = created.payload;
            transientSnapshotId = created.snapshotId;
        }

        if (!snapshotId && !orderId) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: snapshotId/orderId/order'
            });
            return;
        }

        const resolvedPoNumber = String(
            poNumber
            || snapshotPayload?.poNumber
            || order?.order_no
            || order?.code
            || 'order'
        ).trim() || 'order';
        const resolvedCategory = String(
            category
            || snapshotPayload?.category
            || order?.category
            || ''
        ).trim();
        const resolvedSupplier = String(
            order?.supplier
            || snapshotPayload?.order?.supplier
            || order?.metadata?.supplier
            || order?.items?.[0]?.supplier
            || ''
        ).trim();
        const filename = buildScreenshotFilename({
            supplier: resolvedSupplier,
            category: resolvedCategory,
            poNumber: resolvedPoNumber,
        });

        const mode = String(printMode || snapshotPayload?.printMode || 'signature').trim() || 'signature';
        const baseUrl = resolveRenderBaseUrl(req);

        const params = new URLSearchParams();
        params.set('printMode', mode);
        params.set('embedded', '1');
        params.set('screenshot', '1');
        params.set('t', String(Date.now()));

        if (snapshotId) {
            params.set('snapshotId', snapshotId);
        } else if (orderId) {
            params.set('orderId', String(orderId));
        }

        const renderUrl = `${baseUrl}/print-document?${params.toString()}`;
        const imageBuffer = await generatePurchaseOrderScreenshot({
            poNumber: resolvedPoNumber,
            renderUrl,
        });

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Content-Length', imageBuffer.length);
        res.setHeader('Cache-Control', 'no-store');
        res.end(imageBuffer, 'binary');
    } catch (error: any) {
        console.error('❌ Screenshot generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Screenshot generation failed',
            message: error.message
        });
    } finally {
        if (transientSnapshotId) {
            snapshotStore.deleteSnapshot(transientSnapshotId);
        }
    }
});

export default router;
