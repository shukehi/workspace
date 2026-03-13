const express = require('express');
const router = express.Router();
const asyncHandler = require('../app/middleware/asyncHandler');
const errorHandler = require('../app/middleware/errorHandler');
const validateRequest = require('../app/middleware/validateRequest');
const orderController = require('../controllers/order.controller');
const {
    validateOrderArriveBody,
    validateOrderCreateBody,
    validateOrderIdParams,
    validateOrderListQuery,
    validateOrderStockInBody,
    validateOrderUpdateBody,
} = require('../validators/order.validators');

// GET /api/orders
router.get('/', validateRequest({ query: validateOrderListQuery }), asyncHandler(orderController.listOrders));

// GET /api/orders/:id
router.get('/:id', validateRequest({ params: validateOrderIdParams }), asyncHandler(orderController.getOrder));

// POST /api/orders
router.post('/', validateRequest({ body: validateOrderCreateBody }), asyncHandler(orderController.createOrder));

// PUT /api/orders/:id
router.put(
    '/:id',
    validateRequest({ params: validateOrderIdParams, body: validateOrderUpdateBody }),
    asyncHandler(orderController.updateOrder)
);

// POST /api/orders/:id/arrive
router.post(
    '/:id/arrive',
    validateRequest({ params: validateOrderIdParams, body: validateOrderArriveBody }),
    asyncHandler(orderController.arriveOrder)
);

// POST /api/orders/:id/stock-in
router.post(
    '/:id/stock-in',
    validateRequest({ params: validateOrderIdParams, body: validateOrderStockInBody }),
    asyncHandler(orderController.stockInOrder)
);

// DELETE /api/orders/:id
router.delete('/:id', validateRequest({ params: validateOrderIdParams }), asyncHandler(orderController.deleteOrder));

router.use(errorHandler);

module.exports = router;
