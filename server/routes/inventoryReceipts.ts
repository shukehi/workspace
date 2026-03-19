import { Router } from 'express';
import asyncHandler from '../app/middleware/asyncHandler';
import errorHandler from '../app/middleware/errorHandler';
import { validateRequest } from '../app/middleware/validateRequest';
import * as inventoryReceiptController from '../controllers/inventory-receipt.controller';
import {
    validateInventoryReceiptIdParams,
    validateInventoryReceiptListQuery,
    validateInventoryReceiptReverseBody,
} from '../validators/inventory-receipt.validators';

const router: Router = Router();

// GET /api/inventory-receipts
router.get(
    '/',
    validateRequest({ query: validateInventoryReceiptListQuery }),
    asyncHandler(inventoryReceiptController.listReceipts)
);

router.get(
    '/:id',
    validateRequest({ params: validateInventoryReceiptIdParams }),
    asyncHandler(inventoryReceiptController.getReceipt)
);

// POST /api/inventory-receipts/:id/reverse
router.post(
    '/:id/reverse',
    validateRequest({ params: validateInventoryReceiptIdParams, body: validateInventoryReceiptReverseBody }),
    asyncHandler(inventoryReceiptController.reverseReceipt)
);

router.use(errorHandler);

export default router;

// CJS interop: ensure require() returns the router directly
module.exports = router;
