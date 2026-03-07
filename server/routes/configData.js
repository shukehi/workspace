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
    adaptLockForkMapping
} = require('../services/mappings/mapping.adapter');
const {
    validatePackagingMapping,
    validateCylinderMapping,
    validateLockForkMapping
} = require('../services/mappings/mapping.validator');

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

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function writeJsonAtomic(filePath, payload) {
    const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(payload, null, 4));
    fs.renameSync(tempPath, filePath);
}

function ensurePackagingMappingFile() {
    if (fs.existsSync(PACKAGING_RUNTIME_FILE)) return;
    let seed = {};
    if (fs.existsSync(PACKAGING_STATIC_FILE)) {
        try {
            seed = JSON.parse(fs.readFileSync(PACKAGING_STATIC_FILE, 'utf8'));
        } catch (error) {
            console.warn('[configData] failed to parse static packaging mapping, falling back to empty', error);
            seed = {};
        }
    }
    const payload = adaptPackagingMapping(seed);
    writeJsonAtomic(PACKAGING_RUNTIME_FILE, payload);
}

function ensureCylinderMappingFile() {
    if (fs.existsSync(CYLINDER_RUNTIME_FILE)) return;
    let seed = {};
    if (fs.existsSync(CYLINDER_STATIC_FILE)) {
        try {
            seed = JSON.parse(fs.readFileSync(CYLINDER_STATIC_FILE, 'utf8'));
        } catch (error) {
            console.warn('[configData] failed to parse static cylinder mapping, falling back to empty', error);
            seed = {};
        }
    }
    const payload = adaptCylinderMapping(seed);
    writeJsonAtomic(CYLINDER_RUNTIME_FILE, payload);
}

function ensureLockForkMappingFile() {
    if (fs.existsSync(LOCK_FORK_RUNTIME_FILE)) return;
    let seed = {};
    if (fs.existsSync(LOCK_FORK_STATIC_FILE)) {
        try {
            seed = JSON.parse(fs.readFileSync(LOCK_FORK_STATIC_FILE, 'utf8'));
        } catch (error) {
            console.warn('[configData] failed to parse static lock-fork mapping, falling back to empty', error);
            seed = {};
        }
    }
    const payload = adaptLockForkMapping(seed);
    writeJsonAtomic(LOCK_FORK_RUNTIME_FILE, payload);
}

function readCylinderMapping() {
    ensureCylinderMappingFile();
    const rawText = fs.readFileSync(CYLINDER_RUNTIME_FILE, 'utf8');
    const raw = JSON.parse(rawText || '{}');
    const payload = adaptCylinderMapping(raw);
    const issues = validateCylinderMapping(raw);
    return { payload, issues };
}

function readLockForkMapping() {
    ensureLockForkMappingFile();
    const rawText = fs.readFileSync(LOCK_FORK_RUNTIME_FILE, 'utf8');
    const raw = JSON.parse(rawText || '{}');
    const payload = adaptLockForkMapping(raw);
    const issues = validateLockForkMapping(raw);
    return { payload, issues };
}

function readPackagingMapping() {
    ensurePackagingMappingFile();
    const rawText = fs.readFileSync(PACKAGING_RUNTIME_FILE, 'utf8');
    const raw = JSON.parse(rawText || '{}');
    const payload = adaptPackagingMapping(raw);
    const issues = validatePackagingMapping(raw);
    return { payload, issues };
}

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

// 3. Get Packaging Mapping
router.get('/packaging', (req, res) => {
    try {
        const { payload, issues } = readPackagingMapping();
        if (issues.length > 0) {
            console.warn('[configData] packaging mapping validation issues:', issues);
        }
        res.json(payload);
    } catch (error) {
        console.error('Error reading packaging mapping:', error);
        res.status(500).json({ ok: false, error: 'Failed to read packaging mapping' });
    }
});

router.put('/packaging', (req, res) => {
    try {
        const issues = validatePackagingMapping(req.body);
        if (issues.length > 0) {
            return res.status(400).json({ ok: false, errors: issues });
        }
        const payload = adaptPackagingMapping(req.body);
        writeJsonAtomic(PACKAGING_RUNTIME_FILE, payload);
        res.json({ ok: true, data: payload });
    } catch (error) {
        console.error('Error saving packaging mapping:', error);
        res.status(500).json({ ok: false, error: 'Failed to save packaging mapping' });
    }
});

router.get('/cylinder', (req, res) => {
    try {
        const { payload, issues } = readCylinderMapping();
        if (issues.length > 0) {
            console.warn('[configData] cylinder mapping validation issues:', issues);
        }
        res.json(payload);
    } catch (error) {
        console.error('Error reading cylinder mapping:', error);
        res.status(500).json({ ok: false, error: 'Failed to read cylinder mapping' });
    }
});

router.put('/cylinder', (req, res) => {
    try {
        const issues = validateCylinderMapping(req.body);
        if (issues.length > 0) {
            return res.status(400).json({ ok: false, errors: issues });
        }
        const payload = adaptCylinderMapping(req.body);
        writeJsonAtomic(CYLINDER_RUNTIME_FILE, payload);
        res.json({ ok: true, data: payload });
    } catch (error) {
        console.error('Error saving cylinder mapping:', error);
        res.status(500).json({ ok: false, error: 'Failed to save cylinder mapping' });
    }
});

router.get('/lock-fork', (req, res) => {
    try {
        const { payload, issues } = readLockForkMapping();
        if (issues.length > 0) {
            console.warn('[configData] lock-fork mapping validation issues:', issues);
        }
        res.json(payload);
    } catch (error) {
        console.error('Error reading lock-fork mapping:', error);
        res.status(500).json({ ok: false, error: 'Failed to read lock-fork mapping' });
    }
});

router.put('/lock-fork', (req, res) => {
    try {
        const issues = validateLockForkMapping(req.body);
        if (issues.length > 0) {
            return res.status(400).json({ ok: false, errors: issues });
        }
        const payload = adaptLockForkMapping(req.body);
        writeJsonAtomic(LOCK_FORK_RUNTIME_FILE, payload);
        res.json({ ok: true, data: payload });
    } catch (error) {
        console.error('Error saving lock-fork mapping:', error);
        res.status(500).json({ ok: false, error: 'Failed to save lock-fork mapping' });
    }
});

// Backward-compatible endpoint
router.get('/packaging-mapping', (req, res) => {
    try {
        const { payload, issues } = readPackagingMapping();
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
