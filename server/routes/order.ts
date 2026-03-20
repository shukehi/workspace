import { Router } from 'express';
import asyncHandler from '../app/middleware/asyncHandler';
import errorHandler from '../app/middleware/errorHandler';
import { validateRequest } from '../app/middleware/validateRequest';
import * as orderController from '../controllers/order.controller';
import {
    validateOrderArriveBody,
    validateOrderCreateBody,
    validateOrderIdParams,
    validateOrderListQuery,
    validateOrderStockInBody,
    validateOrderUpdateBody,
    validateOrderStatusBody,
} from '../validators/order.validators';

const router: Router = Router();

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

// PUT /api/orders/:id/status
router.put(
    '/:id/status',
    validateRequest({ params: validateOrderIdParams, body: validateOrderStatusBody }),
    asyncHandler(orderController.updateOrderStatus)
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

export default router;
