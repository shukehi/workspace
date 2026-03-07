/**
 * Config Data Routes
 * Handles reading and writing of configuration JSON files
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { adaptPackagingMapping } = require('../services/mappings/mapping.adapter');
const { validatePackagingMapping } = require('../services/mappings/mapping.validator');

// Path to data files (resolved relative to project root)
const DATA_DIR = path.join(__dirname, '../../public/data');
const CONFIG_DIR = path.join(__dirname, '../../data/config');
const MATERIALS_FILE = path.join(DATA_DIR, 'materials-catalog.json');
const PACKAGING_STATIC_FILE = path.join(DATA_DIR, 'packaging-mapping.json');
const PACKAGING_RUNTIME_FILE = path.join(CONFIG_DIR, 'packaging-mapping.json');

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
