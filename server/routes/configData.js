/**
 * Config Data Routes
 * Handles reading and writing of configuration JSON files
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Path to data files (resolved relative to project root)
// Assuming server/routes/configData.js -> ../../public/data
const DATA_DIR = path.join(__dirname, '../../public/data');
const MATERIALS_FILE = path.join(DATA_DIR, 'materials-catalog.json');
const FORMULAS_FILE = path.join(DATA_DIR, 'color-formulas.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 1. Get Materials Catalog
router.get('/materials', (req, res) => {
    try {
        if (fs.existsSync(MATERIALS_FILE)) {
            const data = fs.readFileSync(MATERIALS_FILE, 'utf8');
            res.header("Content-Type", "application/json");
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

// 3. Get Color Formulas
router.get('/formulas', (req, res) => {
    try {
        if (fs.existsSync(FORMULAS_FILE)) {
            const data = fs.readFileSync(FORMULAS_FILE, 'utf8');
            res.header("Content-Type", "application/json");
            res.send(data);
        } else {
            res.json({});
        }
    } catch (error) {
        console.error('Error reading formulas:', error);
        res.status(500).json({ success: false, error: 'Failed to read color formulas' });
    }
});

// 4. Save Color Formulas
router.post('/formulas', (req, res) => {
    try {
        const newData = req.body;
        fs.writeFileSync(FORMULAS_FILE, JSON.stringify(newData, null, 4));
        console.log('✅ Color formulas updated via API');
        res.json({ success: true, message: 'Color formulas saved successfully' });
    } catch (error) {
        console.error('Error saving formulas:', error);
        res.status(500).json({ success: false, error: 'Failed to save color formulas' });
    }
});

module.exports = router;
