const express = require('express');
const router = express.Router();
const orderService = require('../services/OrderService');

// GET /api/orders
router.get('/', async (req, res) => {
    try {
        const orders = await orderService.getAllOrders();
        res.json(orders);
    } catch (e) {
        console.error('Fetch orders failed', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
    try {
        const order = await orderService.getOrderById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Not found' });
        res.json(order);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/orders
router.post('/', async (req, res) => {
    try {
        const order = await orderService.createOrder(req.body);
        res.json(order);
    } catch (e) {
        console.error('Create order failed', e);
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/orders/:id
router.put('/:id', async (req, res) => {
    try {
        const order = await orderService.updateOrder(req.params.id, req.body);
        res.json(order);
    } catch (e) {
        console.error('Update order failed', e);
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
    try {
        await orderService.deleteOrder(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
