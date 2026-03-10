const express = require('express');
const MaterialCatalogService = require('../services/materials');

const router = express.Router();

router.get('/published', async (req, res) => {
    try {
        const payload = await MaterialCatalogService.getPublishedMaterialsCatalog();
        res.json(payload);
    } catch (error) {
        console.error('Error reading published materials catalog:', error);
        res.status(500).json({ success: false, error: 'Failed to read published materials catalog' });
    }
});

router.get('/detail', async (req, res) => {
    try {
        const detail = await MaterialCatalogService.getMaterialsCatalogDetail();
        res.json({ success: true, catalog: detail });
    } catch (error) {
        console.error('Error reading materials catalog detail:', error);
        res.status(500).json({ success: false, error: 'Failed to read materials catalog detail' });
    }
});

router.put('/draft', async (req, res) => {
    try {
        const detail = await MaterialCatalogService.getMaterialsCatalogDetail();
        const result = await MaterialCatalogService.updateDraft({
            revision: req.body?.revision ?? detail.latestRevision?.revision ?? 0,
            payload: req.body?.payload,
            changeNote: req.body?.changeNote,
            operator: MaterialCatalogService.operatorFromRequest(req)
        });
        if (!result.ok) {
            res.status(result.status).json({
                success: false,
                errors: result.errors || [],
                latestRevision: result.latestRevision ?? null
            });
            return;
        }
        res.json({ success: true, revision: result.revision });
    } catch (error) {
        console.error('Error updating materials catalog draft:', error);
        res.status(500).json({ success: false, error: 'Failed to update materials catalog draft' });
    }
});

router.post('/publish', async (req, res) => {
    try {
        const result = await MaterialCatalogService.publish({
            fromRevision: req.body?.fromRevision,
            changeNote: req.body?.changeNote,
            operator: MaterialCatalogService.operatorFromRequest(req)
        });
        if (!result.ok) {
            res.status(result.status).json({ success: false, errors: result.errors || [] });
            return;
        }
        res.json({ success: true, revision: result.revision });
    } catch (error) {
        console.error('Error publishing materials catalog:', error);
        res.status(500).json({ success: false, error: 'Failed to publish materials catalog' });
    }
});

router.get('/revisions', async (req, res) => {
    try {
        const revisions = await MaterialCatalogService.listRevisions();
        res.json({ success: true, items: revisions });
    } catch (error) {
        console.error('Error listing materials catalog revisions:', error);
        res.status(500).json({ success: false, error: 'Failed to list materials catalog revisions' });
    }
});

module.exports = router;
