/**
 * Config Data Routes
 * Handles reading and writing of configuration JSON files
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const MaterialCatalogService = require('../services/materials');
const MappingService = require('../services/mappings');
const {
    adaptPackagingMapping,
    adaptCylinderMapping,
    adaptLockForkMapping,
    adaptHandleMapping
} = require('../services/mappings/mapping.adapter');
const {
    validatePackagingMapping,
    validateCylinderMapping,
    validateLockForkMapping,
    validateHandleMapping
} = require('../services/mappings/mapping.validator');
const {
    CONFIG_FILES,
    ensureProjectDirs,
} = require('../config/paths');

const MATERIALS_FILE = CONFIG_FILES.materialsCatalog;
const PACKAGING_RUNTIME_FILE = CONFIG_FILES.packagingMapping;
const CYLINDER_RUNTIME_FILE = CONFIG_FILES.cylinderMapping;
const LOCK_FORK_RUNTIME_FILE = CONFIG_FILES.lockForkMapping;
const HANDLE_RUNTIME_FILE = CONFIG_FILES.handleMapping;

ensureProjectDirs();

function ensureJsonFile(filePath, fallbackValue = {}) {
    if (fs.existsSync(filePath)) return;
    fs.writeFileSync(filePath, JSON.stringify(fallbackValue, null, 2));
}

// 1. Get Materials Catalog
router.get('/materials', (req, res) => {
    MaterialCatalogService.getPublishedMaterialsCatalog().then((payload) => {
        res.json(payload);
    }).catch((error) => {
        console.error('Error reading materials:', error);
        res.status(500).json({ success: false, error: 'Failed to read materials catalog' });
    });
});

// 2. Save Materials Catalog
router.post('/materials', async (req, res) => {
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

function readLegacyMappingRuntime(runtimeFile, adapt, validate, logContext) {
    ensureJsonFile(runtimeFile, {});
    const rawText = fs.readFileSync(runtimeFile, 'utf8');
    const raw = JSON.parse(rawText || '{}');
    const payload = adapt(raw);
    const issues = validate(raw);
    if (issues.length > 0) {
        console.warn(`[configData] ${logContext} mapping validation issues:`, issues);
    }
    return payload;
}

function registerLegacyCompatibleMappingRoute(config) {
    const workflowProfileCode = config.workflowProfileCode || config.profileName;

    router.get(config.endpoint, async (req, res) => {
        try {
            const legacyPayload = readLegacyMappingRuntime(
                config.runtimeFile,
                config.adapt,
                config.validate,
                config.profileName
            );
            const result = await MappingService.ensurePublishedMapping(workflowProfileCode, {
                legacyPayload,
                operator: 'system-admin',
                changeNote: `seed legacy ${config.profileName} runtime`
            });

            if (!result || !result.ok || !result.payload) {
                res.status(result?.status || 500).json({
                    success: false,
                    errors: result?.errors || [],
                    error: config.readErrorMessage
                });
                return;
            }

            MappingService.syncLegacyRuntimeFile(config.runtimeFile, result.payload);
            res.json(result.payload);
        } catch (error) {
            console.error(`Error reading ${config.profileName} mapping:`, error);
            res.status(500).json({ ok: false, error: config.readErrorMessage });
        }
    });

    router.put(config.endpoint, async (req, res) => {
        try {
            const issues = config.validate(req.body);
            if (issues.length > 0) {
                return res.status(400).json({ ok: false, errors: issues });
            }

            const payload = config.adapt(req.body);
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
                return res.status(draft.status).json({
                    ok: false,
                    errors: draft.errors || [],
                    latestRevision: draft.latestRevision ?? null
                });
            }

            const published = await MappingService.publish(workflowProfileCode, {
                fromRevision: draft.revision.revision,
                changeNote: `legacy ${config.endpoint} publish`,
                operator: MappingService.operatorFromRequest(req)
            });
            if (!published.ok) {
                return res.status(published.status).json({
                    ok: false,
                    errors: published.errors || [],
                    latestRevision: published.latestRevision ?? null
                });
            }

            MappingService.syncLegacyRuntimeFile(config.runtimeFile, payload);
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
    runtimeFile: PACKAGING_RUNTIME_FILE,
    adapt: adaptPackagingMapping,
    validate: validatePackagingMapping,
    readErrorMessage: 'Failed to read packaging mapping',
    saveErrorMessage: 'Failed to save packaging mapping'
});

registerLegacyCompatibleMappingRoute({
    profileName: 'cylinder',
    endpoint: '/cylinder',
    runtimeFile: CYLINDER_RUNTIME_FILE,
    adapt: adaptCylinderMapping,
    validate: validateCylinderMapping,
    readErrorMessage: 'Failed to read cylinder mapping',
    saveErrorMessage: 'Failed to save cylinder mapping'
});

registerLegacyCompatibleMappingRoute({
    profileName: 'lock-fork',
    workflowProfileCode: 'lock_fork',
    endpoint: '/lock-fork',
    runtimeFile: LOCK_FORK_RUNTIME_FILE,
    adapt: adaptLockForkMapping,
    validate: validateLockForkMapping,
    readErrorMessage: 'Failed to read lock-fork mapping',
    saveErrorMessage: 'Failed to save lock-fork mapping'
});

registerLegacyCompatibleMappingRoute({
    profileName: 'handle',
    endpoint: '/handle',
    runtimeFile: HANDLE_RUNTIME_FILE,
    adapt: adaptHandleMapping,
    validate: validateHandleMapping,
    readErrorMessage: 'Failed to read handle mapping',
    saveErrorMessage: 'Failed to save handle mapping'
});

router.get('/packaging-mapping', async (req, res) => {
    try {
        const legacyPayload = readLegacyMappingRuntime(
            PACKAGING_RUNTIME_FILE,
            adaptPackagingMapping,
            validatePackagingMapping,
            'packaging'
        );
        const result = await MappingService.ensurePublishedMapping('packaging', {
            legacyPayload,
            operator: 'system-admin',
            changeNote: 'seed legacy packaging runtime'
        });

        if (!result || !result.ok || !result.payload) {
            res.status(result?.status || 500).json({
                success: false,
                errors: result?.errors || [],
                error: 'Failed to read packaging mapping'
            });
            return;
        }

        MappingService.syncLegacyRuntimeFile(PACKAGING_RUNTIME_FILE, result.payload);
        res.json(result.payload);
    } catch (error) {
        console.error('Error reading packaging mapping:', error);
        res.status(500).json({ ok: false, error: 'Failed to read packaging mapping' });
    }
});

module.exports = router;
