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

// POST /api/inventory-receipts/:id/reverse
router.post('/:id/reverse', async (req, res) => {
    try {
        const receipt = await inventoryReceiptService.reverseReceipt(req.params.id, req.body || {});
        res.json(receipt);
    } catch (e) {
        console.error('Reverse inventory receipt failed', e);
        if (
            e?.code === 'RECEIPT_NOT_FOUND'
            || e?.code === 'RECEIPT_REVERSE_NOT_ALLOWED'
            || e?.code === 'RECEIPT_ALREADY_REVERSED'
            || e?.code === 'ORDER_ITEM_NOT_FOUND'
            || e?.code === 'ORDER_NOT_FOUND'
            || e?.code === 'REVERSE_REASON_REQUIRED'
            || e?.code === 'INVALID_RECEIPT_DATE'
        ) {
            return res.status(400).json({ error: e.code });
        }
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
