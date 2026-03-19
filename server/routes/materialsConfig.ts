import { Request, Response, Router } from 'express';
import * as MaterialCatalogService from '../services/materials';

const router: Router = Router();

router.get('/published', async (_req: Request, res: Response) => {
    try {
        const payload = await MaterialCatalogService.getPublishedMaterialsCatalog();
        res.json(payload);
    } catch (error) {
        console.error('Error reading published materials catalog:', error);
        res.status(500).json({ success: false, error: 'Failed to read published materials catalog' });
    }
});

router.get('/detail', async (_req: Request, res: Response) => {
    try {
        const detail = await MaterialCatalogService.getMaterialsCatalogDetail();
        res.json({ success: true, catalog: detail });
    } catch (error) {
        console.error('Error reading materials catalog detail:', error);
        res.status(500).json({ success: false, error: 'Failed to read materials catalog detail' });
    }
});

router.put('/draft', async (req: Request, res: Response) => {
    try {
        const detail = await MaterialCatalogService.getMaterialsCatalogDetail();
        const result = await MaterialCatalogService.updateDraft({
            revision: req.body?.revision ?? (detail as any).latestRevision?.revision ?? 0,
            payload: req.body?.payload,
            changeNote: req.body?.changeNote,
            operator: MaterialCatalogService.operatorFromRequest(req as any)
        });
        if (!(result as any).ok) {
            res.status((result as any).status).json({
                success: false,
                errors: (result as any).errors || [],
                latestRevision: (result as any).latestRevision ?? null
            });
            return;
        }
        res.json({ success: true, revision: (result as any).revision });
    } catch (error) {
        console.error('Error updating materials catalog draft:', error);
        res.status(500).json({ success: false, error: 'Failed to update materials catalog draft' });
    }
});

router.post('/publish', async (req: Request, res: Response) => {
    try {
        const result = await MaterialCatalogService.publish({
            fromRevision: req.body?.fromRevision,
            changeNote: req.body?.changeNote,
            operator: MaterialCatalogService.operatorFromRequest(req as any)
        });
        if (!(result as any).ok) {
            res.status((result as any).status).json({ success: false, errors: (result as any).errors || [] });
            return;
        }
        res.json({ success: true, revision: (result as any).revision });
    } catch (error) {
        console.error('Error publishing materials catalog:', error);
        res.status(500).json({ success: false, error: 'Failed to publish materials catalog' });
    }
});

router.get('/revisions', async (_req: Request, res: Response) => {
    try {
        const revisions = await MaterialCatalogService.listRevisions();
        res.json({ success: true, items: revisions });
    } catch (error) {
        console.error('Error listing materials catalog revisions:', error);
        res.status(500).json({ success: false, error: 'Failed to list materials catalog revisions' });
    }
});

router.get('/audit-logs', async (_req: Request, res: Response) => {
    try {
        const logs = await MaterialCatalogService.listAuditLogs();
        res.json({ success: true, items: logs });
    } catch (error) {
        console.error('Error listing materials catalog audit logs:', error);
        res.status(500).json({ success: false, error: 'Failed to list materials catalog audit logs' });
    }
});

export default router;

// CJS interop: ensure require() returns the router directly
module.exports = router;
