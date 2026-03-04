const express = require('express');
const router = express.Router();
const orderService = require('../services/OrderService');

// GET /api/orders
router.get('/', async (req, res) => {
    try {
        const orders = await orderService.getAllOrders(req.query.category);
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
        const deleted = await orderService.deleteOrder(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Order not found', id: req.params.id });
        }
        res.json({ success: true, deleted });
    } catch (e) {
        console.error('Delete order failed', {
            id: req.params.id,
            message: e.message,
            stack: e.stack
        });
        if (e.message === 'INVALID_ID') {
            return res.status(400).json({ error: 'Invalid order id' });
        }
        res.status(500).json({ error: e.message, id: req.params.id });
    }
});

module.exports = router;
