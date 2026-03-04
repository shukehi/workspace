/**
 * Config Data Routes
 * Handles reading and writing of configuration JSON files
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const FormulaService = require('../services/FormulaService');

// Path to data files (resolved relative to project root)
// Assuming server/routes/configData.js -> ../../public/data
const DATA_DIR = path.join(__dirname, '../../public/data');
const MATERIALS_FILE = path.join(DATA_DIR, 'materials-catalog.json');

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

router.get('/formulas', async (req, res) => {
    try {
        const result = await FormulaService.listFormulas({
            keyword: req.query.keyword,
            category: req.query.category,
            status: req.query.status,
            page: req.query.page,
            pageSize: req.query.pageSize
        });
        res.json(result);
    } catch (error) {
        console.error('Error listing formulas:', error);
        res.status(500).json({ success: false, error: 'Failed to list formulas' });
    }
});

router.get('/formulas/:formulaKey', async (req, res) => {
    try {
        const detail = await FormulaService.getFormulaDetail(req.params.formulaKey);
        if (!detail) {
            res.status(404).json({ success: false, error: 'Formula not found' });
            return;
        }
        res.json(detail);
    } catch (error) {
        console.error('Error reading formula detail:', error);
        res.status(500).json({ success: false, error: 'Failed to read formula detail' });
    }
});

router.post('/formulas', async (req, res) => {
    try {
        const result = await FormulaService.createFormula({
            formulaKey: String(req.body?.formulaKey || '').trim(),
            displayName: String(req.body?.displayName || '').trim(),
            category: String(req.body?.category || 'Default').trim() || 'Default',
            bom: Array.isArray(req.body?.bom) ? req.body.bom : [],
            changeNote: req.body?.changeNote,
            operator: FormulaService.operatorFromRequest(req)
        });
        if (!result.ok) {
            res.status(result.status).json({ success: false, errors: result.errors || [] });
            return;
        }
        res.status(201).json({
            success: true,
            formula: {
                formulaKey: result.definition.formula_key,
                displayName: result.definition.display_name,
                category: result.definition.category,
                status: result.definition.status,
                activeRevision: result.definition.active_revision
            },
            revision: FormulaService.toRevisionMeta(result.revision)
        });
    } catch (error) {
        console.error('Error creating formula:', error);
        res.status(500).json({ success: false, error: 'Failed to create formula' });
    }
});

router.put('/formulas/:formulaKey/draft', async (req, res) => {
    try {
        const result = await FormulaService.updateDraft(req.params.formulaKey, {
            revision: req.body?.revision,
            bom: Array.isArray(req.body?.bom) ? req.body.bom : [],
            changeNote: req.body?.changeNote,
            operator: FormulaService.operatorFromRequest(req)
        });
        if (!result.ok) {
            res.status(result.status).json({
                success: false,
                errors: result.errors || [],
                latestRevision: result.latestRevision ?? null
            });
            return;
        }
        res.json({ success: true, revision: FormulaService.toRevisionMeta(result.revision) });
    } catch (error) {
        console.error('Error updating formula draft:', error);
        res.status(500).json({ success: false, error: 'Failed to update formula draft' });
    }
});

router.post('/formulas/:formulaKey/publish', async (req, res) => {
    try {
        const result = await FormulaService.publish(req.params.formulaKey, {
            fromRevision: req.body?.fromRevision,
            changeNote: req.body?.changeNote,
            operator: FormulaService.operatorFromRequest(req)
        });
        if (!result.ok) {
            res.status(result.status).json({ success: false, errors: result.errors || [] });
            return;
        }
        res.json({ success: true, revision: FormulaService.toRevisionMeta(result.revision) });
    } catch (error) {
        console.error('Error publishing formula:', error);
        res.status(500).json({ success: false, error: 'Failed to publish formula' });
    }
});

router.post('/formulas/:formulaKey/archive', async (req, res) => {
    try {
        const result = await FormulaService.archive(req.params.formulaKey, {
            reason: req.body?.reason,
            operator: FormulaService.operatorFromRequest(req)
        });
        if (!result.ok) {
            res.status(result.status).json({ success: false, errors: result.errors || [] });
            return;
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error archiving formula:', error);
        res.status(500).json({ success: false, error: 'Failed to archive formula' });
    }
});

router.post('/formulas/:formulaKey/rollback', async (req, res) => {
    try {
        const result = await FormulaService.rollback(req.params.formulaKey, {
            targetRevision: req.body?.targetRevision,
            reason: req.body?.reason,
            operator: FormulaService.operatorFromRequest(req)
        });
        if (!result.ok) {
            res.status(result.status).json({ success: false, errors: result.errors || [] });
            return;
        }
        res.json({ success: true, revision: result.revision });
    } catch (error) {
        console.error('Error rolling back formula:', error);
        res.status(500).json({ success: false, error: 'Failed to rollback formula' });
    }
});

router.get('/formulas/:formulaKey/revisions', async (req, res) => {
    try {
        const revisions = await FormulaService.listRevisions(req.params.formulaKey);
        if (!revisions) {
            res.status(404).json({ success: false, error: 'Formula not found' });
            return;
        }
        res.json({ success: true, items: revisions });
    } catch (error) {
        console.error('Error listing formula revisions:', error);
        res.status(500).json({ success: false, error: 'Failed to list formula revisions' });
    }
});

module.exports = router;
