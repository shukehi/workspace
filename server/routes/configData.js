/**
 * Config Data Routes
 * Handles reading and writing of configuration JSON files
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const MaterialCatalogService = require('../services/materials');
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
const { createMappingProfileRoute } = require('./mappingProfile.routeFactory');
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

const packagingProfile = createMappingProfileRoute({
    profileName: 'packaging',
    endpoint: '/packaging',
    runtimeFile: PACKAGING_RUNTIME_FILE,
    adapt: adaptPackagingMapping,
    validate: validatePackagingMapping,
    readErrorMessage: 'Failed to read packaging mapping',
    saveErrorMessage: 'Failed to save packaging mapping'
});

const cylinderProfile = createMappingProfileRoute({
    profileName: 'cylinder',
    endpoint: '/cylinder',
    runtimeFile: CYLINDER_RUNTIME_FILE,
    adapt: adaptCylinderMapping,
    validate: validateCylinderMapping,
    readErrorMessage: 'Failed to read cylinder mapping',
    saveErrorMessage: 'Failed to save cylinder mapping'
});

const lockForkProfile = createMappingProfileRoute({
    profileName: 'lock-fork',
    endpoint: '/lock-fork',
    runtimeFile: LOCK_FORK_RUNTIME_FILE,
    adapt: adaptLockForkMapping,
    validate: validateLockForkMapping,
    readErrorMessage: 'Failed to read lock-fork mapping',
    saveErrorMessage: 'Failed to save lock-fork mapping'
});

const handleProfile = createMappingProfileRoute({
    profileName: 'handle',
    endpoint: '/handle',
    runtimeFile: HANDLE_RUNTIME_FILE,
    adapt: adaptHandleMapping,
    validate: validateHandleMapping,
    readErrorMessage: 'Failed to read handle mapping',
    saveErrorMessage: 'Failed to save handle mapping'
});

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

packagingProfile.register(router);
cylinderProfile.register(router);
lockForkProfile.register(router);
handleProfile.register(router);

// Backward-compatible endpoint
router.get('/packaging-mapping', (req, res) => {
    try {
        const { payload, issues } = packagingProfile.readMapping();
        if (issues.length > 0) {
            console.warn('[configData] packaging mapping validation issues:', issues);
        }
        res.json(payload);
    } catch (error) {
        console.error('Error reading packaging mapping:', error);
        res.status(500).json({ ok: false, error: 'Failed to read packaging mapping' });
    }
});

module.exports = router;
