import { Request, Response, Router } from 'express';
import * as MappingService from '../services/mappings';

const router: Router = Router();

function sendWorkflowError(res: Response, result: any): void {
    res.status(result.status).json({
        success: false,
        errors: result.errors || [],
        latestRevision: result.latestRevision ?? null
    });
}

router.get('/:type/detail', async (req: Request, res: Response) => {
    try {
        const detail = await MappingService.getMappingDetail(req.params.type);
        if (!detail) {
            res.status(404).json({ success: false, error: 'Mapping profile not found' });
            return;
        }
        if (!detail.ok) {
            sendWorkflowError(res, detail);
            return;
        }
        res.json({ success: true, mapping: detail.mapping });
    } catch (error) {
        console.error('Error reading mapping detail:', error);
        res.status(500).json({ success: false, error: 'Failed to read mapping detail' });
    }
});

router.get('/:type', async (req: Request, res: Response) => {
    try {
        const detail = await MappingService.getMappingDetail(req.params.type);
        if (!detail) {
            res.status(404).json({ success: false, error: 'Mapping profile not found' });
            return;
        }
        if (!detail.ok) {
            sendWorkflowError(res, detail);
            return;
        }
        const { draftPayload, publishedPayload, ...summary } = detail.mapping;
        res.json({ success: true, mapping: summary });
    } catch (error) {
        console.error('Error reading mapping summary:', error);
        res.status(500).json({ success: false, error: 'Failed to read mapping summary' });
    }
});

router.get('/:type/published', async (req: Request, res: Response) => {
    try {
        const result = await MappingService.getPublishedMapping(req.params.type);
        if (!result) {
            res.status(404).json({ success: false, error: 'Mapping profile not found' });
            return;
        }
        if (!result.ok) {
            sendWorkflowError(res, result);
            return;
        }
        res.json(result.payload || {});
    } catch (error) {
        console.error('Error reading published mapping:', error);
        res.status(500).json({ success: false, error: 'Failed to read published mapping' });
    }
});

router.put('/:type/draft', async (req: Request, res: Response) => {
    try {
        const result = await MappingService.updateDraft(req.params.type, {
            revision: req.body?.revision,
            payload: req.body?.payload,
            changeNote: req.body?.changeNote,
            schemaVersion: req.body?.schemaVersion,
            operator: MappingService.operatorFromRequest(req)
        });
        if (!result.ok) {
            sendWorkflowError(res, result);
            return;
        }
        res.json({
            success: true,
            profile: result.profile,
            revision: result.revision
        });
    } catch (error) {
        console.error('Error updating mapping draft:', error);
        res.status(500).json({ success: false, error: 'Failed to update mapping draft' });
    }
});

router.post('/:type/publish', async (req: Request, res: Response) => {
    try {
        const result = await MappingService.publish(req.params.type, {
            fromRevision: req.body?.fromRevision,
            changeNote: req.body?.changeNote,
            operator: MappingService.operatorFromRequest(req)
        });
        if (!result.ok) {
            sendWorkflowError(res, result);
            return;
        }
        res.json({
            success: true,
            revision: result.revision
        });
    } catch (error) {
        console.error('Error publishing mapping:', error);
        res.status(500).json({ success: false, error: 'Failed to publish mapping' });
    }
});

router.post('/:type/rollback', async (req: Request, res: Response) => {
    try {
        const result = await MappingService.rollback(req.params.type, {
            targetRevision: req.body?.targetRevision,
            reason: req.body?.reason,
            operator: MappingService.operatorFromRequest(req)
        });
        if (!result.ok) {
            sendWorkflowError(res, result);
            return;
        }
        res.json({
            success: true,
            revision: result.revision,
            activeRevision: result.activeRevision ?? null
        });
    } catch (error) {
        console.error('Error rolling back mapping:', error);
        res.status(500).json({ success: false, error: 'Failed to rollback mapping' });
    }
});

router.get('/:type/revisions', async (req: Request, res: Response) => {
    try {
        const result = await MappingService.listRevisions(req.params.type);
        if (!result) {
            res.status(404).json({ success: false, error: 'Mapping profile not found' });
            return;
        }
        if (!result.ok) {
            sendWorkflowError(res, result);
            return;
        }
        res.json({ success: true, items: result.revisions });
    } catch (error) {
        console.error('Error listing mapping revisions:', error);
        res.status(500).json({ success: false, error: 'Failed to list mapping revisions' });
    }
});

router.get('/:type/audit-logs', async (req: Request, res: Response) => {
    try {
        const result = await MappingService.listAuditLogs(req.params.type);
        if (!result) {
            res.status(404).json({ success: false, error: 'Mapping profile not found' });
            return;
        }
        if (!result.ok) {
            sendWorkflowError(res, result);
            return;
        }
        res.json({ success: true, items: result.items });
    } catch (error) {
        console.error('Error listing mapping audit logs:', error);
        res.status(500).json({ success: false, error: 'Failed to list mapping audit logs' });
    }
});

export default router;

// CJS interop: ensure require() returns the router directly
module.exports = router;
