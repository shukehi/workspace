const express = require('express');
const router = express.Router();
const asyncHandler = require('../app/middleware/asyncHandler');
const errorHandler = require('../app/middleware/errorHandler');
const validateRequest = require('../app/middleware/validateRequest');
const inventoryController = require('../controllers/inventory.controller');
const {
    validateInventoryIdParams,
    validateInventoryUpdateBody,
} = require('../validators/inventory.validators');

// GET /api/inventory
router.get('/', asyncHandler(inventoryController.listInventory));

// PUT /api/inventory/:id
router.put(
    '/:id',
    validateRequest({
        params: validateInventoryIdParams,
        body: validateInventoryUpdateBody,
    }),
    asyncHandler(inventoryController.updateInventoryItem)
);

router.use(errorHandler);

module.exports = router;
