const express = require('express');
const inventoryReceiptService = require('../services/InventoryReceiptService');

const router = express.Router();

// GET /api/inventory-receipts
router.get('/', async (req, res) => {
    try {
        const receipts = await inventoryReceiptService.list(req.query || {});
        res.json(receipts);
    } catch (e) {
        console.error('Fetch inventory receipts failed', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
