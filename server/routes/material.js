const express = require('express');
const router = express.Router();
const materialService = require('../services/MaterialService');

// GET /api/materials?q=...
router.get('/', async (req, res) => {
    try {
        const query = req.query.q;
        const materials = await materialService.searchMaterials(query);
        res.json(materials);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/materials
router.post('/', async (req, res) => {
    try {
        const material = await materialService.createMaterial(req.body);
        res.json(material);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/materials/:id
router.put('/:id', async (req, res) => {
    try {
        const material = await materialService.updateMaterial(req.params.id, req.body);
        res.json(material);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
