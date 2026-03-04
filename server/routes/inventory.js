const express = require('express');
const router = express.Router();
const { Material } = require('../models');

function toInventoryItem(material) {
    return {
        id: Number(material.id),
        category: material.category || 'Uncategorized',
        model: material.model || '',
        name: material.name,
        stock_quantity: Number(material.stock_quantity || 0),
        min_stock: Number(material.min_stock || 0),
        unit: material.unit || 'PCS',
        supplier: material.supplier || '',
        last_updated: material.updatedAt ? material.updatedAt.toISOString() : new Date().toISOString()
    };
}

// GET /api/inventory
router.get('/', async (req, res) => {
    try {
        const materials = await Material.findAll({
            order: [['updatedAt', 'DESC']]
        });
        res.json(materials.map(toInventoryItem));
    } catch (e) {
        console.error('Fetch inventory failed', e);
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/inventory/:id
router.put('/:id', async (req, res) => {
    try {
        const material = await Material.findByPk(req.params.id);
        if (!material) return res.status(404).json({ error: 'Material not found' });

        const nextQty = Number(req.body.stock_quantity);
        const nextMin = req.body.min_stock === undefined ? material.min_stock : Number(req.body.min_stock);

        if (!Number.isFinite(nextQty) || !Number.isFinite(Number(nextMin))) {
            return res.status(400).json({ error: 'Invalid stock values' });
        }

        await material.update({
            stock_quantity: nextQty,
            min_stock: nextMin
        });

        res.json(toInventoryItem(material));
    } catch (e) {
        console.error('Update inventory failed', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
