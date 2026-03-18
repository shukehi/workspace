const express = require('express');
const asyncHandler = require('../app/middleware/asyncHandler');
const errorHandler = require('../app/middleware/errorHandler');
const validateRequest = require('../app/middleware/validateRequest');
const inventoryReceiptController = require('../controllers/inventory-receipt.controller');
const {
    validateInventoryReceiptIdParams,
    validateInventoryReceiptListQuery,
    validateInventoryReceiptReverseBody,
} = require('../validators/inventory-receipt.validators');

const router = express.Router();

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

module.exports = router;
