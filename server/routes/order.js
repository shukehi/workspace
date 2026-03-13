const express = require('express');
const router = express.Router();
const orderService = require('../services/OrderService');

// GET /api/orders
router.get('/', async (req, res) => {
    try {
        const hasPaginationQuery = [
            'page',
            'pageSize',
            'status',
            'risk',
            'createdDate',
            'keyword',
            'orderNo'
        ].some((key) => req.query[key] !== undefined);

        if (hasPaginationQuery) {
            const result = await orderService.getPaginatedOrders(req.query || {});
            return res.json(result);
        }

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
        if (e?.code === 'DUPLICATE_ORDER') {
            return res.status(409).json({
                error: 'DUPLICATE_ORDER',
                existingOrder: orderService.toDuplicateOrderSummary(e.existingOrder)
            });
        }
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
        if (e?.code === 'DUPLICATE_ORDER') {
            return res.status(409).json({
                error: 'DUPLICATE_ORDER',
                existingOrder: orderService.toDuplicateOrderSummary(e.existingOrder)
            });
        }
        if (e?.code === 'INVALID_STATUS_TRANSITION') {
            return res.status(400).json({
                error: 'INVALID_STATUS_TRANSITION',
                fromStatus: e.fromStatus,
                toStatus: e.toStatus
            });
        }
        if (e?.code === 'ORDER_EDIT_LOCKED') {
            return res.status(400).json({
                error: 'ORDER_EDIT_LOCKED',
                status: e.status,
                fields: e.fields
            });
        }
        res.status(500).json({ error: e.message });
    }
});

// POST /api/orders/:id/arrive
router.post('/:id/arrive', async (req, res) => {
    try {
        const order = await orderService.markArrived(req.params.id, req.body || {});
        res.json(order);
    } catch (e) {
        console.error('Mark order arrived failed', e);
        if (e?.code === 'DUPLICATE_ORDER') {
            return res.status(409).json({
                error: 'DUPLICATE_ORDER',
                existingOrder: orderService.toDuplicateOrderSummary(e.existingOrder)
            });
        }
        if (e?.code === 'INVALID_STATUS_TRANSITION') {
            return res.status(400).json({
                error: 'INVALID_STATUS_TRANSITION',
                fromStatus: e.fromStatus,
                toStatus: e.toStatus
            });
        }
        res.status(500).json({ error: e.message });
    }
});

// POST /api/orders/:id/stock-in
router.post('/:id/stock-in', async (req, res) => {
    try {
        const order = await orderService.stockInOrder(req.params.id, req.body || {});
        res.json(order);
    } catch (e) {
        console.error('Stock in order failed', e);
        if (e?.code === 'INVALID_STATUS_TRANSITION') {
            return res.status(400).json({
                error: 'INVALID_STATUS_TRANSITION',
                fromStatus: e.fromStatus,
                toStatus: e.toStatus
            });
        }
        if (e?.code === 'MATERIAL_NOT_FOUND') {
            return res.status(400).json({
                error: 'MATERIAL_NOT_FOUND',
                materialId: e.materialId
            });
        }
        if (e?.code === 'RECEIVED_QUANTITY_EXCEEDED') {
            return res.status(400).json({
                error: 'RECEIVED_QUANTITY_EXCEEDED',
                orderItemId: e.orderItemId,
                orderedQuantity: e.orderedQuantity,
                nextReceivedQuantity: e.nextReceivedQuantity
            });
        }
        if (
            e?.code === 'MATERIAL_ID_REQUIRED'
            || e?.code === 'INVALID_RECEIPT_QUANTITY'
            || e?.code === 'ORDER_ITEMS_REQUIRED'
            || e?.code === 'ORDER_ITEM_ID_REQUIRED'
            || e?.code === 'RECEIPT_ITEM_KEY_REQUIRED'
            || e?.code === 'DUPLICATE_RECEIPT_ITEM'
            || e?.code === 'ORDER_ITEM_NOT_FOUND'
            || e?.code === 'ORDER_ITEM_KEY_MISMATCH'
        ) {
            return res.status(400).json({ error: e.code });
        }
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
