/**
 * Config Data Routes
 * Handles reading and writing of configuration JSON files
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
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

// Path to data files (resolved relative to project root)
const DATA_DIR = path.join(__dirname, '../../public/data');
const CONFIG_DIR = path.join(__dirname, '../../data/config');
const MATERIALS_FILE = path.join(DATA_DIR, 'materials-catalog.json');
const PACKAGING_STATIC_FILE = path.join(DATA_DIR, 'packaging-mapping.json');
const PACKAGING_RUNTIME_FILE = path.join(CONFIG_DIR, 'packaging-mapping.json');
const CYLINDER_STATIC_FILE = path.join(DATA_DIR, 'cylinder-mapping.json');
const CYLINDER_RUNTIME_FILE = path.join(CONFIG_DIR, 'cylinder-mapping.json');
const LOCK_FORK_STATIC_FILE = path.join(DATA_DIR, 'lock-fork-mapping.json');
const LOCK_FORK_RUNTIME_FILE = path.join(CONFIG_DIR, 'lock-fork-mapping.json');
const HANDLE_STATIC_FILE = path.join(DATA_DIR, 'handle-mapping.json');
const HANDLE_RUNTIME_FILE = path.join(CONFIG_DIR, 'handle-mapping.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
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
        if (fs.existsSync(MATERIALS_FILE)) {
            const data = fs.readFileSync(MATERIALS_FILE, 'utf8');
            res.header('Content-Type', 'application/json');
            res.send(data);
        } else {
            res.json({});
        }
    } catch (error) {
        console.error('Error reading materials:', error);
        res.status(500).json({ success: false, error: 'Failed to read materials catalog' });
    }
});

// 2. Save Materials Catalog
router.post('/materials', (req, res) => {
    try {
        const newData = req.body;
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
