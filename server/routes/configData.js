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
const MATERIALS_FILE = path.join(DATA_DIR, 'materials-catalog.json');
const PACKAGING_MAPPING_FILE = path.join(DATA_DIR, 'packaging-mapping.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
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
router.get('/packaging-mapping', (req, res) => {
    try {
        if (fs.existsSync(PACKAGING_MAPPING_FILE)) {
            const raw = JSON.parse(fs.readFileSync(PACKAGING_MAPPING_FILE, 'utf8'));
            const payload = adaptPackagingMapping(raw);
            const issues = validatePackagingMapping(raw);
            if (issues.length > 0) {
                console.warn('[configData] packaging mapping validation issues:', issues);
            }
            res.json(payload);
        } else {
            res.json(adaptPackagingMapping({}));
        }
    } catch (error) {
        console.error('Error reading packaging mapping:', error);
        res.status(500).json({ success: false, error: 'Failed to read packaging mapping' });
    }
});

module.exports = router;
