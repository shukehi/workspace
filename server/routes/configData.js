/**
 * Config Data Routes
 * Handles reading and writing of configuration JSON files
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
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
    LEGACY_PUBLIC_FILES,
    ensureProjectDirs,
} = require('../config/paths');

const MATERIALS_FILE = CONFIG_FILES.materialsCatalog;
const PACKAGING_STATIC_FILE = LEGACY_PUBLIC_FILES.packagingMapping;
const PACKAGING_RUNTIME_FILE = CONFIG_FILES.packagingMapping;
const CYLINDER_STATIC_FILE = LEGACY_PUBLIC_FILES.cylinderMapping;
const CYLINDER_RUNTIME_FILE = CONFIG_FILES.cylinderMapping;
const LOCK_FORK_STATIC_FILE = LEGACY_PUBLIC_FILES.lockForkMapping;
const LOCK_FORK_RUNTIME_FILE = CONFIG_FILES.lockForkMapping;
const HANDLE_STATIC_FILE = LEGACY_PUBLIC_FILES.handleMapping;
const HANDLE_RUNTIME_FILE = CONFIG_FILES.handleMapping;

ensureProjectDirs();

function ensureJsonFile(filePath, fallbackFile, fallbackValue = {}) {
    if (fs.existsSync(filePath)) return;
    if (fallbackFile && fs.existsSync(fallbackFile)) {
        fs.copyFileSync(fallbackFile, filePath);
        return;
    }
    fs.writeFileSync(filePath, JSON.stringify(fallbackValue, null, 2));
}

const packagingProfile = createMappingProfileRoute({
    profileName: 'packaging',
    endpoint: '/packaging',
    runtimeFile: PACKAGING_RUNTIME_FILE,
    staticFile: PACKAGING_STATIC_FILE,
    adapt: adaptPackagingMapping,
    validate: validatePackagingMapping,
    readErrorMessage: 'Failed to read packaging mapping',
    saveErrorMessage: 'Failed to save packaging mapping'
});

const cylinderProfile = createMappingProfileRoute({
    profileName: 'cylinder',
    endpoint: '/cylinder',
    runtimeFile: CYLINDER_RUNTIME_FILE,
    staticFile: CYLINDER_STATIC_FILE,
    adapt: adaptCylinderMapping,
    validate: validateCylinderMapping,
    readErrorMessage: 'Failed to read cylinder mapping',
    saveErrorMessage: 'Failed to save cylinder mapping'
});

const lockForkProfile = createMappingProfileRoute({
    profileName: 'lock-fork',
    endpoint: '/lock-fork',
    runtimeFile: LOCK_FORK_RUNTIME_FILE,
    staticFile: LOCK_FORK_STATIC_FILE,
    adapt: adaptLockForkMapping,
    validate: validateLockForkMapping,
    readErrorMessage: 'Failed to read lock-fork mapping',
    saveErrorMessage: 'Failed to save lock-fork mapping'
});

const handleProfile = createMappingProfileRoute({
    profileName: 'handle',
    endpoint: '/handle',
    runtimeFile: HANDLE_RUNTIME_FILE,
    staticFile: HANDLE_STATIC_FILE,
    adapt: adaptHandleMapping,
    validate: validateHandleMapping,
    readErrorMessage: 'Failed to read handle mapping',
    saveErrorMessage: 'Failed to save handle mapping'
});

// 1. Get Materials Catalog
router.get('/materials', (req, res) => {
    try {
        ensureJsonFile(MATERIALS_FILE, LEGACY_PUBLIC_FILES.materialsCatalog);
        const data = fs.readFileSync(MATERIALS_FILE, 'utf8');
        res.header('Content-Type', 'application/json');
        res.send(data);
    } catch (error) {
        console.error('Error reading materials:', error);
        res.status(500).json({ success: false, error: 'Failed to read materials catalog' });
    }
});

// 2. Save Materials Catalog
router.post('/materials', (req, res) => {
    try {
        const newData = req.body;
        ensureProjectDirs();
        fs.writeFileSync(MATERIALS_FILE, JSON.stringify(newData, null, 4));
        console.log('✅ Materials catalog updated via API');
        res.json({ success: true, message: 'Materials catalog saved successfully' });
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
