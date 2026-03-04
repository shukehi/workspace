const express = require('express');
const FormulaService = require('../services/FormulaService');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await FormulaService.listFormulas({
            keyword: req.query.keyword,
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

router.get('/published-map', async (req, res) => {
    try {
        const payload = await FormulaService.getPublishedFormulasMap();
        res.json(payload);
    } catch (error) {
        console.error('Error reading published formulas map:', error);
        res.status(500).json({ success: false, error: 'Failed to read published formulas map' });
    }
});

router.get('/:formulaKey', async (req, res) => {
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

router.post('/', async (req, res) => {
    try {
        const result = await FormulaService.createFormula({
            formulaKey: String(req.body?.formulaKey || '').trim(),
            displayName: String(req.body?.displayName || '').trim(),
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

router.put('/:formulaKey/draft', async (req, res) => {
    try {
        const result = await FormulaService.updateDraft(req.params.formulaKey, {
            revision: req.body?.revision,
            formulaKey: req.body?.formulaKey,
            displayName: req.body?.displayName,
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

router.post('/:formulaKey/publish', async (req, res) => {
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

router.post('/:formulaKey/archive', async (req, res) => {
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

router.post('/:formulaKey/rollback', async (req, res) => {
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

router.delete('/:formulaKey', async (req, res) => {
    try {
        const result = await FormulaService.remove(req.params.formulaKey, {
            reason: req.body?.reason,
            operator: FormulaService.operatorFromRequest(req)
        });
        if (!result.ok) {
            res.status(result.status).json({ success: false, errors: result.errors || [] });
            return;
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting formula:', error);
        res.status(500).json({ success: false, error: 'Failed to delete formula' });
    }
});

router.get('/:formulaKey/revisions', async (req, res) => {
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
