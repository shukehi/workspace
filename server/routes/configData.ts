/**
 * Config Data Routes
 * Handles reading and writing of configuration JSON files
 */

import { Request, Response, Router } from 'express';
import fs from 'fs';
import * as MaterialCatalogService from '../services/materials';
import * as MappingService from '../services/mappings';
import {
    adaptPackagingMapping,
    adaptCylinderMapping,
    adaptLockMapping,
    adaptLockForkMapping,
    adaptHandleMapping,
} from '../services/mappings/mapping.adapter';
import {
    validatePackagingMapping,
    validateCylinderMapping,
    validateLockMapping,
    validateLockForkMapping,
    validateHandleMapping,
} from '../services/mappings/mapping.validator';
import { CONFIG_FILES, ensureProjectDirs } from '../config/paths';

const MATERIALS_FILE = CONFIG_FILES.materialsCatalog;
ensureProjectDirs();

const router: Router = Router();

function ensureJsonFile(filePath: string, fallbackValue: unknown = {}): void {
    if (fs.existsSync(filePath)) return;
    fs.writeFileSync(filePath, JSON.stringify(fallbackValue, null, 2));
}

// 1. Get Materials Catalog
router.get('/materials', (req: Request, res: Response) => {
    MaterialCatalogService.getPublishedMaterialsCatalog().then((payload: unknown) => {
        res.json(payload);
    }).catch((error: any) => {
        console.error('Error reading materials:', error);
        res.status(500).json({ success: false, error: 'Failed to read materials catalog' });
    });
});

// 2. Save Materials Catalog
router.post('/materials', async (req: Request, res: Response) => {
    try {
        const result = await MaterialCatalogService.saveAndPublishLegacyCompatible(req.body, req);
        if (!result.ok) {
            res.status(result.status).json({
                success: false,
                errors: result.errors || [],
                latestRevision: result.latestRevision ?? null
            });
            return;
        }
        console.log('✅ Materials catalog updated via workflow-backed API');
        res.json({
            success: true,
            message: 'Materials catalog saved successfully',
            revision: result.revision
        });
    } catch (error) {
        console.error('Error saving materials:', error);
        res.status(500).json({ success: false, error: 'Failed to save materials catalog' });
    }
});

type PlainRecord = Record<string, unknown>;

interface LegacyMappingRouteConfig {
    profileName: string;
    workflowProfileCode?: string;
    endpoint: string;
    adapt: (raw: unknown) => unknown;
    validate: (raw: unknown) => unknown[];
    readErrorMessage: string;
    saveErrorMessage: string;
}

function registerLegacyCompatibleMappingRoute(config: LegacyMappingRouteConfig): void {
    const workflowProfileCode = config.workflowProfileCode || config.profileName;

    router.get(config.endpoint, async (req: Request, res: Response) => {
        try {
            const result = await MappingService.getPublishedMapping(workflowProfileCode);

            if (!result || !result.ok || !result.payload) {
                res.status(result?.status || 404).json({
                    success: false,
                    errors: result?.errors || [],
                    error: config.readErrorMessage
                });
                return;
            }

            res.json(result.payload);
        } catch (error) {
            console.error(`Error reading ${config.profileName} mapping:`, error);
            res.status(500).json({ ok: false, error: config.readErrorMessage });
        }
    });

    router.put(config.endpoint, async (req: Request, res: Response) => {
        try {
            const issues = config.validate(req.body);
            if (issues.length > 0) {
                res.status(400).json({ ok: false, errors: issues });
                return;
            }

            const payload = config.adapt(req.body) as PlainRecord;
            const detail = await MappingService.getMappingDetail(workflowProfileCode);
            const currentRevision = detail && detail.ok
                ? detail.mapping.latestRevision?.revision ?? 0
                : 0;

            const draft = await MappingService.updateDraft(workflowProfileCode, {
                revision: currentRevision,
                payload,
                changeNote: `legacy ${config.endpoint} save`,
                operator: MappingService.operatorFromRequest(req)
            });
            if (!draft.ok) {
                res.status(draft.status).json({
                    ok: false,
                    errors: draft.errors || [],
                    latestRevision: draft.latestRevision ?? null
                });
                return;
            }

            const published = await MappingService.publish(workflowProfileCode, {
                fromRevision: draft.revision.revision,
                changeNote: `legacy ${config.endpoint} publish`,
                operator: MappingService.operatorFromRequest(req)
            });
            if (!published.ok) {
                res.status(published.status).json({
                    ok: false,
                    errors: published.errors || [],
                    latestRevision: published.latestRevision ?? null
                });
                return;
            }

            res.json({ ok: true, data: payload, revision: published.revision });
        } catch (error) {
            console.error(`Error saving ${config.profileName} mapping:`, error);
            res.status(500).json({ ok: false, error: config.saveErrorMessage });
        }
    });
}

registerLegacyCompatibleMappingRoute({
    profileName: 'packaging',
    endpoint: '/packaging',
    adapt: adaptPackagingMapping,
    validate: validatePackagingMapping,
    readErrorMessage: 'Failed to read packaging mapping',
    saveErrorMessage: 'Failed to save packaging mapping'
});

registerLegacyCompatibleMappingRoute({
    profileName: 'cylinder',
    endpoint: '/cylinder',
    adapt: adaptCylinderMapping,
    validate: validateCylinderMapping,
    readErrorMessage: 'Failed to read cylinder mapping',
    saveErrorMessage: 'Failed to save cylinder mapping'
});

registerLegacyCompatibleMappingRoute({
    profileName: 'lock',
    endpoint: '/lock',
    adapt: adaptLockMapping,
    validate: validateLockMapping,
    readErrorMessage: 'Failed to read lock mapping',
    saveErrorMessage: 'Failed to save lock mapping'
});

registerLegacyCompatibleMappingRoute({
    profileName: 'lock-fork',
    workflowProfileCode: 'lock_fork',
    endpoint: '/lock-fork',
    adapt: adaptLockForkMapping,
    validate: validateLockForkMapping,
    readErrorMessage: 'Failed to read lock-fork mapping',
    saveErrorMessage: 'Failed to save lock-fork mapping'
});

registerLegacyCompatibleMappingRoute({
    profileName: 'handle',
    endpoint: '/handle',
    adapt: adaptHandleMapping,
    validate: validateHandleMapping,
    readErrorMessage: 'Failed to read handle mapping',
    saveErrorMessage: 'Failed to save handle mapping'
});

router.get('/packaging-mapping', async (_req: Request, res: Response) => {
    try {
        const result = await MappingService.getPublishedMapping('packaging');

        if (!result || !result.ok || !result.payload) {
            res.status(result?.status || 404).json({
                success: false,
                errors: result?.errors || [],
                error: 'Failed to read packaging mapping'
            });
            return;
        }

        res.json(result.payload);
    } catch (error) {
        console.error('Error reading packaging mapping:', error);
        res.status(500).json({ ok: false, error: 'Failed to read packaging mapping' });
    }
});

export default router;
